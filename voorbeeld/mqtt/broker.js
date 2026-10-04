#!/usr/bin/env node
// Lokale MQTT-broker (Aedes) met WebSocket-listener voor de mqtt-voorbeeldapp.
// Verbind de app met  ws://localhost:8888  .
// Vereist:  npm install   (aedes + aedes-server-factory staan in package.json)
//
//   node broker.js            # MQTT-over-WS op poort 8888
//   PORT=9001 node broker.js

const aedes = require('aedes')();
const { createServer } = require('aedes-server-factory');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8888;

// WebSocket-listener (de browser-app praat MQTT-over-WebSocket)
const server = createServer(aedes, { ws: true });

aedes.on('client',           (c) => console.log(`[+] client verbonden: ${c?.id}`));
aedes.on('clientDisconnect', (c) => console.log(`[-] client weg: ${c?.id}`));
aedes.on('subscribe', (subs, c) =>
  console.log(`[~] ${c?.id} abonneert: ${subs.map(s => `${s.topic} (QoS ${s.qos})`).join(', ')}`));
aedes.on('publish', (pkt, c) => {
  if (c) console.log(`[>] ${c.id} PUBLISH ${pkt.topic} (QoS ${pkt.qos}${pkt.retain ? ', retain' : ''})`);
});

server.listen(PORT, () => {
  console.log(`Aedes MQTT-broker (WebSocket) luistert op ws://localhost:${PORT}`);
});
