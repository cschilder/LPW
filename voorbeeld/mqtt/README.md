# mqtt — MQTT-client (over WebSocket)

Een werkende **MQTT-client** in dezelfde stijl als de `twtxt`-, `stomp`- en
`websocket`-voorbeeldapps: [Vanilla Framework](https://vanillaframework.io/) +
Ubuntu-lettertype, vier thema's, lokale accountregistratie, toasts en
systeemnotificaties. De app gebruikt de meegeleverde **[MQTT.js](https://github.com/mqttjs/MQTT.js) 5**
(`www/js/mqtt.min.js`) en spreekt **MQTT 5.0/3.1.1 over WebSocket**.

> App-ID: `space.r010.mqtt` · App-naam: **mqtt**

## Wat het doet

| View | Functie |
|------|---------|
| **Berichten** | Feed van binnengekomen `PUBLISH`-berichten; publiceren met **topic**, **QoS** (0/1/2) en **retain** |
| **Topics** | `SUBSCRIBE`/`UNSUBSCRIBE` op topic-filters met wildcards (`+`, `#`) en QoS |
| **Verbinding** | Broker-URL, client-id, gebruiker/wachtwoord, clean session, verbinden/verbreken |
| **Logboek** | Alle pakketten: CONNACK, SUBSCRIBE/SUBACK, PUBLISH in/uit, DISCONNECT, ERROR |

Payloads mogen **platte tekst / telemetrie-JSON** zijn (bijv.
`{"temp":21.5,"vocht":58}`) óf een chat-bericht: typ je gewone tekst, dan
verpakt de app die als `{"sender","text","ts"}` zodat afzender en `@mentions`
in de feed verschijnen.

## In de browser draaien (zonder Android)

```bash
cd voorbeeld/mqtt/www
python3 -m http.server 8090
# open http://localhost:8090
```

Maak een account, ga naar **Verbinding** en kies een broker:

| Broker | WebSocket-URL |
|--------|---------------|
| HiveMQ (publiek) | `wss://broker.hivemq.com:8884/mqtt` |
| EMQX (publiek) | `wss://broker.emqx.io:8084/mqtt` |
| Mosquitto (publiek) | `wss://test.mosquitto.org:8081/mqtt` |
| Lokaal (Aedes) | `ws://localhost:8888` |

Abonneer bij **Topics** op bijv. `sensors/#`, publiceer in **Berichten** naar
`sensors/woonkamer/temp` en het bericht verschijnt in de feed.

### Lokale broker (Aedes)

Voor offline testen of een groepsdemo start je de meegeleverde broker
(Aedes met een WebSocket-listener):

```bash
cd voorbeeld/mqtt
npm install              # installeert o.a. aedes + aedes-server-factory
node broker.js           # ws://localhost:8888
```

## Bouwen tot APK

Vereist: Node.js, een Android SDK en JDK 21+. Exact dezelfde workflow als twtxt/stomp.

```bash
cd voorbeeld/mqtt
npm install
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
#   → android/app/build/outputs/apk/debug/app-debug.apk
```

> De `android/`-map wordt gegenereerd en is niet ingecheckt (zie `.gitignore`).

## Bestandsstructuur

```
voorbeeld/mqtt/
├── capacitor.config.json      # app-ID space.r010.mqtt
├── package.json               # Capacitor 8 + plugins; aedes/ws voor de broker
├── broker.js                  # lokale Aedes MQTT-over-WebSocket broker (dev)
├── .gitignore
└── www/
    ├── index.html             # views: Berichten / Topics / Verbinding / Logboek
    ├── css/app.css            # Vanilla Framework-aanvulling + 4 thema's
    └── js/
        ├── mqtt.min.js        # MQTT.js 5 (browser-bundle, meegeleverd)
        └── app.js             # UI-logica, auth, MQTT-pub/sub, notificaties
```
