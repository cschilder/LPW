# websocket — WebSocket-client

Een werkende **WebSocket-client** (RFC 6455) in dezelfde stijl als de
`twtxt`- en `stomp`-voorbeeldapps: [Vanilla Framework](https://vanillaframework.io/)
+ Ubuntu-lettertype, vier thema's, lokale accountregistratie, toasts en
systeemnotificaties. De app praat rechtstreeks met de browser-`WebSocket`-API —
geen enkele externe JS-afhankelijkheid.

> App-ID: `space.r010.websocket` · App-naam: **websocket**

## Wat het doet

| View | Functie |
|------|---------|
| **Berichten** | Feed van verzonden en ontvangen frames; compose-veld met @mention-autocomplete en VF-icoon-picker |
| **Verbinding** | WebSocket-URL + optionele subprotocollen, verbinden/verbreken, live status |
| **Logboek** | Alle ruwe frames en levensduur-events (OPEN, MESSAGE, SEND, CLOSE, ERROR) in/uit |

Berichten gaan als JSON-frame `{"sender","text","ts"}` over de draad, zodat
afzender en @mentions werken met **zowel** een echo-server (stuurt je frame
terug) als een **broadcast-server** (groepschat: iedereen krijgt elk bericht).

## In de browser draaien (zonder Android)

```bash
cd voorbeeld/websocket/www
python3 -m http.server 8090
# open http://localhost:8090
```

Maak een account, ga naar **Verbinding** en kies een server:

| Server | URL | Gedrag |
|--------|-----|--------|
| echo.websocket.events | `wss://echo.websocket.events` | echo (stuurt terug) |
| Postman echo | `wss://ws.postman-echo.com/raw` | echo |
| Lokale broadcast | `ws://localhost:8091` | groepschat (zie hieronder) |

### Lokale broadcast-/echo-server

Voor een groepschat-demo (of offline testen) start je het meegeleverde
mini-servertje. Het heeft alleen het `ws`-pakket nodig:

```bash
cd voorbeeld/websocket
npm install ws
node server.js        # luistert op ws://localhost:8091 en broadcast naar iedereen
```

Open daarna twee browservensters op `http://localhost:8090`, log in als
twee gebruikers, verbind beide met `ws://localhost:8091` en chat.

## Bouwen tot APK

Vereist: Node.js, een Android SDK en JDK 21+. Exact dezelfde workflow als twtxt/stomp.

```bash
cd voorbeeld/websocket
npm install
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
#   → android/app/build/outputs/apk/debug/app-debug.apk
```

> De `android/`-map wordt gegenereerd en is niet ingecheckt (zie `.gitignore`).

## Bestandsstructuur

```
voorbeeld/websocket/
├── capacitor.config.json      # app-ID space.r010.websocket
├── package.json               # Capacitor 8 + plugins
├── server.js                  # optionele lokale broadcast-/echo-server (dev)
├── .gitignore
└── www/
    ├── index.html             # views: Berichten / Verbinding / Logboek
    ├── css/app.css            # Vanilla Framework-aanvulling + 4 thema's
    └── js/app.js              # UI-logica, auth, WebSocket, notificaties
```
