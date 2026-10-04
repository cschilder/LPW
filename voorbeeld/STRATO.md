# LPW + alle demo's op Strato zetten (webhosting met SSH)

Alles in deze repo werkt op gewone Strato-webhosting:

- de gids zelf (statische HTML);
- de 25 demo-apps (HTML en JavaScript);
- de PHP-bruggen in `voorbeeld/api/`.

Je hebt geen Node, geen eigen poorten en geen build-stap nodig. Je zet de site neer met `git clone` en werkt hem bij met `git pull`.

> Vervang hieronder `jouwdomein.nl` door je eigen domein. De SSH-gebruikersnaam en het
> wachtwoord vind je in het Strato-klantenpanel onder **SFTP/SSH**. SSH moet daar aan staan.

## 1. Eenmalig: neerzetten

```bash
# Inloggen op je webruimte
ssh jouwdomein.nl@ssh.strato.de

# De repo ophalen (publiek, dus zonder token)
cd ~
git clone https://github.com/cschilder/LPW.git
cd LPW
git checkout claude/android-stomp-example-app-tkkiah   # zolang de demo's nog niet in de hoofdbranch zitten

# Configuratie van de PHP-bruggen (dit bestand staat NIET in git)
cp voorbeeld/api/config.example.php voorbeeld/api/config.php

# Beheerwachtwoord-hash maken voor het publiceren (twtxt, gemlog, phlog, bashblog)
php -r 'echo password_hash("KIES-EEN-STERK-WACHTWOORD", PASSWORD_DEFAULT), PHP_EOL;'
#   Geeft dit een fout of een oude PHP-versie? Op Strato staan meerdere versies,
#   bijv.:  ls /opt/RZphp*/bin/php-cli   en gebruik daarvan de nieuwste.

# Zet de uitkomst ($2y$10$...) in config.php bij 'admin_hash'
nano voorbeeld/api/config.php

# De publicatie-demo's moeten in publiek/ kunnen schrijven
chmod 755 voorbeeld/publiek
```

Zet daarna in het Strato-panel het **doel van je domein** (of van een subdomein, bijv.
`lpw.jouwdomein.nl`) op de map **`/LPW`**. Je vindt dit onder *Domeinen → Beheer →
Instellingen → Doel → Map*.

Daarna:

| Wat | Adres |
|---|---|
| De gids | `https://jouwdomein.nl/` |
| Alle demo's | `https://jouwdomein.nl/voorbeeld/` |
| Diagnose | `https://jouwdomein.nl/voorbeeld/api/diag.php` |

Stel ook de PHP-versie van je domein in op **8.1 of hoger** (Strato-panel → *PHP-versie*).

### Wat diag.php controleert

`diag.php` geeft JSON terug met:

- `php`: de PHP-versie;
- `curl_http2` en `curl_http3`: of curl van de server HTTP/2 en HTTP/3 kan;
- `publiek_schrijfbaar`: moet `true` zijn;
- `beheer_ingesteld`: moet `true` zijn;
- `verbindingen`: welke uitgaande poorten (70, 79, 300, 1900, 1958, 1965, 5672, 443 en UDP 5683) de hosting toestaat. Een demo waarvan de poort dicht staat, geeft een nette foutmelding.

## 2. Bijwerken

```bash
ssh jouwdomein.nl@ssh.strato.de
cd ~/LPW && git pull --ff-only
```

`config.php` en alles in `voorbeeld/publiek/` (je twts en blogberichten) staan niet in git. Een
`git pull` laat ze dus ongemoeid.

Bijwerken zonder eerst in te loggen kan ook, vanaf je eigen computer:

```bash
ssh jouwdomein.nl@ssh.strato.de 'cd ~/LPW && git pull --ff-only && git log -1 --oneline'
```

Overstappen naar de hoofdbranch, zodra deze branch daarin is samengevoegd:

