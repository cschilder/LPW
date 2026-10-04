# Voorbeelden — 25 werkende demo-apps

Deze map bevat voor **elk** van de 25 protocollen uit de LPW-gids een werkende app.
Alle apps hebben dezelfde look-and-feel als de `twtxt`-app: [Vanilla Framework](https://vanillaframework.io/)
4.59, het Ubuntu-lettertype, vier thema's, één gedeeld lokaal account en een
**Logboek**-tab met de échte frames en pakketten.

Open **[`index.html`](index.html)** voor het overzicht met alle demo's:

![Demo-overzicht](screenshots/demo-overzicht.png)

Alles draait op gewone **PHP-webhosting** (zoals Strato) zonder Node, zonder eigen
poorten en zonder build-stap. Zie **[STRATO.md](STRATO.md)** voor de git-commando's om
alles op je eigen hosting te zetten.

---

## Hoe werkt het?

Een browser kan geen ruwe TCP- of UDP-verbindingen openen. Daarom zijn er vier soorten demo's:

| Soort | Hoe | Demo's |
|---|---|---|
| **PHP-brug** | `api/<protocol>.php` spreekt het echte protocol (TCP, UDP of TLS) per verzoek namens je browser en geeft een trace terug voor het Logboek | Gopher, Gemini, Spartan, Titan, Guppy, Nex, Finger, Misfin, CoAP, LwM2M, AMQP, HTTP/2, HTTP/3, MQTT-SN |
| **Browser** | de browser praat zelf met een publieke server via WebSocket | MQTT, WebSocket, STOMP, XMPP, Nostr |
| **Publiceert** | de PHP-generator schrijft echte bestanden naar `publiek/`, die iedereen kan volgen of lezen | Twtxt, Gemlog, Phlog (glog), Bashblog |
| **Simulatie** | er is geen publiek netwerk dat een browser kan bereiken, maar de bytes en de crypto zijn echt | LoRaWAN (AES-CMAC/MIC getest met RFC 4493-vectoren), DDS (RTPS-bytes identiek aan Cyclone DDS) |

De bruggen zijn afgeschermd:

- Ze accepteren alleen publieke IP-adressen en verbinden met het opgezochte IP, zodat er geen SSRF naar je eigen netwerk mogelijk is.
- Per protocol is er een poort-allowlist.
- CR/LF wordt gestript, er gelden time-outs, een maximale antwoordgrootte en een rate limit per minuut.
- Publiceren vereist het **beheerwachtwoord** uit `api/config.php`.

```
voorbeeld/
  index.html         overzicht van alle demo's
  _kern/             gedeelde opmaak (kern.css) en app-schil (kern.js, browser.js, blogapp.js)
  api/               PHP-bruggen + _lib.php (beveiliging) + diag.php + config.example.php
  publiek/           door twtxt/gemlog/phlog/bashblog gegenereerde bestanden (niet in git)
  <protocol>/        index.html + app.js per demo
  mqtt/ stomp/ websocket/   Capacitor-apps (bouwen ook tot Android-APK), web-versie in www/
  screenshots/       echte schermafbeeldingen
```

---

## IoT en netwerk

### MQTT · `mqtt/www/`
Publiceren met topic, QoS en retain, en abonneren met `+`/`#`. Standaard gebruikt de app de publieke broker `wss://broker.hivemq.com:8884/mqtt`.

| Berichten | Topics | Logboek |
|---|---|---|
| ![](screenshots/mqtt-berichten.png) | ![](screenshots/mqtt-topics.png) | ![](screenshots/mqtt-logboek.png) |

### CoAP · `coap/`
GET, PUT, POST en DELETE via een UDP-brug (RFC 7252). Ondersteunt CON-hertransmissie, separate responses, Block1/Block2 en ontdekken via `/.well-known/core`. Standaard: `coap://coap.me`.

| Ontdekken | Block2 | Separate response | Logboek |
|---|---|---|---|
| ![](screenshots/coap-ontdekken.png) | ![](screenshots/coap-block2.png) | ![](screenshots/coap-separate-response.png) | ![](screenshots/coap-logboek.png) |

### WebSocket · `websocket/www/`
Een ruwe RFC 6455-client. Standaard gebruikt de app de echo-server `wss://echo.websocket.events`.

| Berichten | Logboek |
|---|---|
| ![](screenshots/websocket-berichten.png) | ![](screenshots/websocket-berichten-log.png) |

### AMQP · `amqp/`
Een AMQP 0-9-1-client met exchanges, bindings, publisher confirms en `Basic.Get`. Werkt met elke broker, bijvoorbeeld het gratis plan van CloudAMQP of LavinMQ.

| Verbinding | Publiceren | Ophalen | Logboek |
|---|---|---|---|
| ![](screenshots/amqp-verbinding.png) | ![](screenshots/amqp-publiceren.png) | ![](screenshots/amqp-ophalen.png) | ![](screenshots/amqp-logboek.png) |

### HTTP/2 · `http2/`
Meet echt het verschil tussen multiplexing over één verbinding en HTTP/1.1 met meerdere verbindingen (curl_multi), en toont dat als watervaldiagram.

| Waterval | Vergelijking | Jouw browser |
|---|---|---|
| ![](screenshots/http2-waterval.png) | ![](screenshots/http2-vergelijking.png) | ![](screenshots/http2-jouw-browser.png) |

### HTTP/3 · `http3/`
Toont de `Alt-Svc`-advertentie en een QUIC-versieonderhandelingsprobe over UDP. Als curl van de server h3 ondersteunt, doet de app ook een echt h3-verzoek.

| QUIC | Logboek |
|---|---|
| ![](screenshots/http3-quic.png) | ![](screenshots/http3-logboek.png) |

### XMPP · `xmpp/`
Chat over WebSocket (RFC 7395), met inloggen of registreren (XEP-0077), roster, presence en berichten. Je hebt een server nodig met WebSocket-ondersteuning.

| Account | Contacten | Chat | Logboek |
|---|---|---|---|
| ![](screenshots/xmpp-account.png) | ![](screenshots/xmpp-contacten.png) | ![](screenshots/xmpp-chat.png) | ![](screenshots/xmpp-logboek.png) |

### STOMP · `stomp/www/`
STOMP 1.2 over WebSocket met een eigen client. Werkt met bijvoorbeeld RabbitMQ (`rabbitmq_web_stomp`) of ActiveMQ.

| Berichten | Kanalen | Logboek |
|---|---|---|
| ![](screenshots/stomp-berichten.png) | ![](screenshots/stomp-kanalen.png) | ![](screenshots/stomp-logboek.png) |

### DDS · `dds/`
Een QoS-simulator: RELIABLE en BEST_EFFORT, TRANSIENT_LOCAL voor late joiners en matching (`REQUESTED_INCOMPATIBLE_QOS`). Het laatste sample wordt gecodeerd als echt RTPS 2.5-pakket. De app bevat ook een werkend Cyclone DDS-script in Python.

| Simulatie | Incompatibel | RTPS-bytes |
|---|---|---|
| ![](screenshots/dds-simulatie.png) | ![](screenshots/dds-incompatibel.png) | ![](screenshots/dds-rtps.png) |

### LwM2M · `lwm2m/`
De app gedraagt zich als LwM2M-apparaat en doet register, update en deregister via CoAP. Standaard registreert hij bij de publieke sandbox `leshan.eclipseprojects.io`.

| Geregistreerd | Objecten | Logboek |
|---|---|---|
| ![](screenshots/lwm2m-geregistreerd.png) | ![](screenshots/lwm2m-objecten.png) | ![](screenshots/lwm2m-logboek.png) |

### MQTT-SN · `mqttsn/`
Een sensor die publiceert (ook QoS −1) en abonneert via UDP. Je hebt een MQTT-SN-gateway nodig; `mqttsn/gateway.js` is er een in Node.js, die je bijvoorbeeld op een Raspberry Pi of VPS draait.

| Publiceren | Abonneren | Pakketbouwer |
|---|---|---|
| ![](screenshots/mqttsn-publiceren.png) | ![](screenshots/mqttsn-abonneren.png) | ![](screenshots/mqttsn-pakketbouwer.png) |

### LoRaWAN · `lorawan/`
Bouwt een uplink met AES-versleuteling en MIC (AES-CMAC), decodeert en controleert PHYPayloads, en berekent de airtime per SF. De uitvoer is byte-identiek aan `lora-packet`.

| Uplink | Decoder | Airtime |
|---|---|---|
| ![](screenshots/lorawan-uplink.png) | ![](screenshots/lorawan-decoder.png) | ![](screenshots/lorawan-airtime.png) |

---

## Het kleine internet

| Gopher | Gemini (TOFU) | Spartan | Nex | Guppy (UDP) |
|---|---|---|---|---|
| ![](screenshots/gopher-bladeren.png) | ![](screenshots/gemini-bladeren.png) | ![](screenshots/spartan-gastenboek.png) | ![](screenshots/nex-bladeren.png) | ![](screenshots/guppy-bladeren.png) |

| Titan (upload) | Finger | Misfin (mail) | Nostr | Twtxt |
|---|---|---|---|---|
| ![](screenshots/titan-upload.png) | ![](screenshots/finger-opvragen.png) | ![](screenshots/misfin-opstellen.png) | ![](screenshots/nostr-feed.png) | ![](screenshots/twtxt-tijdlijn.png) |

| Gemlog | Phlog (glog) | Bashblog | Bashblog-resultaat | Gemini-capsules |
|---|---|---|---|---|
| ![](screenshots/gemlog-schrijven.png) | ![](screenshots/glog-mijn-phlog.png) | ![](screenshots/bashblog-schrijven.png) | ![](screenshots/bashblog-blog.png) | ![](screenshots/gemini-capsules.png) |

- **Gopher, Gemini, Spartan, Nex, Guppy** zijn volwaardige browsers met bladwijzers, zoeken (type 7 / status 1x), de `?url=`-parameter en doorverwijzingen tussen de apps. Gemini bewaart certificaatvingerafdrukken (TOFU).
- **Titan** uploadt naar een Gemini-capsule, met een token. **Spartan** ondersteunt uploads, bijvoorbeeld een gastenboek.
- **Finger** vraagt gebruikers en `.plan`-bestanden op.
- **Misfin** maakt een eigen identiteitscertificaat (CN, UID en SAN) en verstuurt mail over TLS-poort 1958.
- **Nostr** maakt sleutels (NIP-01), plaatst ondertekende notes en leest meerdere relays, rechtstreeks vanuit de browser.
- **Twtxt** volgt feeds en publiceert je eigen `publiek/twtxt.txt`, zodat anderen je kunnen volgen.
- **Gemlog** publiceert `index.gmi` en `atom.xml`, **Phlog** een gophermap, en **Bashblog** HTML-pagina's, `all_posts.html`, tag-pagina's en `feed.rss`.

---

## Lokaal draaien

```bash
cd LPW
cp voorbeeld/api/config.example.php voorbeeld/api/config.php    # en vul admin_hash in
php -S 127.0.0.1:8080                                            # open http://127.0.0.1:8080/voorbeeld/
```

Lokaal testen tegen je eigen servers op `127.0.0.1` kan met `'allow_private' => true` in
`config.php`. Gebruik dat **nooit** op een publieke server.

### Android-APK (mqtt, stomp, websocket)

```bash
cd voorbeeld/stomp && npm install && npx cap add android && npx cap sync && cd android && ./gradlew assembleDebug
```

Hiervoor heb je Node.js, de Android SDK en JDK 21+ nodig (Capacitor 8). Voor STOMP is er ook de workflow
[`.github/workflows/stomp-apk.yml`](../.github/workflows/stomp-apk.yml).

### Hoe de schermafbeeldingen zijn gemaakt

De afbeeldingen in `screenshots/` zijn geen mockups. Ze zijn gemaakt met headless Chromium (390×844, 2×) terwijl de apps draaiden tegen echte servers:

| Protocol | Server |
|---|---|
| Finger | in.fingerd |
| CoAP | libcoap |
| LwM2M | Eclipse Leshan |
| AMQP | RabbitMQ 3.12 |
| XMPP | Prosody |
| HTTP/3 | aioquic |
| Nostr | een Nostr-relay |
| MQTT-SN | gateway naar een MQTT-broker |
| Gemini, Gopher, Spartan, Nex, Guppy, Titan, Misfin | testservers |

Het Logboek toont dus de echte frames.
