# Voorbeelden — werkende demo-apps

Deze map bevat **echte, draaiende voorbeeld-apps** bij het LPW-overzicht van
lichtgewicht internetprotocollen. Elke app is een complete client voor één
protocol, in dezelfde look-and-feel als de `twtxt`-app: [Vanilla Framework](https://vanillaframework.io/)
4.59 + Ubuntu-lettertype, vier thema's (Ubuntu / Donker / Suru / Aubergine),
lokale accountregistratie, in-app toasts en Android-systeemnotificaties.

Elke app:

- draait **direct in de browser** (geen build nodig) én is een **Capacitor 8**-project
  dat tot een Android-APK bouwt (zelfde workflow als twtxt);
- heeft een **Logboek**-tab die de ruwe protocol-frames/-pakketten live toont;
- komt met een **lokaal servertje/broker** zodat je de app meteen "in actie" kunt zien,
  zonder afhankelijk te zijn van een publieke server.

De onderstaande schermafbeeldingen zijn **echt**: ze zijn vastgelegd terwijl de
apps draaiden tegen de meegeleverde lokale servers (twee gebruikers die met
elkaar praten), met headless Chromium.

---

## 1. WebSocket — `websocket/`

Ruwe **WebSocket (RFC 6455)**-client, volledig zonder externe JS-afhankelijkheden.
Berichten reizen als JSON-frame `{sender,text,ts}`, zodat afzender en `@mentions`
werken met zowel een **echo-server** als een **broadcast-server** (groepschat).

| Berichten (live groepschat) | Logboek (ruwe frames) |
|---|---|
| ![WebSocket — berichtenfeed](screenshots/websocket-berichten.png) | ![WebSocket — ruwe frames](screenshots/websocket-berichten-log.png) |

```bash
cd voorbeeld/websocket
npm install ws && node server.js         # ws://localhost:8091 (broadcast)
cd www && python3 -m http.server 8090    # open http://localhost:8090
```

Meer: [`websocket/README.md`](websocket/README.md)

---

## 2. STOMP — `stomp/`

**STOMP 1.2**-client over WebSocket, met een eigen afhankelijkheidsvrije
STOMP-implementatie (`www/js/stomp.js`): CONNECT/CONNECTED, SUBSCRIBE, SEND,
MESSAGE, RECEIPT, heart-beating. Pub/sub op destinations zoals `/topic/algemeen`.

| Berichten (pub/sub) | Kanalen (subscriptions) | Logboek (STOMP-frames) |
|---|---|---|
| ![STOMP — berichtenfeed](screenshots/stomp-berichten.png) | ![STOMP — kanalen](screenshots/stomp-kanalen.png) | ![STOMP — frames](screenshots/stomp-logboek.png) |

Bouwt ook tot een APK via de workflow [`.github/workflows/stomp-apk.yml`](../.github/workflows/stomp-apk.yml).

Meer: [`stomp/README.md`](stomp/README.md)

---

## 3. MQTT — `mqtt/`

**MQTT 3.1.1 / 5.0**-client over WebSocket met de meegeleverde
[MQTT.js](https://github.com/mqttjs/MQTT.js) 5 (`www/js/mqtt.min.js`).
Publiceren met **topic + QoS (0/1/2) + retain**, abonneren op topic-filters met
`+`/`#`-wildcards. Payloads mogen telemetrie-JSON (`{"temp":21.5}`) of chat zijn.

| Berichten (telemetrie + chat) | Logboek (MQTT-pakketten) |
|---|---|
| ![MQTT — berichtenfeed](screenshots/mqtt-berichten.png) | ![MQTT — pakketten](screenshots/mqtt-logboek.png) |

```bash
cd voorbeeld/mqtt
npm install && node broker.js            # ws://localhost:8888 (Aedes)
cd www && python3 -m http.server 8090    # open http://localhost:8090
```

Meer: [`mqtt/README.md`](mqtt/README.md)

---

## Overzicht

| App | Protocol | Standaard | Afhankelijkheden | Lokale server |
|-----|----------|-----------|------------------|----------------|
| `websocket/` | WebSocket | RFC 6455 | geen (browser-API) | `server.js` (ws, broadcast) |
| `stomp/` | STOMP | 1.2 | geen (eigen client) | mini-broker in docs |
| `mqtt/` | MQTT | 3.1.1 / 5.0 | MQTT.js 5 (meegeleverd) | `broker.js` (Aedes + WebSocket) |

> **Android-APK:** elke app bouwt met
> `npm install && npx cap add android && npx cap sync && cd android && ./gradlew assembleDebug`.
> Vereist Node.js, Android SDK en JDK 21+ (Capacitor 8). De `android/`-map wordt
> gegenereerd en is niet ingecheckt.

### Hoe de schermafbeeldingen zijn gemaakt

De `screenshots/` zijn geen mockups. Per app is de lokale server gestart, zijn
twee accounts aangemaakt in afzonderlijke browsersessies, en hebben die met
elkaar gecommuniceerd via het echte protocol; daarna is elke view vastgelegd
met headless Chromium (viewport 390×844, 2×). Het Logboek toont dus de
werkelijke frames/pakketten die over de verbinding gingen.