```bash
cd ~/LPW && git fetch origin && git checkout claude/claude-md-docs-4a0blg && git pull --ff-only
```

## 3. Wijzigingen maken en publiceren

Werk lokaal, push naar GitHub en haal het op Strato op:

```bash
# Lokaal
git add -A && git commit -m "Mijn wijziging" && git push

# Daarna op Strato
ssh jouwdomein.nl@ssh.strato.de 'cd ~/LPW && git pull --ff-only'
```

> Maak geen wijzigingen direct op de server in bestanden die in git staan, anders weigert
> `git pull --ff-only`. Is dat toch gebeurd? Dan gooi je de lokale wijzigingen op de server weg met
> `git checkout -- .` (dit raakt `config.php` en `publiek/` niet).

## 4. Wat wel en niet op Strato draait

| Onderdeel | Op Strato? | Toelichting |
|---|---|---|
| Gids, overzicht, alle `index.html`/`app.js` | ✅ | statisch |
| PHP-bruggen (Gopher, Gemini, Spartan, Titan, Guppy, Nex, Finger, Misfin, CoAP, LwM2M, AMQP, HTTP/2, HTTP/3, MQTT-SN) | ✅ | Werkt als Strato de uitgaande poort toestaat; controleer dat met `diag.php`. |
| Twtxt, Gemlog, Phlog, Bashblog | ✅ | Schrijven naar `voorbeeld/publiek/` en zijn daarna publiek te volgen of te lezen. |
| MQTT, WebSocket, Nostr | ✅ | De browser verbindt zelf met een publieke broker, echo-server of relay. |
| XMPP, STOMP, AMQP | ✅ | Je hebt een eigen server nodig, bijv. een XMPP-server met WebSocket, of het gratis plan van CloudAMQP voor AMQP. |
| MQTT-SN-gateway (`mqttsn/gateway.js`) | ❌ | Node.js; draai deze op een Raspberry Pi of VPS en vul daarna het adres in de app in. |
| Lokale testbrokers (`mqtt/broker.js`, `websocket/server.js`) | ❌ | Node.js; alleen voor lokaal testen. |
| Android-APK's (`mqtt/`, `stomp/`, `websocket/`) | — | Bouw je lokaal of via GitHub Actions. De `www/`-map werkt gewoon op Strato. |

## 5. Beveiliging

- **`allow_private` blijft `false`.** Dan kunnen de bruggen alleen publieke IP-adressen bereiken, en dat is het IP waarmee daadwerkelijk wordt verbonden. Ze zijn dus geen open proxy naar het interne netwerk van Strato.
- Elke brug heeft een **poort-allowlist**. Extra poorten zet je in `config.php` bij `extra_ports`.
- `rate_per_min` beperkt het aantal verzoeken per IP per minuut. De standaard is 60.
- `api/.htaccess` blokkeert `_lib.php`, `config.php` en de andere interne bestanden voor het web.
- `publiek/.htaccess` voert nooit scripts uit en heeft geen directory-listing.
- Publiceren en verwijderen kan alleen met het **beheerwachtwoord**. Het wordt per tabblad onthouden (sessionStorage) en alleen als bcrypt-hash op de server bewaard.

## Kort: alle commando's

```bash
ssh jouwdomein.nl@ssh.strato.de
git clone https://github.com/cschilder/LPW.git && cd LPW
git checkout claude/android-stomp-example-app-tkkiah
cp voorbeeld/api/config.example.php voorbeeld/api/config.php
php -r 'echo password_hash("WACHTWOORD", PASSWORD_DEFAULT), PHP_EOL;'   # → admin_hash in config.php
nano voorbeeld/api/config.php
chmod 755 voorbeeld/publiek
# Strato-panel: domeindoel → /LPW, PHP ≥ 8.1. Daarna: https://jouwdomein.nl/voorbeeld/api/diag.php
# Bijwerken:
cd ~/LPW && git pull --ff-only
```
