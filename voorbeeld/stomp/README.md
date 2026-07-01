# stomp — STOMP Android-client

Een volledig werkende **STOMP-messaging-client** voor Android, gebouwd met
[Capacitor](https://capacitorjs.com/) — hetzelfde recept en dezelfde
[Vanilla Framework](https://vanillaframework.io/)-styling als de `twtxt`-app
(`space.r010.twtxt`). Waar twtxt microblogging over een pod doet, praat deze
app rechtstreeks met een **STOMP-broker over WebSocket**.

> App-ID: `space.r010.stomp` · App-naam: **stomp**

## Wat het doet

| twtxt-app | deze stomp-app |
|-----------|----------------|
| Inloggen / registreren op de pod | **Lokale account-registratie** (wachtwoord gehasht met PBKDF2-SHA-256); je login/wachtwoord worden gebruikt als STOMP `login`/`passcode` |
| Tijdlijn van twts | **Berichten** — feed van binnengekomen STOMP `MESSAGE`-frames |
| Twt plaatsen | **Versturen** — een `SEND`-frame naar een destination |
| Tags | **Kanalen** — je `SUBSCRIBE`-abonnementen op topics/queues |
| Volgend | **Verbinding** — broker-URL, login, passcode, heart-beat, connect/disconnect |
| Admin | **Logboek** — alle ruwe STOMP-frames (in/uit) live |

### Overgenomen features (identiek aan twtxt)
- Vanilla Framework 4.51 + Ubuntu-lettertype
- 4 thema's: **Ubuntu, Donker, Suru, Aubergine**
- In-app **toasts** + **Android-systeemnotificaties** (Capacitor LocalNotifications)
- Notificatiebadge + **Ubuntu-notificatiegeluid** (Web Audio API)
- Compose met **@mention-autocomplete** en **VF-icoon-picker** (`:ok:`, `:warn:`, …)
- Opslag via **Capacitor Preferences** (met localStorage-fallback in de browser)
- Automatisch opnieuw inloggen + opnieuw verbinden bij herstart

### STOMP-implementatie
`www/js/stomp.js` is een compacte, afhankelijkheidsvrije **STOMP 1.2**-client
over de browser-WebSocket. Ondersteunt `CONNECT`/`CONNECTED`, `SUBSCRIBE`,
`UNSUBSCRIBE`, `SEND`, `MESSAGE`, `RECEIPT`, `ERROR`, `DISCONNECT`,
header-escaping en **heart-beating** (spec §3.7).

## Bouwen tot APK

Vereist: Node.js, een Android SDK en JDK 17+. Exact dezelfde workflow als twtxt.

```bash
cd voorbeeld/stomp

# 1. Capacitor + plugins installeren
npm install

# 2. Native Android-project genereren (eenmalig)
npx cap add android

# 3. Web-assets synchroniseren naar het Android-project
npx cap sync

# 4a. Debug-APK bouwen…
cd android && ./gradlew assembleDebug
#    → android/app/build/outputs/apk/debug/app-debug.apk

# 4b. …of openen in Android Studio
npx cap open android
```

> De `android/`-map wordt gegenereerd en is daarom niet ingecheckt
> (zie `.gitignore`) — precies zoals bij de twtxt-app.

## Testen in de browser (zonder Android)

De app werkt ook gewoon in een browser dankzij de localStorage-/WebSocket-fallback:

```bash
cd voorbeeld/stomp/www
python3 -m http.server 8090
# open http://localhost:8090
```

Maak een account aan, ga naar **Verbinding**, vul je broker-URL in en verbind.

## Een STOMP-broker om tegen te testen

De app spreekt STOMP-**over-WebSocket**. Voorbeelden:

| Broker | WebSocket-URL | Login |
|--------|---------------|-------|
| RabbitMQ (plugin `rabbitmq_web_stomp`) | `ws://HOST:15674/ws` | `guest` / `guest` |
| ActiveMQ Classic | `ws://HOST:61614` | — |
| ActiveMQ Artemis | `ws://HOST:61614` | — |

Snelle testbroker met Docker:

```bash
docker run -it --rm -p 15674:15674 -p 5672:5672 \
  rabbitmq:3-management bash -c \
  "rabbitmq-plugins enable rabbitmq_web_stomp && rabbitmq-server"
# URL in de app:  ws://10.0.2.2:15674/ws   (10.0.2.2 = host vanuit de Android-emulator)
```

Abonneer je in **Kanalen** op bijv. `/topic/algemeen`, verstuur een bericht
naar dezelfde destination en het verschijnt in **Berichten**.

## Bestandsstructuur

```
voorbeeld/stomp/
├── capacitor.config.json      # app-ID space.r010.stomp, plugins
├── package.json               # Capacitor 7 + plugins
├── .gitignore
└── www/
    ├── index.html             # views: Berichten / Kanalen / Verbinding / Logboek
    ├── css/app.css            # Vanilla Framework-aanvulling + 4 thema's
    └── js/
        ├── stomp.js           # STOMP 1.2 client over WebSocket
        └── app.js             # UI-logica, auth, notificaties
```

## Beveiligingsnoot

Account-wachtwoorden worden gehasht (PBKDF2-SHA-256, 100k iteraties) opgeslagen.
De STOMP-`passcode` wordt voor automatisch herverbinden wél in platte vorm in
Capacitor Preferences bewaard op het toestel — prima voor een lokale
demo/single-user-app, maar niet bedoeld voor gedeelde toestellen.
