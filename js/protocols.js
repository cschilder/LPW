const PROTOCOLS = {
  mqtt: {
    id: 'mqtt', name: 'MQTT', fullName: 'Message Queuing Telemetry Transport',
    version: 'v3.1.1 / v5.0', standard: 'OASIS, ISO/IEC 20922',
    color: '#E95420', transport: 'TCP/IP', port: '1883 / 8883 (TLS)',
    model: 'Publish/Subscribe', qos: 'QoS 0, 1, 2', security: 'TLS/SSL',
    category: 'IoT Messaging', idealFor: 'IoT, Slimme meters, M2M',
    tags: ['IoT', 'Pub/Sub', 'Broker', 'TCP'],
    shortDesc: 'Het toonaangevende lichtgewicht berichtenprotocol voor IoT-apparaten met beperkte resources en netwerken met lage bandbreedte.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#E95420"/>
      <path d="M16 30 Q16 18 32 18 Q48 18 48 30 Q54 30 54 38 Q54 46 48 46 L16 46 Q10 46 10 38 Q10 30 16 30Z" fill="white" opacity="0.25"/>
      <line x1="22" y1="46" x2="22" y2="54" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="32" y1="46" x2="32" y2="54" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="42" y1="46" x2="42" y2="54" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <polyline points="19,51 22,46 25,51" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
      <polyline points="39,51 42,46 45,51" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
      <line x1="32" y1="18" x2="32" y2="10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <polyline points="29,13 32,10 35,13" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

MQTT (Message Queuing Telemetry Transport) is een lichtgewicht publish-subscribe berichtenprotocol, ontworpen voor apparaten met beperkte rekenkracht en netwerken met lage bandbreedte of onbetrouwbare verbindingen. Het werd in 1999 ontwikkeld door Andy Stanford-Clark (IBM) en Arlen Nipper voor het bewaken van oliepijpleidingen via satellietsystemen.

Het protocol heeft een minimale overhead van slechts **2 bytes** voor de vaste header, waardoor het ideaal is voor microcontrollers, embedded systemen en IoT-sensoren. MQTT staat geregistreerd als ISO/IEC 20922:2016 en wordt beheerd door OASIS.

**Versies:**
- **MQTT 3.1** (2010): Oorspronkelijke open specificatie
- **MQTT 3.1.1** (2014): OASIS standaard, meest breed ondersteund
- **MQTT 5.0** (2019): Nieuwe features zoals sessie-expiratie, user properties, request/response patroon`,

      werking: `## Werking

MQTT werkt via een **broker-gebaseerd publish/subscribe model** met drie rollen:

1. **Broker**: Centrale server (bijv. Mosquitto, HiveMQ, EMQX) die berichten ontvangt, opslaat en distribueert
2. **Publisher**: Stuurt berichten naar een *topic*
3. **Subscriber**: Abonneert zich op topics en ontvangt bijbehorende berichten

### Topics
Topics zijn hiërarchische UTF-8 strings gescheiden door \`/\`:
\`\`\`
huis/woonkamer/temperatuur
fabriek/machine-3/druk
sensor/+/status          ← + wildcard: één niveau
apparaten/#              ← # wildcard: alle niveaus
\`\`\`

### Quality of Service (QoS)
| QoS | Naam | Garantie | Gebruik |
|-----|------|----------|---------|
| 0 | At most once | Geen, kan verloren gaan | Niet-kritische telemetrie |
| 1 | At least once | Bevestigd, kan duplicaten bevatten | Meeste IoT-data |
| 2 | Exactly once | Gegarandeerd precies één keer | Betalingen, commando's |

### Keep-Alive & LWT
- **Keep-Alive**: Client stuurt periodiek \`PINGREQ\`; broker verbreekt bij overschrijding
- **Last Will and Testament (LWT)**: Broker stuurt vooraf ingesteld bericht bij onverwacht verbindingsverlies
- **Retained messages**: Broker slaat laatste bericht op per topic voor nieuwe subscribers`,

      toepassingen: `## Toepassingen

- **Smart Home**: Home Assistant, Philips Hue, slimme thermostaten (Nest, Tado)
- **Industriële IoT (IIoT)**: Machinebewaking, productielijnstatus, voorspellend onderhoud
- **Slimme energiemeters**: Real-time verbruiksdoorgave aan energiebedrijven (DSMR-protocol in Nederland)
- **Voertuigtelemetrie**: GPS-tracking, motorstatus, vlootbeheer
- **Precisielandbouw**: Bodemvochtsensoren, gewasbewaking, automatische irrigatie
- **Ziekenhuismonitoring**: Vitale functies van patiënten, medische apparatuur
- **Metropool-infrastructuur**: Verkeerslichten, luchtkwaliteitssensoren, afvalbeheer
- **Facebook Messenger**: Gebruikt MQTT intern voor mobiele push-notificaties`,

      opties: `## Opties & Configuratie

### Verbindingsparameters
| Parameter | Beschrijving | Standaard |
|-----------|-------------|-----------|
| \`host\` | Broker-adres (IP of hostname) | localhost |
| \`port\` | Poortnummer | 1883 / 8883 (TLS) |
| \`client_id\` | Unieke client-ID (max. 23 tekens in v3.1.1) | Willekeurig |
| \`keepalive\` | Keep-alive interval in seconden | 60 |
| \`clean_session\` | Sessiedata wissen bij verbinding | true |
| \`username\` / \`password\` | Authenticatie | — |
| \`tls\` | TLS/SSL inschakelen | false |

### Berichtparameters
| Parameter | Beschrijving | Waarden |
|-----------|-------------|---------|
| \`qos\` | Quality of Service niveau | 0, 1, 2 |
| \`retain\` | Bericht opslaan op broker voor nieuwe subscribers | true / false |
| \`payload\` | Berichtinhoud (max. 256 MB) | Bytes / UTF-8 string |

### MQTT 5.0 Uitbreidingen
| Feature | Beschrijving |
|---------|-------------|
| \`message_expiry_interval\` | Vervaltijd voor berichten in seconden |
| \`topic_alias\` | Verkort topic-ID om bandbreedte te besparen |
| \`user_properties\` | Aangepaste sleutel-waardeparen in headers |
| \`shared_subscriptions\` | Load-balanced subscriptions (\`$share/groep/topic\`) |
| \`response_topic\` + \`correlation_data\` | Request/response patroon |
| \`content_type\` | MIME-type van de payload (bijv. \`application/json\`) |`,

      voorbeeld: `## Voorbeeld

### Python (paho-mqtt)
\`\`\`python
import paho.mqtt.client as mqtt
import json, time

BROKER = "broker.hivemq.com"
TOPIC  = "lpw/demo/temperatuur"

def on_connect(client, userdata, flags, rc):
    print("Verbonden!" if rc == 0 else f"Fout: {rc}")
    client.subscribe(TOPIC, qos=1)

def on_message(client, userdata, msg):
    data = json.loads(msg.payload.decode())
    print(f"[{msg.topic}] {data}")

client = mqtt.Client(client_id="sensor_001")
client.on_connect = on_connect
client.on_message  = on_message

# Last Will: offline-melding bij verbindingsverlies
client.will_set("lpw/demo/status", '{"online":false}', qos=1, retain=True)

client.connect(BROKER, 1883, keepalive=60)
client.loop_start()

try:
    while True:
        payload = json.dumps({"temp": 21.5, "vocht": 65})
        client.publish(TOPIC, payload, qos=1)
        print(f"Gepubliceerd: {payload}")
        time.sleep(10)
except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
\`\`\`

### JavaScript / Node.js (mqtt.js)
\`\`\`javascript
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://broker.hivemq.com', {
  clientId: 'lpw_js_001',
  keepalive: 60,
  will: {
    topic: 'lpw/demo/status',
    payload: JSON.stringify({ online: false }),
    qos: 1, retain: true
  }
});

client.on('connect', () => {
  console.log('Verbonden met broker');
  client.subscribe('lpw/demo/#', { qos: 1 });
});

client.on('message', (topic, message) => {
  console.log(\`\${topic}: \${message.toString()}\`);
});

setInterval(() => {
  client.publish('lpw/demo/temperatuur',
    JSON.stringify({ temp: 21.5, eenheid: 'C' }),
    { qos: 1, retain: false }
  );
}, 10000);
\`\`\``
    }
  },

  coap: {
    id: 'coap', name: 'CoAP', fullName: 'Constrained Application Protocol',
    version: 'RFC 7252 (2014)', standard: 'IETF RFC 7252',
    color: '#0066CC', transport: 'UDP / DTLS', port: '5683 / 5684 (DTLS)',
    model: 'Request/Response', qos: 'Confirmable / Non-confirmable', security: 'DTLS',
    category: 'IoT REST', idealFor: 'Embedded systems, sensoren, actuatoren',
    tags: ['IoT', 'REST', 'UDP', 'RFC 7252'],
    shortDesc: 'Een RESTful protocol geoptimaliseerd voor microcontrollers en netwerken met verlies, gebaseerd op UDP in plaats van TCP.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0066CC"/>
      <rect x="18" y="20" width="28" height="24" rx="3" stroke="white" stroke-width="2.5"/>
      <line x1="24" y1="20" x2="24" y2="44" stroke="white" stroke-width="1.5" opacity="0.5"/>
      <line x1="40" y1="20" x2="40" y2="44" stroke="white" stroke-width="1.5" opacity="0.5"/>
      <line x1="18" y1="28" x2="46" y2="28" stroke="white" stroke-width="1.5" opacity="0.5"/>
      <line x1="18" y1="36" x2="46" y2="36" stroke="white" stroke-width="1.5" opacity="0.5"/>
      <circle cx="21" cy="24" r="1.5" fill="white"/>
      <text x="29" y="26" fill="white" font-size="6" font-family="Ubuntu Mono,monospace">GET</text>
      <text x="21" y="34" fill="white" font-size="5" font-family="Ubuntu Mono,monospace">POST</text>
      <text x="21" y="42" fill="white" font-size="5" font-family="Ubuntu Mono,monospace">PUT</text>
      <text x="35" y="34" fill="white" font-size="5" font-family="Ubuntu Mono,monospace">DEL</text>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

CoAP (Constrained Application Protocol) is een gespecialiseerd webprotocol ontworpen voor gebruik op microcontrollers en andere resource-beperkte apparaten in het Internet of Things. Het is gestandaardiseerd door de IETF in RFC 7252 (2014) en brengt de vertrouwde REST-architectuur van HTTP naar netwerken met verlies, lage bandbreedte en beperkt energieverbruik.

In tegenstelling tot HTTP, dat TCP gebruikt, maakt CoAP gebruik van **UDP** waardoor de overhead minimaal is. Een CoAP-header is slechts **4 bytes** groot. CoAP is ontworpen om volledig interoperabel te zijn met HTTP via eenvoudige proxies.

**Gerelateerde RFC's:**
- **RFC 7252**: Core CoAP specificatie
- **RFC 7641**: Observe-extensie (push-updates)
- **RFC 7959**: Block-wise transfers (grote payloads)
- **RFC 8323**: CoAP over TCP/TLS`,

      werking: `## Werking

CoAP volgt het **client-server request/response model**, vergelijkbaar met HTTP maar geoptimaliseerd voor UDP:

### Berichttypen
| Type | Beschrijving |
|------|-------------|
| **CON** (Confirmable) | Betrouwbaar: ontvangende partij stuurt ACK of RST terug |
| **NON** (Non-confirmable) | Onbetrouwbaar: geen bevestiging vereist |
| **ACK** (Acknowledgement) | Bevestiging van CON-bericht |
| **RST** (Reset) | Foutmelding of onbekend bericht |

### Methoden (REST-stijl)
- \`GET\` — Lees resource
- \`POST\` — Maak resource aan
- \`PUT\` — Vervang resource
- \`DELETE\` — Verwijder resource

### Responscodes
CoAP gebruikt codes vergelijkbaar met HTTP: \`2.05 Content\`, \`4.04 Not Found\`, \`5.00 Internal Server Error\`

### Observe-extensie (RFC 7641)
Client registreert zich als observer bij een resource. Server stuurt automatisch updates (push-model), zonder polling:
\`\`\`
Client → GET /temperatuur  (Observe: 0)
Server ← 2.05 Content: 21.5°C  (Observe: 1)
Server ← 2.05 Content: 21.7°C  (Observe: 2)  ← automatische update
\`\`\`

### Beveiliging
DTLS (Datagram TLS) beveiligt CoAP-verbindingen op poortnummer 5684. Voor pre-shared keys, raw public keys of certificaten.`,

      toepassingen: `## Toepassingen

- **Slimme gebouwautomatisering**: Verlichtingscontrole, HVAC-systemen, sensorbeheer (Zigbee 3.0 met CoAP)
- **Smart Energy**: IEC 61968 smartgrid-communicatie, slimme meters
- **Medisch IoT**: Draagbare patiëntsensoren (hartslag, bloedzuurstof)
- **Precisie-irrigatie**: Bodemvochtsensoren op Arduino/ESP32
- **Logistiek & Asset tracking**: RFID-gateways, pakket-sensoren
- **Slimme verkeerssystemen**: Sensoren in wegdek, parkeerplaatssensoren
- **LwM2M-transport**: CoAP is het onderliggende transport voor OMA LwM2M device management`,

      opties: `## Opties & Configuratie

### Verbindingsopties
| Optie | Beschrijving | Standaard |
|-------|-------------|-----------|
| \`ACK_TIMEOUT\` | Wachttijd voor ACK in seconden | 2s |
| \`ACK_RANDOM_FACTOR\` | Willekeurige factor voor retransmissie | 1.5 |
| \`MAX_RETRANSMIT\` | Max. aantal hertransmissies | 4 |
| \`NSTART\` | Max. gelijktijdige uitstaande interacties | 1 |
| \`DEFAULT_LEISURE\` | Vertraging bij multicast-respons | 5s |
| \`PROBING_RATE\` | Max. transmissiesnelheid | 1 byte/s |

### Content-Format opties
| Code | MIME Type |
|------|-----------|
| 0 | text/plain |
| 40 | application/link-format |
| 41 | application/xml |
| 50 | application/json |
| 60 | application/cbor |
| 110 | application/senml+json |

### URI-opties
\`\`\`
coap://sensor.local:5683/v1/temperatuur?unit=celsius
       └── host ──┘ └port┘└── path ───┘└─── query ───┘
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python (aiocoap)
\`\`\`python
import asyncio
import aiocoap

async def lees_sensor():
    protocol = await aiocoap.Context.create_client_context()

    request = aiocoap.Message(
        code=aiocoap.GET,
        uri='coap://sensor.local/temperatuur'
    )

    try:
        response = await protocol.request(request).response
        print(f"Statuscode: {response.code}")
        print(f"Payload: {response.payload.decode()}")
    except Exception as e:
        print(f"Fout: {e}")

async def stuur_actuator():
    protocol = await aiocoap.Context.create_client_context()

    request = aiocoap.Message(
        code=aiocoap.PUT,
        payload=b'{"led": true}',
        uri='coap://actuator.local/led'
    )
    request.opt.content_format = 50  # application/json

    response = await protocol.request(request).response
    print(f"Actuator respons: {response.code}")

# CoAP server
async def coap_server():
    root = aiocoap.resource.Site()
    root.add_resource(['temperatuur'], TempResource())

    await aiocoap.Context.create_server_context(root)
    await asyncio.get_event_loop().create_future()

asyncio.run(lees_sensor())
\`\`\`

### Node.js (node-coap)
\`\`\`javascript
const coap = require('coap');

// CoAP GET request
const req = coap.request({
  hostname: 'sensor.local',
  pathname: '/temperatuur',
  method: 'GET',
  observe: true   // Observe-extensie: push-updates ontvangen
});

req.on('response', (res) => {
  res.on('data', (chunk) => {
    console.log('Sensordata:', chunk.toString());
  });
});

req.end();

// CoAP Server
const server = coap.createServer();

server.on('request', (req, res) => {
  if (req.url === '/temperatuur') {
    res.code = '2.05';  // Content
    res.setOption('Content-Format', 'application/json');
    res.end(JSON.stringify({ temp: 21.5, unit: 'C' }));
  }
});

server.listen(() => console.log('CoAP server gestart op poort 5683'));
\`\`\``
    }
  },

  websocket: {
    id: 'websocket', name: 'WebSocket', fullName: 'WebSocket Protocol',
    version: 'RFC 6455 (2011)', standard: 'IETF RFC 6455, W3C API',
    color: '#2C9E4B', transport: 'TCP (HTTP-upgrade)', port: '80 (ws) / 443 (wss)',
    model: 'Full-duplex bidirectioneel', qos: 'Geen (applicatieniveau)', security: 'TLS (WSS)',
    category: 'Web Real-time', idealFor: 'Dashboards, chats, live data, gaming',
    tags: ['Web', 'Full-duplex', 'TCP', 'Real-time'],
    shortDesc: 'Persistent, bidirectionele verbinding over TCP via HTTP-upgrade — de standaard voor real-time webapplicaties.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#2C9E4B"/>
      <rect x="8" y="24" width="16" height="16" rx="3" fill="white" opacity="0.9"/>
      <rect x="40" y="24" width="16" height="16" rx="3" fill="white" opacity="0.9"/>
      <line x1="24" y1="29" x2="40" y2="29" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <polyline points="36,25 40,29 36,33" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
      <line x1="40" y1="35" x2="24" y2="35" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <polyline points="28,31 24,35 28,39" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Het WebSocket-protocol biedt een persistente, full-duplex communicatieverbinding over één TCP-verbinding, gestandaardiseerd in **RFC 6455** door de IETF en de W3C WebSocket API voor browsers. Het lost de beperkingen van HTTP op voor real-time communicatie: client en server kunnen gelijktijdig en onafhankelijk data sturen, zonder herhaalde HTTP-verzoeken (polling).

WebSocket werd geïntroduceerd als onderdeel van HTML5 en wordt native ondersteund door alle moderne browsers. Na de initiële HTTP-handshake valt de overhead terug tot slechts **2-14 bytes** per frame.

**Varianten:**
- \`ws://\` — Onbeveiligd, poort 80
- \`wss://\` — TLS-beveiligd, poort 443 (sterk aanbevolen)`,

      werking: `## Werking

### Handshake (HTTP-upgrade)
De verbinding begint als HTTP-verzoek en wordt geüpgraded:
\`\`\`
Client → GET /chat HTTP/1.1
         Upgrade: websocket
         Connection: Upgrade
         Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
         Sec-WebSocket-Version: 13

Server ← HTTP/1.1 101 Switching Protocols
         Upgrade: websocket
         Connection: Upgrade
         Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
\`\`\`

### Framestructuur
\`\`\`
Bit:  0   1   2   3   4-7    8      9-15   16-...
      FIN RSV RSV RSV Opcode MASK  Payload  Payload
          1   2   3           Len   ExtLen   Data
\`\`\`

### Opcodes
| Opcode | Beschrijving |
|--------|-------------|
| 0x1 | Text frame (UTF-8) |
| 0x2 | Binary frame |
| 0x8 | Connection close |
| 0x9 | Ping |
| 0xA | Pong |

### Ping/Pong Heartbeat
Server stuurt \`Ping\`; client antwoordt met \`Pong\` om verbinding actief te houden.`,

      toepassingen: `## Toepassingen

- **Live dashboards**: Realtime grafieken, monitoring (Grafana, Kibana)
- **Multiplayer gaming**: Spelerstatus synchronisatie, chat in games
- **Samenwerkingstools**: Google Docs-stijl simultaan bewerken, Figma
- **Chatapplicaties**: WhatsApp Web, Slack, Discord web client
- **Financiële handelsplatforms**: Beursprijzen, orderboeken (milliseconde-latentie)
- **IoT-interfaces**: Browser-dashboards voor sensordata (via MQTT-over-WebSocket)
- **Livestreaming metadata**: Statistieken, reacties, chat naast videostreams
- **DevOps tools**: Terminal-in-browser (xterm.js), CI/CD log-streaming`,

      opties: `## Opties & Configuratie

### Client-verbindingsopties
| Optie | Beschrijving | Standaard |
|-------|-------------|-----------|
| \`url\` | WebSocket URL (\`ws://\` of \`wss://\`) | — |
| \`protocols\` | Sub-protocol(len) (bijv. \`"mqtt"\`, \`"chat"\`) | — |
| \`headers\` | Extra HTTP-headers bij handshake (server-side) | — |
| \`perMessageDeflate\` | Permessage compressie (RFC 7692) | false |
| \`maxPayload\` | Max. payload in bytes | 100 MB |
| \`handshakeTimeout\` | Timeout voor handshake in ms | — |

### Server-opties (ws bibliotheek)
| Optie | Beschrijving | Standaard |
|-------|-------------|-----------|
| \`port\` | Poort om op te luisteren | — |
| \`path\` | URL-pad waarop verbindingen worden geaccepteerd | — |
| \`maxConnections\` | Max. gelijktijdige verbindingen | Onbeperkt |
| \`clientTracking\` | Bijhouden van verbonden clients | true |
| \`verifyClient\` | Authenticatiefunctie bij handshake | — |

### Sub-protocollen
Sub-protocollen definiëren de berichtopmaak na de WebSocket-verbinding:
\`\`\`
wss://server.nl/chat?subprotocol=v2.chat
\`\`\`
Bekende sub-protocollen: \`mqtt\`, \`stomp\`, \`wamp\`, \`graphql-ws\``,

      voorbeeld: `## Voorbeeld

### Browser (native JavaScript)
\`\`\`javascript
// Verbinding maken
const ws = new WebSocket('wss://echo.websocket.org');

ws.addEventListener('open', () => {
  console.log('Verbonden!');
  ws.send(JSON.stringify({ type: 'hallo', tekst: 'Wereld' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Ontvangen:', data);
});

ws.addEventListener('close', (event) => {
  console.log(\`Verbinding gesloten: \${event.code} - \${event.reason}\`);
});

ws.addEventListener('error', (error) => {
  console.error('WebSocket fout:', error);
});

// Stuur om de 5 seconden een ping
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  }
}, 5000);
\`\`\`

### Node.js Server (ws bibliotheek)
\`\`\`javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(\`Nieuwe verbinding van \${ip}\`);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Ontvangen:', data);

    // Broadcast naar alle clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ van: ip, ...data }));
      }
    });
  });

  ws.on('close', () => console.log(\`\${ip} verbroken\`));

  // Heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Ping alle clients elke 30s
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
\`\`\``
    }
  },

  amqp: {
    id: 'amqp', name: 'AMQP', fullName: 'Advanced Message Queuing Protocol',
    version: 'v0.9.1 / v1.0 (ISO)', standard: 'OASIS, ISO/IEC 19464',
    color: '#8E24AA', transport: 'TCP', port: '5672 / 5671 (TLS)',
    model: 'Queue/Exchange/Binding', qos: 'Acknowledgement, persistentie', security: 'TLS/SASL',
    category: 'Enterprise Messaging', idealFor: 'Microservices, taakwachtrijen, event-driven architecturen',
    tags: ['Enterprise', 'Queue', 'Routing', 'TCP'],
    shortDesc: 'Enterprise-grade berichtenprotocol met uitgebreide routering via exchanges, wachtrijen en bindingen.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#8E24AA"/>
      <rect x="10" y="12" width="16" height="10" rx="2" fill="white" opacity="0.9"/>
      <rect x="10" y="26" width="16" height="10" rx="2" fill="white" opacity="0.9"/>
      <rect x="10" y="40" width="16" height="10" rx="2" fill="white" opacity="0.9"/>
      <rect x="38" y="12" width="16" height="10" rx="2" fill="white" opacity="0.5"/>
      <rect x="38" y="26" width="16" height="10" rx="2" fill="white" opacity="0.5"/>
      <rect x="38" y="40" width="16" height="10" rx="2" fill="white" opacity="0.5"/>
      <line x1="26" y1="17" x2="38" y2="17" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="26" y1="31" x2="38" y2="31" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="26" y1="45" x2="38" y2="45" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <polyline points="34,13 38,17 34,21" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
      <polyline points="34,27 38,31 34,35" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
      <polyline points="34,41 38,45 34,49" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

AMQP (Advanced Message Queuing Protocol) is een open standaard berichtenprotocol voor betrouwbare, asynchrone communicatie tussen applicaties en services. Het is gestandaardiseerd als ISO/IEC 19464 en werd ontworpen voor gebruik in financiële systemen en enterprise-omgevingen waar betrouwbaarheid essentieel is.

AMQP onderscheidt zich door zijn krachtige **routeringsmechanisme** via exchanges, wachtrijen en bindingen, waarmee complexe berichtstromen kunnen worden geconfigureerd zonder applicatiecode te wijzigen.

**Versies:**
- **AMQP 0.9.1**: Meest gebruikt, geïmplementeerd door RabbitMQ (niet ISO-compatibel maar wijdverspreid)
- **AMQP 1.0**: ISO/IEC 19464 standaard, fundamenteel ander ontwerp, ondersteund door Azure Service Bus, ActiveMQ Artemis, Qpid`,

      werking: `## Werking

AMQP 0.9.1 gebruikt drie kernconcepten:

### 1. Exchange
Ontvangt berichten van publishers en routeert ze naar wachtrijen op basis van de **routing key** en **bindings**.

| Exchange Type | Routering |
|--------------|----------|
| **Direct** | Exact overeenkomst van routing key |
| **Topic** | Patroonovereenkomst (\`*\` = 1 woord, \`#\` = meerdere) |
| **Fanout** | Naar alle gebonden wachtrijen (broadcast) |
| **Headers** | Op basis van berichtheaders |

### 2. Queue (Wachtrij)
Buffert berichten totdat een consumer ze verwerkt. Opties:
- **Durable**: Blijft bestaan na herstart van broker
- **Exclusive**: Alleen voor één verbinding
- **Auto-delete**: Verwijderd als alle consumers loskoppelen

### 3. Binding
Koppelt een exchange aan een wachtrij, eventueel met een routing key patroon:
\`\`\`
Exchange: orders.topic
Binding:  orders.*.urgent  →  Queue: urgent-orders
Binding:  orders.#         →  Queue: all-orders
\`\`\`

### Bevestiging (Acknowledgement)
Consumers bevestigen berichten met \`basic.ack\`; bij fout kan met \`basic.nack\` het bericht worden teruggeplaatst in de wachtrij (requeue).`,

      toepassingen: `## Toepassingen

- **Microservices-orchestratie**: Asynchrone service-to-service communicatie (opdrachten, events)
- **Taakwachtrijen**: Achtergrondverwerking van e-mails, afbeeldingen, rapporten (Celery + RabbitMQ)
- **Event sourcing**: Auditlogboeken, CQRS-patronen
- **Betalingssystemen**: Betrouwbare verwerking van financiële transacties
- **Log-aggregatie**: Gecentraliseerde logverwerking (ELK-stack)
- **Workload distributie**: Load balancing over meerdere worker-instances
- **Integratiehubs**: Koppelen van legacy-systemen via berichtvertaling`,

      opties: `## Opties & Configuratie

### Verbindingsparameters
| Parameter | Beschrijving | Standaard |
|-----------|-------------|-----------|
| \`host\` | Broker-hostnaam | localhost |
| \`port\` | TCP-poort | 5672 / 5671 (TLS) |
| \`virtual_host\` | Virtuele host (isolatie) | \`/\` |
| \`heartbeat\` | Heartbeat-interval in seconden | 60 |
| \`connection_attempts\` | Verbindingspogingen | 1 |
| \`retry_delay\` | Vertraging tussen pogingen | 2s |
| \`ssl_options\` | TLS-instellingen | — |

### Queue-declaratieopties
| Optie | Beschrijving |
|-------|-------------|
| \`durable\` | Bestand tegen broker-herstart |
| \`exclusive\` | Exclusief voor deze verbinding |
| \`auto_delete\` | Verwijderd als geen consumers meer actief zijn |
| \`x-message-ttl\` | Vervaltijd van berichten in ms |
| \`x-max-length\` | Maximaal aantal berichten in wachtrij |
| \`x-dead-letter-exchange\` | Exchange voor dode berichten (DLX) |

### Berichtprioriteiten & DLX
\`\`\`json
{
  "x-max-priority": 10,
  "x-dead-letter-exchange": "dode-berichten",
  "x-message-ttl": 300000
}
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python (pika — RabbitMQ)
\`\`\`python
import pika
import json

# Verbinding met RabbitMQ
params = pika.ConnectionParameters(
    host='localhost',
    port=5672,
    virtual_host='/',
    credentials=pika.PlainCredentials('guest', 'guest'),
    heartbeat=600
)
connection = pika.BlockingConnection(params)
channel = connection.channel()

# Exchange en wachtrij declareren
channel.exchange_declare(
    exchange='bestellingen',
    exchange_type='topic',
    durable=True
)
channel.queue_declare(
    queue='urgente-bestellingen',
    durable=True,
    arguments={'x-message-ttl': 300000}
)
channel.queue_bind(
    exchange='bestellingen',
    queue='urgente-bestellingen',
    routing_key='order.*.urgent'
)

# Bericht publiceren
bericht = {'order_id': 42, 'product': 'Laptop', 'prioriteit': 'urgent'}
channel.basic_publish(
    exchange='bestellingen',
    routing_key='order.nl.urgent',
    body=json.dumps(bericht),
    properties=pika.BasicProperties(
        delivery_mode=2,      # Persistent
        content_type='application/json'
    )
)
print(f"Gepubliceerd: {bericht}")

# Consumer
def verwerk_bestelling(ch, method, props, body):
    data = json.loads(body)
    print(f"Verwerking: {data}")
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_qos(prefetch_count=1)
channel.basic_consume('urgente-bestellingen', verwerk_bestelling)
channel.start_consuming()
\`\`\`

### Node.js (amqplib)
\`\`\`javascript
const amqp = require('amqplib');

async function start() {
  const conn    = await amqp.connect('amqp://localhost');
  const channel = await conn.createChannel();

  await channel.assertExchange('bestellingen', 'topic', { durable: true });
  await channel.assertQueue('urgente-bestellingen', {
    durable: true,
    arguments: { 'x-message-ttl': 300000 }
  });
  await channel.bindQueue('urgente-bestellingen', 'bestellingen', 'order.*.urgent');

  // Publiceer
  const bericht = { order_id: 42, product: 'Laptop' };
  channel.publish(
    'bestellingen', 'order.nl.urgent',
    Buffer.from(JSON.stringify(bericht)),
    { persistent: true, contentType: 'application/json' }
  );
  console.log('Gepubliceerd:', bericht);

  // Consumeer
  channel.prefetch(1);
  channel.consume('urgente-bestellingen', (msg) => {
    const data = JSON.parse(msg.content.toString());
    console.log('Verwerkt:', data);
    channel.ack(msg);
  });
}

start().catch(console.error);
\`\`\``
    }
  },

  http2: {
    id: 'http2', name: 'HTTP/2', fullName: 'Hypertext Transfer Protocol Version 2',
    version: 'RFC 9113 (2022)', standard: 'IETF RFC 9113 (ex RFC 7540)',
    color: '#0097A7', transport: 'TCP / TLS', port: '443 (HTTPS)',
    model: 'Request/Response (gemultiplext)', qos: 'Stream-prioritering', security: 'TLS 1.2+',
    category: 'Web Protocol', idealFor: 'Moderne webapplicaties, API\'s, CDN\'s',
    tags: ['Web', 'HTTP', 'Multiplexing', 'HPACK'],
    shortDesc: 'Binaire, gemultiplexte opvolger van HTTP/1.1 met header-compressie en server push voor snellere webpagina\'s.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0097A7"/>
      <line x1="10" y1="20" x2="54" y2="20" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <line x1="10" y1="29" x2="54" y2="29" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <line x1="10" y1="38" x2="40" y2="38" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <line x1="10" y1="47" x2="47" y2="47" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <text x="33" y="56" fill="white" font-size="11" font-weight="bold" font-family="Ubuntu,sans-serif">/2</text>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

HTTP/2 is de tweede grote versie van het Hypertext Transfer Protocol, gestandaardiseerd als RFC 7540 in 2015 (herzien als RFC 9113 in 2022). Het werd ontwikkeld op basis van Google's SPDY-protocol en lost fundamentele prestatieproblemen van HTTP/1.1 op, met name **head-of-line blocking** bij meerdere verzoeken op één verbinding.

HTTP/2 is volledig **achterwaarts compatibel** met HTTP/1.1: dezelfde methoden (GET, POST, enz.), statuscodes en headers worden gebruikt, maar de transportlaag is binair en significant efficiënter.

**Kernverbeteringen t.o.v. HTTP/1.1:**
- Binair frame-protocol (vs. tekst)
- Multiplexing: meerdere verzoeken parallel over één TCP-verbinding
- Header-compressie (HPACK)
- Server Push
- Stream-prioritering`,

      werking: `## Werking

### Streams en Frames
HTTP/2 verdeelt communicatie in **frames** die over **streams** worden verstuurd:
- Elke HTTP-transactie (verzoek + respons) gebruikt een aparte stream (identificatie: oneven getal voor client, even voor server push)
- Meerdere streams zijn gelijktijdig actief op één TCP-verbinding
- **Frametypen**: HEADERS, DATA, SETTINGS, WINDOW_UPDATE, PING, GOAWAY, RST_STREAM

### Multiplexing
\`\`\`
HTTP/1.1: Verzoek 1 → Wacht → Respons 1 → Verzoek 2 → Respons 2  (sequentieel)
HTTP/2:   Stream 1 ──────────────────────────────────────────────
          Stream 3 ─────────────────────────────
          Stream 5 ──────────────────────────────────  (parallel)
\`\`\`

### HPACK Header-compressie
Herhaalde headers (bijv. \`Cookie\`, \`User-Agent\`) worden vervangen door indexreferenties in een gedeelde tabel. Typische headercompressie: **85-88%** reductie.

### Server Push
Server stuurt proactief resources naar de client *voor* het verzoek:
\`\`\`
Client → GET /index.html
Server ← PUSH_PROMISE: /style.css   (vooraf gestuurde resource)
Server ← PUSH_PROMISE: /app.js
Server ← HEADERS + DATA voor /index.html
\`\`\``,

      toepassingen: `## Toepassingen

- **Moderne websites**: Alle grote websites (Google, Facebook, Amazon) gebruiken HTTP/2
- **REST API's**: Verhoogde throughput bij microservice-architecturen
- **CDN's**: Cloudflare, Fastly, Akamai — massale HTTP/2-adoptie
- **Progressive Web Apps (PWA)**: Sneller laden via multiplexing
- **gRPC**: Google's RPC framework is gebouwd op HTTP/2 voor efficiënte binaire communicatie
- **GraphQL over HTTP/2**: Meerdere query-streams parallel
- **Streaming media**: Video-chunk delivery via meerdere parallelle streams`,

      opties: `## Opties & Configuratie

### SETTINGS-frame parameters
| Parameter | Beschrijving | Standaard |
|-----------|-------------|-----------|
| \`HEADER_TABLE_SIZE\` | Max. grootte HPACK-tabel in bytes | 4096 |
| \`ENABLE_PUSH\` | Server Push in-/uitschakelen | 1 (aan) |
| \`MAX_CONCURRENT_STREAMS\` | Max. gelijktijdige streams | Onbeperkt |
| \`INITIAL_WINDOW_SIZE\` | Flow-control venster in bytes | 65535 |
| \`MAX_FRAME_SIZE\` | Max. framegrootte | 16384 |
| \`MAX_HEADER_LIST_SIZE\` | Max. ongecomprimeerde headerlijst | Onbeperkt |

### Nginx HTTP/2 configuratie
\`\`\`nginx
server {
    listen 443 ssl http2;
    ssl_certificate     /cert/cert.pem;
    ssl_certificate_key /cert/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Server Push
    location = /index.html {
        http2_push /css/style.css;
        http2_push /js/app.js;
    }
}
\`\`\`

### ALPN Protocolnegotiatie
HTTP/2 gebruikt **ALPN** (Application-Layer Protocol Negotiation) in de TLS-handshake om het protocol te selecteren (\`h2\` voor HTTP/2, \`http/1.1\` als fallback).`,

      voorbeeld: `## Voorbeeld

### Python (httpx met HTTP/2)
\`\`\`python
import httpx
import asyncio

async def http2_demo():
    # HTTP/2 client
    async with httpx.AsyncClient(http2=True) as client:
        # Parallel verzoeken over één verbinding
        verzoeken = [
            client.get('https://httpbin.org/get'),
            client.get('https://httpbin.org/headers'),
            client.get('https://httpbin.org/json'),
        ]

        responses = await asyncio.gather(*verzoeken)

        for r in responses:
            print(f"Status: {r.status_code}")
            print(f"Protocol: {r.http_version}")  # HTTP/2
            print(f"URL: {r.url}")

asyncio.run(http2_demo())
\`\`\`

### Node.js (ingebouwde http2 module)
\`\`\`javascript
const http2 = require('http2');
const fs    = require('fs');

// HTTP/2 server
const server = http2.createSecureServer({
  key:  fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
});

server.on('stream', (stream, headers) => {
  const path = headers[':path'];

  // Server Push: stuur CSS mee bij HTML-verzoek
  if (path === '/') {
    stream.pushStream({ ':path': '/style.css' }, (err, pushStream) => {
      if (!err) {
        pushStream.respond({ ':status': 200, 'content-type': 'text/css' });
        pushStream.end('body { font-family: Ubuntu, sans-serif; }');
      }
    });

    stream.respond({ ':status': 200, 'content-type': 'text/html' });
    stream.end('<html><head><link rel="stylesheet" href="/style.css"></head><body>HTTP/2!</body></html>');
  }
});

server.listen(8443, () => console.log('HTTP/2 server op poort 8443'));
\`\`\``
    }
  },

  http3: {
    id: 'http3', name: 'HTTP/3', fullName: 'Hypertext Transfer Protocol Version 3',
    version: 'RFC 9114 (2022)', standard: 'IETF RFC 9114 + RFC 9000 (QUIC)',
    color: '#1565C0', transport: 'QUIC (UDP)', port: '443 (UDP)',
    model: 'Request/Response (QUIC-streams)', qos: 'Stream-prioritering', security: 'TLS 1.3 (ingebouwd)',
    category: 'Modern Web Protocol', idealFor: 'Mobiele netwerken, hoog verlies, lage latentie',
    tags: ['Web', 'QUIC', 'UDP', '0-RTT'],
    shortDesc: 'De nieuwste HTTP-versie op basis van QUIC/UDP — elimineert TCP head-of-line blocking en biedt 0-RTT verbindingen.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#1565C0"/>
      <polygon points="20,12 44,32 20,52" fill="white" opacity="0.3"/>
      <polygon points="30,20 54,32 30,44" fill="white" opacity="0.6"/>
      <text x="8" y="56" fill="white" font-size="11" font-weight="bold" font-family="Ubuntu,sans-serif">/3</text>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

HTTP/3 is de derde versie van het HTTP-protocol, gestandaardiseerd als RFC 9114 in 2022. Het fundamentele verschil met HTTP/1.1 en HTTP/2 is het onderliggende transport: in plaats van TCP gebruikt HTTP/3 **QUIC** (RFC 9000) — een modern transport over UDP dat de beperkingen van TCP elimineert.

QUIC werd oorspronkelijk ontwikkeld door Google en overgedragen aan de IETF. Het biedt ingebouwde TLS 1.3-encryptie, verbindingsmigratie (bijv. bij wisselen van WiFi naar 4G) en elimineert het TCP head-of-line blocking probleem dat HTTP/2 nog steeds kon raken.

**Adoptiestatus (2025):** ~30% van het wereldwijde webverkeer gebruikt HTTP/3. Alle grote CDN's (Cloudflare, Fastly, Google) en browsers (Chrome, Firefox, Safari) ondersteunen het.`,

      werking: `## Werking

### QUIC als transportlaag
\`\`\`
HTTP/2:  TLS 1.3 → TCP → IP
HTTP/3:  QUIC (bevat TLS 1.3) → UDP → IP
\`\`\`

### Voordelen van QUIC over TCP

**0-RTT verbinding:**
\`\`\`
TCP + TLS 1.3:  SYN → SYN-ACK → ClientHello → ... → Data  (1-RTT min.)
QUIC (nieuw):   Initial + ClientHello → Data (1-RTT)
QUIC (terugkerend): 0-RTT Data → Server Respons           (0-RTT!)
\`\`\`

**Geen Head-of-Line Blocking:**
Bij HTTP/2 over TCP blokkeert verlies van één TCP-pakket *alle* streams (TCP-niveau HOL blocking). QUIC streams zijn onafhankelijk: verlies in stream 3 blokkeert stream 5 niet.

**Verbindingsmigratie:**
QUIC-verbindingen worden geïdentificeerd door een **Connection ID**, niet door het IP:poort-tuple. Bij netwerkoverschakeling (WiFi → 4G) blijft de verbinding actief.

### Alt-Svc Header
HTTP/3 wordt geadverteerd via:
\`\`\`
Alt-Svc: h3=":443"; ma=86400
\`\`\``,

      toepassingen: `## Toepassingen

- **Mobiele webapplicaties**: Aanzienlijk betere prestaties op wisselvallige 4G/5G-verbindingen
- **Video-streaming**: YouTube, Netflix gebruiken QUIC/HTTP/3 voor lagere buffering
- **CDN-distributie**: Cloudflare, Google Cloud CDN (eerstgebruikers van QUIC)
- **Real-time communicatie**: Video calls, WebRTC-alternatieven
- **Online gaming**: Lage-latentie verbindingen bij pakketverlies
- **Roamende apparaten**: IoT-apparaten die tussen netwerken bewegen`,

      opties: `## Opties & Configuratie

### QUIC-transportparameters
| Parameter | Beschrijving | Standaard |
|-----------|-------------|-----------|
| \`max_idle_timeout\` | Max. inactieve tijd in ms | 30000 |
| \`max_udp_payload_size\` | Max. UDP-pakketgrootte | 1200 |
| \`initial_max_data\` | Max. verbindingsflowcontrol | 1048576 |
| \`initial_max_streams_bidi\` | Max. bidirectionele streams | 100 |
| \`disable_active_migration\` | Verbindingsmigratie uitschakelen | false |

### Nginx HTTP/3 configuratie
\`\`\`nginx
server {
    listen 443 quic reuseport;     # HTTP/3 / QUIC
    listen 443 ssl http2;          # HTTP/2 fallback

    ssl_certificate     /cert/cert.pem;
    ssl_certificate_key /cert/key.pem;

    # Adverteer HTTP/3 aan browsers
    add_header Alt-Svc 'h3=":443"; ma=86400';
    add_header QUIC-Status $quic;
}
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python (aioquic)
\`\`\`python
import asyncio
from aioquic.asyncio import connect
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.h3.connection import H3_ALPN
from aioquic.h3.events import DataReceived, HeadersReceived
from aioquic.quic.configuration import QuicConfiguration

async def http3_get(url: str):
    config = QuicConfiguration(
        alpn_protocols=H3_ALPN,
        is_client=True,
        max_datagram_frame_size=65536,
        verify_peer=False   # Alleen voor test!
    )

    async with connect('example.com', 443, configuration=config) as protocol:
        http = protocol._http
        waiter = asyncio.get_event_loop().create_future()

        # HTTP/3 GET verzoek
        stream_id = http.send_headers(
            stream_id=protocol._quic.get_next_available_stream_id(),
            headers=[
                (b':method', b'GET'),
                (b':path', b'/'),
                (b':authority', b'example.com'),
                (b':scheme', b'https'),
            ],
            end_stream=True
        )

        # Respons verwerken
        async for event in protocol.events():
            if isinstance(event, HeadersReceived):
                headers = dict(event.headers)
                print(f"Status: {headers.get(b':status', b'?').decode()}")
            elif isinstance(event, DataReceived):
                print(f"Data: {event.data[:100]}")
                break

asyncio.run(http3_get('https://example.com'))
\`\`\`

### cURL (HTTP/3 testen)
\`\`\`bash
# HTTP/3 forceren
curl --http3 https://cloudflare.com -v

# HTTP-versie controleren
curl -sI https://cloudflare.com | grep -i 'alt-svc\|http'

# QUIC-statistieken
curl --http3 --write-out "%{http_version}\n%{time_total}s\n" \
     -o /dev/null -s https://cloudflare.com
\`\`\``
    }
  },

  xmpp: {
    id: 'xmpp', name: 'XMPP', fullName: 'Extensible Messaging and Presence Protocol',
    version: 'RFC 6120 (2011)', standard: 'IETF RFC 6120, RFC 6121',
    color: '#F57C00', transport: 'TCP', port: '5222 (client) / 5269 (S2S)',
    model: 'Federatief Pub/Sub + Messaging', qos: 'Applicatieniveau', security: 'TLS/SASL',
    category: 'Federatieve Messaging', idealFor: 'Instant messaging, IoT, federatieve communicatie',
    tags: ['Messaging', 'XML', 'Federatief', 'Aanwezigheid'],
    shortDesc: 'Open, federatief messaging-protocol op basis van XML, met uitgebreide extensies voor aanwezigheid, IoT en pub/sub.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#F57C00"/>
      <rect x="8" y="16" width="30" height="22" rx="4" fill="white" opacity="0.9"/>
      <path d="M12 42 L20 35 H38 V16" stroke="white" stroke-width="2" fill="none" opacity="0.5"/>
      <circle cx="48" cy="42" r="8" fill="white" opacity="0.9"/>
      <circle cx="48" cy="42" r="4" fill="#F57C00"/>
      <line x1="18" y1="24" x2="30" y2="24" stroke="#F57C00" stroke-width="2" stroke-linecap="round"/>
      <line x1="18" y1="29" x2="28" y2="29" stroke="#F57C00" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

XMPP (Extensible Messaging and Presence Protocol), oorspronkelijk bekend als Jabber, is een open standaard communicatieprotocol op basis van XML. Het werd in 1999 ontwikkeld door Jeremie Miller en gestandaardiseerd door de IETF in RFC 6120 en 6121.

XMPP is **federatief**: net als e-mail kan een gebruiker op server A communiceren met gebruikers op server B, C en D — er is geen centrale autoriteit vereist. Adressen (JID's) volgen het formaat \`gebruiker@domein/resource\`.

**Uitbreidingen (XEP's — XMPP Extension Protocols):**
Over 400 gedefinieerde extensies, waaronder:
- **XEP-0060**: Publish-Subscribe (PubSub) voor IoT
- **XEP-0199**: XMPP Ping
- **XEP-0363**: HTTP File Upload
- **XEP-0384**: OMEMO end-to-end versleuteling
- **XEP-0045**: Multi-User Chat (MUC)`,

      werking: `## Werking

### XML-stanzatypen
Alle XMPP-communicatie bestaat uit drie basisstanza's:

| Stanza | Beschrijving |
|--------|-------------|
| \`<message>\` | Tekstberichten, bestanden, reacties |
| \`<presence>\` | Aanwezigheidsstatus (online, bezet, afwezig) |
| \`<iq>\` | Info/Query — request/response voor data |

### Verbindingsstroom
\`\`\`xml
<!-- Client opent stream -->
<stream:stream to="jabber.nl" version="1.0" xml:lang="nl"
  xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">

<!-- Server biedt functies aan -->
<stream:features>
  <starttls xmlns="urn:ietf:params:xml:ns:xmpp-tls"><required/></starttls>
  <mechanisms xmlns="urn:ietf:params:xml:ns:xmpp-sasl">
    <mechanism>SCRAM-SHA-1</mechanism>
  </mechanisms>
</stream:features>
\`\`\`

### PubSub (XEP-0060) voor IoT
\`\`\`xml
<!-- Abonneer op sensordata -->
<iq type="set" to="pubsub.sensor-hub.nl">
  <pubsub xmlns="http://jabber.org/protocol/pubsub">
    <subscribe node="sensor/temperatuur" jid="user@domein.nl"/>
  </pubsub>
</iq>

<!-- Server stuurt update -->
<message from="pubsub.sensor-hub.nl">
  <event xmlns="http://jabber.org/protocol/pubsub#event">
    <items node="sensor/temperatuur">
      <item><entry>21.5°C</entry></item>
    </items>
  </event>
</message>
\`\`\``,

      toepassingen: `## Toepassingen

- **Instant messaging**: WhatsApp (tot 2016 op XMPP gebaseerd), Google Talk (voormalig), Cisco Jabber
- **IoT-communicatie**: Federatieve sensornetwerken via XMPP PubSub (XEP-0060)
- **Klantenservice-chat**: LiveHelp-systemen, support-widgets op websites
- **Bedrijfscommunicatie**: Interne messaging achter de firewall (Openfire, Prosody)
- **Gedistribueerde spelomgevingen**: Multi-user game-chat, aanwezigheidsinfo
- **Militaire/overheids-comms**: Beveiligde federatieve communicatie (XMPP met OMEMO)`,

      opties: `## Opties & Configuratie

### Verbindingsopties
| Optie | Beschrijving | Standaard |
|-------|-------------|-----------|
| \`host\` | XMPP-serverhostnaam | JID-domein |
| \`port\` | TCP-poort | 5222 |
| \`use_tls\` | Direct TLS inschakelen (port 5223) | false |
| \`use_starttls\` | STARTTLS upgraden | true |
| \`sasl_mechanisms\` | Authenticatiemechanismen | SCRAM-SHA-1 |
| \`resource\` | Apparaatresource (/telefoon, /laptop) | Willekeurig |

### Aanwezigheidstypen
| Type | Beschrijving |
|------|-------------|
| (geen) | Online / beschikbaar |
| \`away\` | Afwezig |
| \`xa\` | Langdurig afwezig (extended away) |
| \`dnd\` | Niet storen |
| \`unavailable\` | Offline |`,

      voorbeeld: `## Voorbeeld

### Python (slixmpp)
\`\`\`python
import slixmpp
import asyncio

class XMPPBot(slixmpp.ClientXMPP):
    def __init__(self, jid, wachtwoord):
        super().__init__(jid, wachtwoord)
        self.add_event_handler("session_start", self.start)
        self.add_event_handler("message",        self.ontvang_bericht)

    async def start(self, event):
        self.send_presence(pshow='chat', pstatus='Actief via LPW-demo')
        await self.get_roster()
        print("Verbonden als:", self.boundjid)

    def ontvang_bericht(self, msg):
        if msg['type'] in ('chat', 'normal'):
            print(f"Van {msg['from']}: {msg['body']}")
            msg.reply(f"Echo: {msg['body']}").send()

    def stuur_bericht(self, naar, tekst):
        self.send_message(mto=naar, mbody=tekst, mtype='chat')

bot = XMPPBot('bot@jabber.nl', 'wachtwoord')
bot.connect()
bot.process(forever=False)
\`\`\``
    }
  },

  stomp: {
    id: 'stomp', name: 'STOMP', fullName: 'Simple Text Oriented Messaging Protocol',
    version: 'v1.2', standard: 'Community specificatie',
    color: '#5D4037', transport: 'TCP / WebSocket', port: '61613 (ActiveMQ)',
    model: 'Frame-gebaseerd Pub/Sub', qos: 'Acknowledgement', security: 'TLS',
    category: 'Eenvoudig Messaging', idealFor: 'Snelle integratie, heterogene systemen, web-messaging',
    tags: ['Messaging', 'Tekst', 'WebSocket', 'Eenvoudig'],
    shortDesc: 'Eenvoudig tekstgebaseerd berichtenprotocol, vergelijkbaar met HTTP maar voor messaging — breed ondersteund via WebSocket.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#5D4037"/>
      <rect x="10" y="10" width="44" height="44" rx="3" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
      <line x1="14" y1="20" x2="50" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="26" x2="44" y2="26" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
      <line x1="14" y1="32" x2="40" y2="32" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
      <line x1="14" y1="38" x2="50" y2="38" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
      <line x1="14" y1="44" x2="36" y2="44" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
      <line x1="14" y1="50" x2="28" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

STOMP (Simple Text Oriented Messaging Protocol) is een eenvoudig, tekstgebaseerd berichtenprotocol ontworpen om te werken met berichtenmakelaars (brokers). Waar AMQP een complexe binaire standaard is, kiest STOMP voor maximale eenvoud: het protocol is leesbaar voor mensen en vergelijkbaar in structuur met HTTP.

STOMP wordt ondersteund door grote message brokers: **Apache ActiveMQ**, **RabbitMQ** (via plugin), **HiveMQ**, en **Artemis**. Het unieke voordeel is native ondersteuning voor **WebSocket**, wat directe browser-naar-broker communicatie mogelijk maakt.

**Versies:** STOMP 1.0, 1.1 (UTF-8, heartbeat), 1.2 (verbeterde ACK)`,

      werking: `## Werking

### Frame-structuur
Een STOMP-frame bestaat uit:
\`\`\`
COMMAND
header1:waarde1
header2:waarde2

Body (optioneel)^@
\`\`\`

### Commando's
| Commando | Richting | Beschrijving |
|---------|----------|-------------|
| \`CONNECT\` | Client→Broker | Verbinding openen |
| \`CONNECTED\` | Broker→Client | Verbinding bevestigd |
| \`SEND\` | Client→Broker | Bericht sturen naar bestemming |
| \`SUBSCRIBE\` | Client→Broker | Abonneren op bestemming |
| \`UNSUBSCRIBE\` | Client→Broker | Abonnement opzeggen |
| \`ACK\` | Client→Broker | Bericht bevestigen |
| \`NACK\` | Client→Broker | Bericht afwijzen (requeue) |
| \`MESSAGE\` | Broker→Client | Inkomend bericht |
| \`DISCONNECT\` | Client→Broker | Verbinding sluiten |

### Bestemming-formaten (broker-afhankelijk)
\`\`\`
/queue/bestellingen      ← Point-to-point wachtrij
/topic/nieuws            ← Pub/Sub topic (broadcast)
/temp-queue/antwoord     ← Tijdelijke antwoordwachtrij
\`\`\``,

      toepassingen: `## Toepassingen

- **React/Angular dashboards**: Realtime data via STOMP over WebSocket (SockJS)
- **Spring-applicaties**: Spring WebSocket + STOMP is de standaard voor Java web-push
- **Hybride cloudintegratie**: Koppelen van legacy Java-systemen met moderne web-frontends
- **IoT-prototyping**: Snelle berichtenstroom zonder complexe AMQP-configuratie
- **Notificatiesystemen**: Browser-notificaties via WebSocket-verbinding met broker`,

      opties: `## Opties & Configuratie

### CONNECT-frame headers
| Header | Beschrijving |
|--------|-------------|
| \`accept-version\` | Ondersteunde STOMP-versies (\`1.1,1.2\`) |
| \`host\` | Virtuele host van broker |
| \`login\` / \`passcode\` | Authenticatiegegevens |
| \`heart-beat\` | Heartbeat (\`uitgaand,inkomend\` in ms, bijv. \`10000,10000\`) |

### SUBSCRIBE-headers
| Header | Beschrijving |
|--------|-------------|
| \`destination\` | Bestemming (\`/queue/naam\` of \`/topic/naam\`) |
| \`id\` | Abonnement-ID voor ACK |
| \`ack\` | Bevestigingsmodus: \`auto\`, \`client\`, \`client-individual\` |`,

      voorbeeld: `## Voorbeeld

### JavaScript (browser — @stomp/stompjs)
\`\`\`javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
  connectHeaders: { login: 'gast', passcode: 'gast' },
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  reconnectDelay: 5000,

  onConnect: () => {
    console.log('Verbonden met broker');

    // Abonneren
    client.subscribe('/topic/berichten', (msg) => {
      const data = JSON.parse(msg.body);
      console.log('Ontvangen:', data);
      msg.ack();   // Handmatige bevestiging
    }, { ack: 'client-individual' });

    // Stuur bericht
    client.publish({
      destination: '/app/stuur',
      body: JSON.stringify({ tekst: 'Hallo via STOMP!' }),
      headers: { 'content-type': 'application/json' }
    });
  },

  onDisconnect: () => console.log('Verbroken')
});

client.activate();
\`\`\``
    }
  },

  dds: {
    id: 'dds', name: 'DDS', fullName: 'Data Distribution Service',
    version: 'DDS 1.4', standard: 'OMG DDS 1.4',
    color: '#C62828', transport: 'UDP (multicast/unicast)', port: 'Dynamisch',
    model: 'Brokerless Pub/Sub', qos: '23 QoS-beleidsinstellingen', security: 'DDS Security (TLS/DTLS)',
    category: 'Real-time Middleware', idealFor: 'Autonome voertuigen, defensie, medische apparatuur, robotica',
    tags: ['Real-time', 'Brokerless', 'UDP', 'QoS'],
    shortDesc: 'Hoge-prestatie, brokerless data-distributiemiddleware met uitgebreide QoS-beleidsopties voor missiekritieke real-time systemen.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#C62828"/>
      <circle cx="32" cy="32" r="20" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
      <circle cx="32" cy="32" r="12" stroke="white" stroke-width="2" fill="none" opacity="0.5"/>
      <circle cx="32" cy="32" r="4" fill="white"/>
      <circle cx="32" cy="12" r="4" fill="white" opacity="0.9"/>
      <circle cx="48" cy="42" r="4" fill="white" opacity="0.9"/>
      <circle cx="16" cy="42" r="4" fill="white" opacity="0.9"/>
      <line x1="32" y1="16" x2="32" y2="28" stroke="white" stroke-width="1.5" stroke-dasharray="3,2"/>
      <line x1="44.5" y1="39" x2="35.5" y2="33.7" stroke="white" stroke-width="1.5" stroke-dasharray="3,2"/>
      <line x1="19.5" y1="39" x2="28.5" y2="33.7" stroke="white" stroke-width="1.5" stroke-dasharray="3,2"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

DDS (Data Distribution Service) is een open, brokerless middleware-standaard voor real-time, hoge-prestatie data-distributie. Het werd gestandaardiseerd door de OMG (Object Management Group) en is de communicatiebackbone voor kritieke systemen waarbij latentie, betrouwbaarheid en determinisme essentieel zijn.

In tegenstelling tot MQTT en AMQP heeft DDS **geen centrale broker**: publishers en subscribers ontdekken elkaar dynamisch via **RTPS** (Real-Time Publish Subscribe Protocol). Dit maakt DDS uiterst schaalbaar en elimineert de single point of failure.

**Bekende implementaties:**
- **RTI Connext DDS** (commercieel, meest gebruikt)
- **Eclipse CycloneDDS** (open source, door ADLINK)
- **OpenDDS** (open source, OCI)
- **eProsima Fast DDS** (open source, ROS 2 standaard)`,

      werking: `## Werking

### Data-Centric Publish-Subscribe (DCPS)
DDS is **datacentrisch**: in plaats van berichten te sturen, publiceren writers updates naar een gedeeld **Global Data Space**. Readers filteren data op basis van topics en QoS.

### Kernconcepten
| Concept | Beschrijving |
|---------|-------------|
| **Topic** | Benoemde, getypeerde datastroom (bijv. \`Positie\`, \`Alarm\`) |
| **DataWriter** | Publiceert instanties van een topic |
| **DataReader** | Leest en filtert instanties van een topic |
| **DomainParticipant** | Beheert alle entiteiten binnen een DDS-domein |
| **Publisher/Subscriber** | Groepeert DataWriters/DataReaders |

### RTPS Auto-Discovery
\`\`\`
DomainParticipant A ──multicast──→ DomainParticipant B
                   ←── multicast ─
                   (automatische peer-detectie, geen broker)
\`\`\`

### QoS-beleid (selectie van 23 beleidsregels)
| QoS Beleid | Beschrijving |
|-----------|-------------|
| **RELIABILITY** | BEST_EFFORT of RELIABLE (met hertransmissie) |
| **DURABILITY** | VOLATILE, TRANSIENT_LOCAL, TRANSIENT, PERSISTENT |
| **HISTORY** | KEEP_LAST (N instanties) of KEEP_ALL |
| **DEADLINE** | Max. tijd tussen opeenvolgende publicaties |
| **LATENCY_BUDGET** | Maximale aanvaardbare latentie |
| **OWNERSHIP** | SHARED of EXCLUSIVE (één dominante writer) |`,

      toepassingen: `## Toepassingen

- **Autonome voertuigen**: ROS 2 (Robot Operating System) gebruikt DDS als middleware-backend — alle sensordata, commando's en diagnostiek
- **Militaire en defensiesystemen**: C4ISR, radarsystemen, luchtverkeersleiding (EUROCONTROL)
- **Medische apparatuur**: OK-robots, anesthesiemachines, infuuspompen (vereist deterministische communicatie)
- **Ruimtevaart**: Satellietbesturing, ruimtestationssystemen (NASA, ESA)
- **Industriële automatisering**: PLC-communicatie, SCADA-systemen
- **Simulaties**: Militaire en civiele trainingssimulatoren (HLA-protocol bovenop DDS)`,

      opties: `## Opties & Configuratie

### DomainParticipant QoS
| Optie | Beschrijving |
|-------|-------------|
| \`domain_id\` | Isolatiedomein (0-232), gescheiden communicatieruimtes |
| \`discovery\` | Auto-discovery via multicast of peer-lijst |
| \`transport\` | UDP unicast, UDP multicast, shared memory, TCP |

### Topic QoS-combinaties
\`\`\`xml
<!-- Betrouwbare, persistente telemetrie -->
<topic_qos>
  <reliability><kind>RELIABLE</kind></reliability>
  <durability><kind>TRANSIENT_LOCAL</kind></durability>
  <history><kind>KEEP_LAST</kind><depth>10</depth></history>
  <deadline><period><sec>1</sec></period></deadline>
</topic_qos>
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python (CycloneDDS)
\`\`\`python
from cyclonedds.domain import DomainParticipant
from cyclonedds.core import Qos, Policy
from cyclonedds.sub import DataReader, Subscriber
from cyclonedds.pub import DataWriter, Publisher
from cyclonedds.topic import Topic
from cyclonedds.idl import IdlStruct
from dataclasses import dataclass
import time

@dataclass
class Temperatuur(IdlStruct, typename="Sensor.Temperatuur"):
    sensor_id: str
    waarde:    float
    tijdstip:  int

# DDS Domain aanmaken
participant = DomainParticipant(0)

# Topic definiëren
qos = Qos(
    Policy.Reliability.Reliable(max_blocking_time=100),
    Policy.Durability.TransientLocal,
    Policy.History.KeepLast(10)
)
topic = Topic(participant, "Sensor/Temperatuur", Temperatuur, qos=qos)

# Publisher
pub    = Publisher(participant)
writer = DataWriter(pub, topic)

# Data publiceren
writer.write(Temperatuur("sensor_01", 21.5, int(time.time())))
print("Gepubliceerd: temperatuur 21.5°C")

# Subscriber
sub    = Subscriber(participant)
reader = DataReader(sub, topic)

# Polling (of gebruik WaitSet voor event-driven)
for sample in reader.take():
    print(f"[{sample.sensor_id}] {sample.waarde}°C @ {sample.tijdstip}")
\`\`\``
    }
  },

  lwm2m: {
    id: 'lwm2m', name: 'LwM2M', fullName: 'Lightweight Machine to Machine',
    version: 'LwM2M 1.2', standard: 'OMA SpecWorks',
    color: '#2E7D32', transport: 'CoAP / UDP', port: '5683 / 5684 (DTLS)',
    model: 'Client-Server (apparaatbeheer)', qos: 'CoAP CON/NON', security: 'DTLS / OSCORE',
    category: 'IoT Device Management', idealFor: 'Apparaatbeheer, firmware-updates, bootstrapping',
    tags: ['IoT', 'Device Management', 'CoAP', 'OMA'],
    shortDesc: 'OMA-standaard voor lichtgewicht IoT-apparaatbeheer via CoAP — inschrijving, monitoring, firmware-updates en configuratie.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#2E7D32"/>
      <rect x="20" y="12" width="24" height="40" rx="4" stroke="white" stroke-width="2.5" fill="none"/>
      <circle cx="32" cy="22" r="4" fill="white" opacity="0.9"/>
      <line x1="32" y1="26" x2="32" y2="34" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="28" y1="30" x2="36" y2="30" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="26" y1="44" x2="38" y2="44" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="26" y1="48" x2="34" y2="48" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
      <path d="M8 20 Q6 32 8 44" stroke="white" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
      <path d="M11 23 Q9 32 11 41" stroke="white" stroke-width="1.5" fill="none" opacity="0.7" stroke-linecap="round"/>
      <path d="M56 20 Q58 32 56 44" stroke="white" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
      <path d="M53 23 Q55 32 53 41" stroke="white" stroke-width="1.5" fill="none" opacity="0.7" stroke-linecap="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

LwM2M (Lightweight Machine to Machine) is een OMA SpecWorks-protocol voor het beheer van IoT-apparaten op afstand. Het is gebouwd op CoAP en DTLS en biedt een gestandaardiseerd **objectmodel** voor apparaatconfiguratie, monitoring en firmware-beheer.

Waar MQTT en CoAP primair over *datastromen* gaan, gaat LwM2M over *apparaatbeheer*: het inschrijven van een apparaat bij een server, het lezen/schrijven van configuratie, het uitvoeren van commando's en het updaten van firmware — alles via een gestandaardiseerde objecthiërarchie.

**Versies:**
- LwM2M 1.0 (2017): Basis
- LwM2M 1.1 (2019): OSCORE, TCP/TLS, JSON/CBOR
- LwM2M 1.2 (2020): MQTT-transport, gateway-support`,

      werking: `## Werking

### Objectmodel
LwM2M gebruikt een genummerd objectmodel:
\`\`\`
Object/Instantie/Resource

/3/0/0   → Apparaatnaam (Device/0/Manufacturer)
/3/0/1   → Modelnummer
/3/0/6   → Beschikbaar geheugen (bytes)
/5/0/0   → Firmware URI (Firmware Update/0/Package URI)
/5/0/3   → Firmware Update State
/1/0/0   → Short Server ID (LwM2M Server/0)
/1/0/1   → Levensduur registratie (seconden)
\`\`\`

### Interfaces
| Interface | Beschrijving |
|-----------|-------------|
| **Bootstrap** | Initiële configuratie (serveradres, beveiligingssleutels) |
| **Registration** | Apparaat meldt zich aan bij LwM2M-server |
| **Device Management** | Lezen, schrijven, uitvoeren van objecten |
| **Information Reporting** | Observeren van objecten, periodieke rapportage |

### Registratieflow
\`\`\`
Client → POST /rd?ep=apparaat01&lt=3600   (registreer, lifetime 1 uur)
Server ← 2.01 Created /rd/abc123           (registratie-ID)

Client → PUT /rd/abc123                    (herregistreer voor vervaltijd)
Server ← 2.04 Changed
\`\`\``,

      toepassingen: `## Toepassingen

- **Slimme meters (DLMS/COSEM + LwM2M)**: Energiebedrijven voor remote meter management
- **Cellular IoT beheer**: NB-IoT en LTE-M apparaten beheerd door telecomproviders
- **Industriële sensoren**: Fabriekssensoren met remote configuratie en firmware-updates
- **Smart City infrastructuur**: Straatverlichting, verkeerssensoren, luchtkwaliteitsmeters
- **Zorgapparaten**: Draagbare medische IoT-apparaten met FOTA (Firmware Over The Air)
- **Lokale overheid**: Waterkwaliteitsmonitoring, rioolsensoren`,

      opties: `## Opties & Configuratie

### Server-objectparameters (/1/x)
| Resource | ID | Beschrijving |
|----------|----|-------------|
| Short Server ID | 0 | Unieke server-ID |
| Lifetime | 1 | Registratiegeldigheid (seconden) |
| Default Minimum Period | 2 | Min. rapportagefrequentie |
| Default Maximum Period | 3 | Max. rapportagefrequentie |
| Notification Storing | 6 | Meldingen opslaan bij verbindingsverlies |
| Binding | 7 | \`U\` = UDP, \`T\` = TCP, \`S\` = SMS |

### Firmware Update Objectstatus (/5/0/3)
| Waarde | Status |
|--------|--------|
| 0 | Idle |
| 1 | Downloading |
| 2 | Downloaded |
| 3 | Updating |`,

      voorbeeld: `## Voorbeeld

### Python (aiocoap LwM2M client basis)
\`\`\`python
import asyncio
import aiocoap
import aiocoap.resource as resource
import json

class ApparaatObject(resource.Resource):
    """LwM2M Object 3 — Device Information"""

    async def render_get(self, request):
        data = {
            "manufacturer": "LPW Demo",
            "model_number": "v1.0",
            "firmware_version": "1.2.3",
            "free_memory": 65536
        }
        return aiocoap.Message(
            code=aiocoap.CONTENT,
            payload=json.dumps(data).encode(),
            content_format=50  # application/json
        )

class FirmwareObject(resource.Resource):
    """LwM2M Object 5 — Firmware Update"""
    state = 0  # 0=Idle

    async def render_put(self, request):
        uri = request.payload.decode()
        print(f"Firmware URI ontvangen: {uri}")
        self.state = 1  # Downloading
        return aiocoap.Message(code=aiocoap.CHANGED)

    async def render_get(self, request):
        return aiocoap.Message(
            code=aiocoap.CONTENT,
            payload=str(self.state).encode()
        )

async def registreer_bij_server():
    """Registreer het apparaat bij LwM2M server"""
    protocol = await aiocoap.Context.create_client_context()

    # Stuur registratieverzoek
    reg_payload = b"</3/0>,</5/0>"  # Aangeboden objecten
    req = aiocoap.Message(
        code=aiocoap.POST,
        uri='coap://lwm2m-server.local/rd?ep=lpw-demo-001&lt=3600&b=U',
        payload=reg_payload
    )
    req.opt.content_format = 40  # application/link-format

    resp = await protocol.request(req).response
    print(f"Registratiestatus: {resp.code}")

# Server opzetten
async def run():
    root = resource.Site()
    root.add_resource(['3', '0'], ApparaatObject())
    root.add_resource(['5', '0'], FirmwareObject())

    await aiocoap.Context.create_server_context(root)
    await registreer_bij_server()
    await asyncio.get_event_loop().create_future()

asyncio.run(run())
\`\`\``
    }
  },

  mqttsn: {
    id: 'mqttsn', name: 'MQTT-SN', fullName: 'MQTT for Sensor Networks',
    version: 'v1.2 (2013)', standard: 'IBM / OASIS (draft)',
    color: '#6A1B9A', transport: 'UDP / Zigbee / BLE', port: '1884 (UDP)',
    model: 'Pub/Sub via Gateway', qos: 'QoS 0, 1, 2, -1', security: 'DTLS (via gateway)',
    category: 'Ultra-lichtgewicht IoT', idealFor: 'Batterijgevoede sensoren, Zigbee, sub-GHz netwerken',
    tags: ['IoT', 'Ultra-light', 'Sensoren', 'Zigbee'],
    shortDesc: 'Ultra-lichtgewichte MQTT-variant voor sensoren op niet-TCP-netwerken zoals Zigbee, UDP en BLE — via gateway naar standaard MQTT.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#6A1B9A"/>
      <rect x="24" y="28" width="16" height="20" rx="3" fill="white" opacity="0.9"/>
      <line x1="28" y1="32" x2="36" y2="32" stroke="#6A1B9A" stroke-width="1.5"/>
      <line x1="28" y1="36" x2="36" y2="36" stroke="#6A1B9A" stroke-width="1.5"/>
      <line x1="28" y1="40" x2="33" y2="40" stroke="#6A1B9A" stroke-width="1.5"/>
      <path d="M32 10 Q32 16 32 24" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      <path d="M24 14 Q20 20 24 24" stroke="white" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>
      <path d="M40 14 Q44 20 40 24" stroke="white" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>
      <path d="M18 10 Q12 20 18 24" stroke="white" stroke-width="1.5" fill="none" opacity="0.4" stroke-linecap="round"/>
      <path d="M46 10 Q52 20 46 24" stroke="white" stroke-width="1.5" fill="none" opacity="0.4" stroke-linecap="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

MQTT-SN (MQTT for Sensor Networks) is een lichtgewichte variant van MQTT ontworpen voor netwerken zonder TCP-ondersteuning, zoals **Zigbee**, **Bluetooth Low Energy (BLE)**, **Z-Wave**, **6LoWPAN** en UDP-gebaseerde sub-GHz-netwerken. Het werd ontwikkeld door IBM's Andy Stanford-Clark (dezelfde ontwikkelaar als het originele MQTT).

Het belangrijkste verschil met standaard MQTT is dat MQTT-SN geen TCP-verbinding vereist — het werkt over UDP en andere datagram-protocollen. Topics worden vervangen door korte numerieke **Topic ID's** om bandbreedte te minimaliseren. Een gateway (transparant of aggregerend) vertaalt MQTT-SN-berichten naar standaard MQTT.

**Kernvereenvoudigingen vs. MQTT:**
- Topic ID's (2 bytes) ipv volledige topic-strings
- Voorgeprogrammeerde topics (geen topic-registratie nodig)
- Slaapstand-ondersteuning voor batterijgevoede apparaten
- QoS -1 (publish zonder verbinding, fire-and-forget)`,

      werking: `## Werking

### Gateway-architectuur
\`\`\`
[Sensor] ─── MQTT-SN/UDP ──→ [Gateway] ─── MQTT/TCP ──→ [Broker]
[Sensor] ─── MQTT-SN/Zigbee ─→ [Gateway]
\`\`\`

**Transparante gateway**: Eén MQTT-verbinding per MQTT-SN client
**Aggregerende gateway**: Één MQTT-verbinding voor alle MQTT-SN clients (schaalbaarder)

### Topic-registratie
\`\`\`
Client → REGISTER (topic="huis/temp", msgId=1)
Broker ← REGACK  (topicId=5, msgId=1)
Client → PUBLISH (topicId=5, data="21.5")  ← gebruikt kort ID
\`\`\`

### Slaapstand
\`\`\`
Client → DISCONNECT (duration=600)   ← slaap 10 minuten
Gateway buffert inkomende berichten

Client → CONNECT (cleanSession=false)
Gateway → Gebufferde berichten afleveren
\`\`\`

### QoS -1 (Fire and Forget)
Publish zonder verbinding of handshake — minimale energie, geen garantie:
\`\`\`
Sensor → PUBLISH (QoS=-1, topicId=5, data="21.5")
         (geen verbindingsopbouw vereist!)
\`\`\``,

      toepassingen: `## Toepassingen

- **Zigbee-sensornetwerken**: Temperatuur-, vochtigheid- en bewegingssensoren in gebouwen
- **Landbouwsensornetwerken**: Veldmonitoring met sub-GHz radios (868/915 MHz)
- **Industriële draadloze netwerken**: WirelessHART-achtige systemen
- **Slimme gebouwen**: Energiebeheer met batterijgevoede sensoren op Zigbee 3.0
- **Smart metering sub-netwerken**: Kortst-mogelijk berichten voor MBus-achtige toepassingen`,

      opties: `## Opties & Configuratie

### CONNECT-pakketopties
| Veld | Beschrijving | Grootte |
|------|-------------|---------|
| \`Flags\` | Will, CleanSession, TopicIdType | 1 byte |
| \`ProtocolId\` | Altijd 0x01 | 1 byte |
| \`Duration\` | Keep-alive in seconden | 2 bytes |
| \`ClientId\` | Unieke client-ID (1-23 tekens) | Variabel |

### PUBLISH-vlaggen
| Vlag | Beschrijving |
|------|-------------|
| \`DUP\` | Duplicaat-bericht (bij hertransmissie) |
| \`QoS\` | -1, 0, 1, of 2 |
| \`Retain\` | Bewaar op gateway/broker |
| \`Will\` | Will-bericht aanwezig |
| \`TopicIdType\` | 0=geregistreerd, 1=voorgeprogrammeerd, 2=kort topic |`,

      voorbeeld: `## Voorbeeld

### Python (paho MQTT-SN via UDP gateway)
\`\`\`python
import socket
import struct
import time

GATEWAY_IP   = '192.168.1.100'
GATEWAY_PORT = 1884
CLIENT_ID    = b'sensor001'

def mqtt_sn_publish(sock, topic_id, payload, qos=0):
    """MQTT-SN PUBLISH pakket samenstellen"""
    payload_bytes = payload.encode() if isinstance(payload, str) else payload
    flags = (qos & 0x03) << 5
    length = 7 + len(payload_bytes)

    pakket = struct.pack(
        '!BBBHB',
        length,          # Length
        0x0C,            # Msg type: PUBLISH
        flags,           # Flags
        topic_id,        # Topic ID (2 bytes)
        1                # MsgId
    ) + payload_bytes

    sock.sendto(pakket, (GATEWAY_IP, GATEWAY_PORT))
    print(f"Gepubliceerd (topicId={topic_id}): {payload}")

def mqtt_sn_connect(sock):
    """MQTT-SN CONNECT pakket"""
    length = 6 + len(CLIENT_ID)
    pakket = struct.pack('!BBBBH', length, 0x04, 0x04, 0x01, 60) + CLIENT_ID
    sock.sendto(pakket, (GATEWAY_IP, GATEWAY_PORT))

    # Wacht op CONNACK
    data, _ = sock.recvfrom(64)
    print("CONNACK ontvangen:", data.hex())

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(5)

mqtt_sn_connect(sock)

# Publiceer elke 30 seconden
for i in range(5):
    mqtt_sn_publish(sock, topic_id=5, payload=f"temp={20+i*0.5:.1f}")
    time.sleep(30)

sock.close()
\`\`\``
    }
  },

  lorawan: {
    id: 'lorawan', name: 'LoRaWAN', fullName: 'Long Range Wide Area Network',
    version: 'LoRaWAN 1.0.4 / 1.1', standard: 'LoRa Alliance',
    color: '#00695C', transport: 'LoRa RF (radio)', port: 'EU868 / US915 / AS923',
    model: 'Ster-van-sterren topologie', qos: 'Confirmed / Unconfirmed', security: 'AES-128 (sessie + netwerk)',
    category: 'LPWAN', idealFor: 'Lange afstand, lage datarate, batterijgevoede IoT',
    tags: ['LPWAN', 'Radio', 'Lange afstand', 'Energiezuinig'],
    shortDesc: 'Lage-vermogen, lange-afstand radio-WAN protocol voor IoT over kilometers bereik met jarenlange batterijlevensduur.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#00695C"/>
      <line x1="32" y1="50" x2="32" y2="32" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M22 42 Q16 32 22 22" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M42 42 Q48 32 42 22" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M15 48 Q6 32 15 16" stroke="white" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>
      <path d="M49 48 Q58 32 49 16" stroke="white" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>
      <path d="M8 54 Q-2 32 8 10" stroke="white" stroke-width="1.5" fill="none" opacity="0.35" stroke-linecap="round"/>
      <path d="M56 54 Q66 32 56 10" stroke="white" stroke-width="1.5" fill="none" opacity="0.35" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="3" fill="white"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

LoRaWAN (Long Range Wide Area Network) is een LPWAN-protocol (Low Power Wide Area Network) beheerd door de LoRa Alliance. Het combineert **LoRa** (de fysieke laag — een chirped spread-spectrum radiomodulatie van Semtech) met een MAC-laagprotocol voor netwerkcommunicatie.

LoRaWAN biedt een unieke combinatie van eigenschappen die geen ander protocol heeft: bereik van **2-15 km** (stedelijk) tot **45+ km** (landelijk), batterijlevensduur van **5-10 jaar**, en datarates van **250 bps tot 50 kbps**. Het wordt ingezet via het wereldwijde **The Things Network (TTN)** en commerciële netwerken zoals **KPN LoRa** in Nederland.

**Frequentiebanden:**
- EU868: 868 MHz (Europa)
- US915: 915 MHz (Noord-Amerika)
- AU915: 915 MHz (Australië)
- AS923: 923 MHz (Azië)`,

      werking: `## Werking

### Netwerktopologie
\`\`\`
[End Device] ─── LoRa RF ──→ [Gateway] ─── TCP/IP ──→ [Network Server] ──→ [Application Server]
              (1-15 km)                              (TTN, ChirpStack)
\`\`\`

Gateways zijn transparant: end-devices communiceren logisch met de Network Server.

### Apparaatklassen
| Klasse | Beschrijving | Downlink | Verbruik |
|--------|-------------|----------|---------|
| **A** | Downlink alleen na uplink (2 korte vensters) | Na TX | Minimaal (standaard) |
| **B** | Regelmatige beacon-gesynchroniseerde vensters | Gepland | Matig |
| **C** | Continu luisteren (behalve tijdens TX) | Altijd | Hoog |

### Activatiemethoden
| Methode | Beschrijving |
|---------|-------------|
| **OTAA** (Over-The-Air Activation) | Apparaat voert join-procedure uit; sleutels worden dynamisch afgeleid |
| **ABP** (Activation By Personalization) | Sleutels hard gecodeerd; eenvoudiger maar minder veilig |

### Spreading Factor (SF)
| SF | Datarate | Bereik | Luchtijd |
|----|----------|--------|---------|
| SF7 | ~5.5 kbps | ~2 km | Kort |
| SF9 | ~1.8 kbps | ~5 km | Middel |
| SF12 | ~250 bps | ~15 km | Lang |`,

      toepassingen: `## Toepassingen

- **Slimme meters (gas/water/elektriciteit)**: Automatische meterstandopname zonder internet bij de meter
- **Precisielandbouw**: Bodemvochtigheid, temperatuur, bladnatmeting op akkers
- **Asset tracking**: Containers, fietsen, pallets — positiebepaling via GPS + LoRaWAN
- **Smart City**: Vuilcontainervulling, parkeerplaatsbezetting, luchtkwaliteit
- **Waterkeringen en -kwaliteit**: Waterpeil, lekdetectie in drinkwaternetwerken (Waterbedrijven NL)
- **Stadsverwarming**: Warmteafname meten in verwarmingsnetwerken
- **Vlottende dieren**: GPS-tags op koeien, schapen, wilde dieren`,

      opties: `## Opties & Configuratie

### OTAA Join-parameters
| Parameter | Beschrijving |
|-----------|-------------|
| \`DevEUI\` | 64-bit uniek apparaat-ID (EUI-64 formaat) |
| \`AppEUI\` / \`JoinEUI\` | 64-bit applicatie-ID |
| \`AppKey\` | 128-bit root sleutel (AES-128) |

### Sessie-sleutels (na join)
| Sleutel | Gebruik |
|---------|---------|
| \`NwkSKey\` | Netwerk-sessie sleutel (MAC-integriteit) |
| \`AppSKey\` | Applicatie-sessie sleutel (payload-encryptie) |

### Transmissie-instellingen
| Parameter | Waarden | Beschrijving |
|-----------|---------|-------------|
| Spreading Factor | SF7–SF12 | Trade-off: bereik vs. datarate |
| Bandbreedte | 125 kHz, 250 kHz, 500 kHz | Hogere BW = hogere datarate |
| TX Power | 2–16 dBm (EU868) | Vermogen aanpassing |
| ADR | Aan/uit | Adaptive Data Rate (netwerk optimaliseert automatisch) |`,

      voorbeeld: `## Voorbeeld

### MicroPython op LoRa-module (TTGO/LoPy)
\`\`\`python
from network import LoRa
import socket
import binascii
import struct
import time

# LoRaWAN OTAA initialiseren
lora = LoRa(mode=LoRa.LORAWAN, region=LoRa.EU868)

# OTAA-sleutels (ophalen van TTN Console)
app_eui = binascii.unhexlify('0000000000000000')
app_key = binascii.unhexlify('00000000000000000000000000000000')

# Join via OTAA
lora.join(activation=LoRa.OTAA, auth=(app_eui, app_key), timeout=0)

print("Wachten op LoRaWAN-verbinding...")
while not lora.has_joined():
    time.sleep(2.5)
    print('.', end='')
print("\\nVerbonden!")

# LoRaWAN socket openen
s = socket.socket(socket.AF_LORA, socket.SOCK_RAW)
s.setsockopt(socket.SOL_LORA, socket.SO_DR, 5)      # Data Rate 5 (SF7, 125kHz)
s.setsockopt(socket.SOL_LORA, socket.SO_CONFIRMED, False)  # Unconfirmed uplink

try:
    while True:
        # Payload samenstellen (5 bytes: 2x temperatuur als int16, 1x batterij)
        temp     = 215          # 21.5 °C × 10
        vochtig  = 650          # 65.0 % × 10
        batterij = 85           # 85%

        payload = struct.pack('>hhB', temp, vochtig, batterij)

        # Versturen
        s.setblocking(True)
        s.send(payload)
        print(f"Verzonden: temp={temp/10}°C, vocht={vochtig/10}%, bat={batterij}%")
        s.setblocking(False)

        # Downlink-venster afwachten
        time.sleep(3)
        try:
            data = s.recv(64)
            if data:
                print(f"Downlink ontvangen: {binascii.hexlify(data)}")
        except:
            pass

        # Luchtijdlimieten respecteren: 1% duty cycle EU868
        time.sleep(297)  # ~5 minuten wachten

finally:
    s.close()
\`\`\`

### The Things Network (TTN) Payload Decoder (JavaScript)
\`\`\`javascript
// Decoder in TTN Console (Application > Payload Formatters)
function decodeUplink(input) {
  const bytes = input.bytes;

  if (bytes.length < 5) return { errors: ['Te korte payload'] };

  // Lees int16 big-endian waarden
  const temp    = (bytes[0] << 8 | bytes[1]) / 10;   // °C
  const vochtig = (bytes[2] << 8 | bytes[3]) / 10;   // %
  const bat     = bytes[4];                            // %

  return {
    data: {
      temperatuur: temp,
      vochtigheid: vochtig,
      batterij:    bat,
      eenheid_temp: "°C",
      eenheid_vocht: "%RH"
    },
    warnings: bat < 20 ? ['Batterij bijna leeg!'] : []
  };
}
\`\`\``
    }
  }
};
