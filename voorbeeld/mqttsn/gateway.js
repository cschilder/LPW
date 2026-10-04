#!/usr/bin/env node
// MQTT-SN-gateway (MQTT-SN 1.2 over UDP → MQTT 3.1.1-broker) voor de LPW-demo.
// Elke MQTT-SN-client (UDP-adres) krijgt een eigen MQTT-verbinding met de broker.
//
//   npm install mqtt
//   BROKER=mqtt://localhost:1883 PORT=1884 node gateway.js
//
// Ondersteund: CONNECT/CONNACK, REGISTER/REGACK (beide richtingen), PUBLISH QoS 0/1/-1,
// PUBACK, SUBSCRIBE/SUBACK, PINGREQ/PINGRESP, DISCONNECT. Voorgedefinieerde topic-ID's
// (voor QoS -1, publiceren zonder verbinding) staan in PREDEFINED.
'use strict';
const dgram = require('dgram');
const mqtt = require('mqtt');

const PORT = +(process.env.PORT || 1884);
const BROKER = process.env.BROKER || 'mqtt://localhost:1883';
const PREDEFINED = { 1: 'lpw/predef/temperatuur', 2: 'lpw/predef/alarm' };
const T = { CONNECT: 0x04, CONNACK: 0x05, REGISTER: 0x0a, REGACK: 0x0b, PUBLISH: 0x0c, PUBACK: 0x0d,
  SUBSCRIBE: 0x12, SUBACK: 0x13, PINGREQ: 0x16, PINGRESP: 0x17, DISCONNECT: 0x18 };
const NAME = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k]));

const sock = dgram.createSocket('udp4');
const clients = new Map();          // "ip:port" → { mqtt, topics: Map(id→name), names: Map(name→id), nextId }

function packet(type, body) {
  const len = body.length + 2;
  const head = len > 255 ? Buffer.from([0x01, (len + 2) >> 8, (len + 2) & 0xff, type]) : Buffer.from([len, type]);
  return Buffer.concat([head, body]);
}
function send(addr, type, body) {
  const p = packet(type, body);
  sock.send(p, addr.port, addr.address);
  console.log(`→ ${addr.address}:${addr.port} ${NAME[type]} ${p.toString('hex')}`);
}
const u16 = (n) => Buffer.from([n >> 8, n & 0xff]);

function topicId(c, name) {
  if (!c.names.has(name)) { const id = c.nextId++; c.names.set(name, id); c.topics.set(id, name); }
  return c.names.get(name);
}

sock.on('message', (msg, addr) => {
  const key = `${addr.address}:${addr.port}`;
  let off = 0, len = msg[0];
  if (len === 0x01) { len = msg.readUInt16BE(1); off = 2; }
  const type = msg[off + 1];
  const b = msg.subarray(off + 2);
  console.log(`← ${key} ${NAME[type] || type} ${msg.toString('hex')}`);
  let c = clients.get(key);

  if (type === T.CONNECT) {
    const flags = b[0], duration = b.readUInt16BE(2), clientId = b.subarray(4).toString();
    c?.mqtt?.end(true);
    c = { topics: new Map(), names: new Map(), nextId: 10, addr, pending: [] };
    clients.set(key, c);
    c.mqtt = mqtt.connect(BROKER, { clientId: `sn-${clientId}`, clean: !!(flags & 0x04), keepalive: duration, reconnectPeriod: 0 });
    c.mqtt.on('connect', () => send(addr, T.CONNACK, Buffer.from([0x00])));
    c.mqtt.on('error', () => send(addr, T.CONNACK, Buffer.from([0x03])));
    c.mqtt.on('message', (topic, payload) => {
      let id = c.names.get(topic);
      if (id === undefined) {               // onbekend topic: eerst REGISTER naar de client
        id = topicId(c, topic);
        send(addr, T.REGISTER, Buffer.concat([u16(id), u16(0x7f00 + (id & 0xff)), Buffer.from(topic)]));
      }
      send(addr, T.PUBLISH, Buffer.concat([Buffer.from([0x00]), u16(id), u16(0), payload]));
    });
    return;
  }
  if (type === T.PUBLISH && (b[0] & 0x60) === 0x60) {   // QoS -1: zonder verbinding, voorgedefinieerd topic
    const id = b.readUInt16BE(1);
    const name = (b[0] & 0x03) === 0x02 ? b.subarray(1, 3).toString() : PREDEFINED[id];
    if (name) { const tmp = mqtt.connect(BROKER, { reconnectPeriod: 0 }); tmp.on('connect', () => tmp.publish(name, b.subarray(5), {}, () => tmp.end())); }
    return;
  }
  if (!c) return send(addr, T.DISCONNECT, Buffer.alloc(0));
  if (type === T.REGISTER) {
    const msgId = b.readUInt16BE(2), name = b.subarray(4).toString();
    send(addr, T.REGACK, Buffer.concat([u16(topicId(c, name)), u16(msgId), Buffer.from([0x00])]));
  } else if (type === T.PUBLISH) {
    const flags = b[0], id = b.readUInt16BE(1), msgId = b.readUInt16BE(3), data = b.subarray(5);
    const qos = (flags >> 5) & 0x03;
    const name = (flags & 0x03) === 0x01 ? PREDEFINED[id] : (flags & 0x03) === 0x02 ? b.subarray(1, 3).toString() : c.topics.get(id);
    if (!name) return send(addr, T.PUBACK, Buffer.concat([u16(id), u16(msgId), Buffer.from([0x02])]));  // ongeldig topic-ID
    c.mqtt.publish(name, data, { qos: Math.min(qos, 1), retain: !!(flags & 0x10) }, () => {
      if (qos >= 1) send(addr, T.PUBACK, Buffer.concat([u16(id), u16(msgId), Buffer.from([0x00])]));
    });
  } else if (type === T.SUBSCRIBE) {
    const flags = b[0], msgId = b.readUInt16BE(1), name = b.subarray(3).toString();
    const wild = /[+#]/.test(name);
    c.mqtt.subscribe(name, { qos: Math.min((flags >> 5) & 3, 1) }, () => {
      send(addr, T.SUBACK, Buffer.concat([Buffer.from([flags & 0x60]), u16(wild ? 0 : topicId(c, name)), u16(msgId), Buffer.from([0x00])]));
    });
  } else if (type === T.PINGREQ) {
    send(addr, T.PINGRESP, Buffer.alloc(0));
  } else if (type === T.DISCONNECT) {
    send(addr, T.DISCONNECT, Buffer.alloc(0));
    c.mqtt.end(true);
    clients.delete(key);
  }
});

sock.bind(PORT, () => console.log(`MQTT-SN-gateway op udp/${PORT} → ${BROKER}`));
