// Uitbreiding: Small Internet & Gedecentraliseerde Protocollen
// Wordt samengevoegd met PROTOCOLS uit protocols.js via Object.assign in app.js

const PROTOCOLS2 = {

  gopher: {
    id: 'gopher', name: 'Gopher', fullName: 'The Gopher Protocol',
    version: 'RFC 1436 (1991)', standard: 'IETF RFC 1436',
    color: '#78350F', transport: 'TCP', port: '70',
    model: 'Client-Server (menu/document)', qos: 'Geen', security: 'Geen / Gophers (TLS)',
    category: 'Small Internet', idealFor: 'Tekst, hiërarchische documenten, persoonlijke gopherholes',
    tags: ['Small Internet', 'TCP', 'Tekst', 'Klassiek'],
    shortDesc: 'De klassieke internet-alternatief uit 1991: een hiërarchisch menu- en documentprotocol dat voorafging aan het World Wide Web en nog steeds actief wordt gebruikt.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#78350F"/>
      <line x1="12" y1="20" x2="52" y2="20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="20" y1="29" x2="52" y2="29" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="38" x2="52" y2="38" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="28" y1="47" x2="52" y2="47" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <circle cx="15" cy="29" r="2.5" fill="white" opacity="0.7"/>
      <circle cx="15" cy="38" r="2.5" fill="white" opacity="0.7"/>
      <circle cx="23" cy="47" r="2.5" fill="white" opacity="0.5"/>
      <polyline points="12,17 12,23" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Gopher is een internetprotocol dat in 1991 werd ontwikkeld aan de Universiteit van Minnesota (vernoemd naar de universiteitsmascotte) door Farhad Anklesaria, Mark McCahill en anderen. Het biedt een eenvoudig, hiërarchisch systeem voor het navigeren en ophalen van documenten via menu's — volledig tekstgebaseerd.

Vóór het World Wide Web was Gopher de dominante manier om informatie op internet te vinden en te delen. Het werd snel overvleugeld door HTTP/HTML, maar is nooit verdwenen. Vandaag de dag is er een levendige **"Gopherspace"** gemeenschap met duizenden actieve "gopherholes" (persoonlijke Gopher-sites), met name op SDF.org, Floodgap.com en vele persoonlijke UNIX-servers.

**Kenmerken:**
- Volledig tekstgebaseerd, geen opmaak, geen afbeeldingen (in de basis)
- Hiërarchische navigatie via menu's ("gophermaps")
- Razendsnel door minimale overhead
- Geen cookies, geen tracking, geen JavaScript
- RFC 1436 (1991) door IETF`,

      werking: `## Werking

Gopher werkt via een eenvoudig **verzoek-antwoord model** op TCP poort 70:

\`\`\`
Client → "selector\\r\\n"        (pad naar document of menu)
Server ← inhoud of gophermap
         (verbinding sluit na respons)
\`\`\`

### Gophermap (directory-listing)
Een gophermap is een tabgescheiden tekstbestand dat een menu beschrijft:
\`\`\`
1Over ons	/over	mijnserver.nl	70
0Welkomsttekst	/welkom.txt	mijnserver.nl	70
1Projecten	/projecten	mijnserver.nl	70
7Zoeken	/zoek	mijnserver.nl	70
iInfo-regel (geen link)	fake	(NULL)	0
hExternal link	URL:https://example.com	mijnserver.nl	70
\`\`\`

### Item-types
| Type | Beschrijving |
|------|-------------|
| 0 | Tekstbestand |
| 1 | Directory (submenu) |
| 3 | Fout |
| 7 | Zoekindex |
| 9 | Binair bestand |
| g | GIF-afbeelding |
| I | Generieke afbeelding |
| h | HTML-hyperlink (buiten Gopher) |
| i | Info-regel (niet klikbaar) |
| s | Geluidsbestand |

### Gophers (TLS-extensie)
Via het \`gophers://\` schema is TLS-beveiliging mogelijk op poort 105 (niet officieel, maar breed geaccepteerd in moderne clients).`,

      toepassingen: `## Toepassingen

- **Persoonlijke gopherholes**: Publiceer teksten, dagboeken, projecten — vergelijkbaar met een personal website maar minimallistisch
- **Phlog**: Een "Gopher log" (blog in Gopherspace) — puur tekstuele dagelijkse of wekelijkse bijdragen
- **Tekstarchieven**: Literatuur, handleidingen, RFC's, historische documenten
- **SDF.org**: Een public-access UNIX-systeem met honderden actieve gopherholes
- **Nieuwsfeeds**: Sommige nieuwsbronnen bieden een Gopher-alternatief aan
- **Academische documenten**: Universiteiten bewaren historische bestanden in Gopherspace
- **Floodgap proxy**: https://gopher.floodgap.com — toegang tot Gopherspace via browser`,

      opties: `## Opties & Formaat

### URL-structuur
\`\`\`
gopher://host:poort/type/selector
gopher://gopher.floodgap.com/1/          ← directory
gopher://gopher.floodgap.com/0/intro.txt ← tekstbestand
gopher://gopher.floodgap.com/7/seek      ← zoekopdracht
\`\`\`

### Gophermap opmaakregels
| Veld | Positie | Beschrijving |
|------|---------|-------------|
| Type | Eerste karakter | Éénletter item-type code |
| Weergavenaam | Na type, tot tab | Zichtbare linktekst |
| Selector | Na 1e tab | Pad op de server |
| Host | Na 2e tab | Server-hostnaam |
| Poort | Na 3e tab | Poort (standaard 70) |

### Gopher+ uitbreiding
Gopher+ (niet-standaard) voegt metatdata toe: \`+INFO\`, \`+ADMIN\`, \`+VIEWS\` voor MIME-type en encoding.

### Aanbevolen mapstructuur
\`\`\`
/gophermap         ← rootmenu
/phlog/            ← blog-entries
/phlog/gophermap   ← menu van phlog-entries
/about.txt         ← persoonlijke info
/projects/         ← projecten
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python — Gopher-client
\`\`\`python
import socket

def gopher_get(host, selector='/', port=70):
    """Haal een Gopher-document of gophermap op."""
    with socket.create_connection((host, port), timeout=10) as s:
        s.sendall((selector + '\\r\\n').encode('utf-8'))
        chunks = []
        while chunk := s.recv(4096):
            chunks.append(chunk)
    return b''.join(chunks).decode('utf-8', errors='replace')

def parse_gophermap(tekst):
    """Parseer een gophermap-respons."""
    items = []
    for regel in tekst.splitlines():
        if regel == '.':
            break
        if not regel:
            continue
        type_char = regel[0]
        delen = regel[1:].split('\\t')
        if len(delen) >= 4:
            items.append({
                'type':     type_char,
                'naam':     delen[0],
                'selector': delen[1],
                'host':     delen[2],
                'poort':    int(delen[3]) if delen[3].strip().isdigit() else 70
            })
        elif type_char == 'i':
            items.append({'type': 'i', 'naam': delen[0]})
    return items

# Floodgap publiek Gopher menu ophalen
inhoud = gopher_get('gopher.floodgap.com', '/')
items  = parse_gophermap(inhoud)

for item in items[:15]:
    prefix = {'1': '[DIR]', '0': '[TXT]', '7': '[ZOE]',
              'h': '[URL]', 'i': '     '}.get(item['type'], '[???]')
    print(f"{prefix} {item['naam']}")
\`\`\`

### Bash — Gopher-bestand opvragen
\`\`\`bash
# Met netcat/nc
echo -e "/\\r" | nc gopher.floodgap.com 70 | head -40

# Of met curl (ondersteunt gopher://)
curl gopher://gopher.floodgap.com/

# Eigen gopherhole hosten met pygopherd
pip install pygopherd
pygopherd --host 0.0.0.0 --port 70 /srv/gopher/
\`\`\``
    }
  },

  gemini: {
    id: 'gemini', name: 'Gemini', fullName: 'Gemini Protocol',
    version: 'Specificatie v0.24', standard: 'Gemini Project (community)',
    color: '#4F46E5', transport: 'TCP + TLS', port: '1965',
    model: 'Client-Server (document pull)', qos: 'Geen', security: 'TLS 1.2+ (verplicht)',
    category: 'Small Internet', idealFor: 'Privacyvriendelijk lezen, persoonlijke capsules, tekst-first content',
    tags: ['Small Internet', 'TLS', 'Gemtext', 'Privacy'],
    shortDesc: 'Een modern, privacyvriendelijk alternatief voor het web: zwaarder dan Gopher, lichter dan HTTP — met verplichte TLS en een eigen simpele opmaaktaal.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#4F46E5"/>
      <circle cx="22" cy="22" r="7" stroke="white" stroke-width="2.5" fill="none"/>
      <circle cx="42" cy="42" r="7" stroke="white" stroke-width="2.5" fill="none"/>
      <circle cx="22" cy="22" r="2" fill="white"/>
      <circle cx="42" cy="42" r="2" fill="white"/>
      <line x1="28" y1="26" x2="36" y2="36" stroke="white" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Gemini is een modern internetprotocol ontworpen in 2019 door "Solderpunk" als een middenweg tussen het minimale Gopher en het complexe HTTP. Het doel: een **privacyvriendelijk, eenvoudig documentprotocol** dat bewust *niet* probeert alles te kunnen wat het web kan.

Gemini vereist **altijd TLS** — er is geen onbeveiligde modus. Tegelijkertijd zijn er geen cookies, geen tracking pixels, geen JavaScript en geen complexe MIME-onderhandelingen. Elke "capsule" (Gemini-site) is bereikbaar via het \`gemini://\` URL-schema.

De eigen opmaaktaal **Gemtext** (.gmi) is bewust beperkt: koppen (\`#\`, \`##\`, \`###\`), lijstregels (\`*\`), links (\`=>`\`) en preformatted blokken (\`\`\`). Niets meer.

**Actieve gemeenschap (2025):**
- 1000+ actieve capsules wereldwijd
- Aggregators: Antenna, CAPCOM, Cosmos
- Clients: Lagrange (GUI), Amfora (terminal), Kristall (GUI), Elaho (iOS)`,

      werking: `## Werking

### Protocol-stroom
\`\`\`
Client → "gemini://host/pad\\r\\n"         (volledige URL + CRLF)
Server ← "20 text/gemini\\r\\n"            (status + MIME)
         [inhoud volgt direct na CRLF]
         (verbinding sluit na inhoud)
\`\`\`

### Statuscodes
| Code | Klasse | Beschrijving |
|------|--------|-------------|
| 10 | Input | Server vraagt om invoer; tekst volgt als prompt |
| 11 | Gevoelige input | Wachtwoordinvoer (verborgen) |
| 20 | Succes | Inhoud volgt; MIME-type staat in header |
| 30 | Tijdelijke redirect | Nieuwe URL in header |
| 31 | Permanente redirect | Nieuwe URL in header |
| 40 | Tijdelijke fout | Probeer later opnieuw |
| 50 | Permanente fout | Pagina bestaat niet, etc. |
| 60 | Clientcertificaat vereist | Authenticatie via TLS-certificaat |

### Gemtext opmaak
\`\`\`gemtext
# Hoofdkop
## Subkop
### Derde niveau

Gewone alinea-tekst (geen opmaak zoals bold/italic).

* Lijstitem één
* Lijstitem twee

=> gemini://andere-capsule.nl/ Linkbeschrijving
=> https://example.com         Externe link (https)

\`\`\`
Dit is preformatted tekst (code, ASCII-art)
\`\`\`
\`\`\`

### Clientcertificaten
Gemini ondersteunt **TLS client certificates** voor anonieme maar persistente identiteiten — geen wachtwoorden, geen accounts bij derden.`,

      toepassingen: `## Toepassingen

- **Persoonlijke capsules**: Blogs (gemlogs), dagboeken, CV's, projectpagina's
- **Privacyvriendelijk lezen**: Nieuws, artikelen zonder trackers of advertenties
- **Gemeenschapsplatforms**: SDF Gemini, tilde.team, circumlunar.space
- **Documentatie**: Technische handleidingen voor terminal-gebruikers
- **Creatief schrijven**: Verhalen, gedichten, fictie
- **Aggregators**: CAPCOM en Antenna aggregeren nieuwe gemlog-berichten
- **Feeds**: Atom-feeds via \`/atom.xml\` in Geminispace`,

      opties: `## Opties & Configuratie

### Serveropties (bijv. Agate, Molly Brown)
| Optie | Beschrijving |
|-------|-------------|
| \`--hostname\` | Hostnaam voor het TLS-certificaat |
| \`--port\` | Luisterpoort (standaard 1965) |
| \`--cert\` | Pad naar TLS-certificaat (.pem) |
| \`--key\` | Pad naar privésleutel (.pem) |
| \`--content\` | Map met .gmi-bestanden |

### MIME-typen in Gemini
| MIME | Beschrijving |
|------|-------------|
| \`text/gemini\` | Gemtext document |
| \`text/plain\` | Gewone tekst |
| \`image/png\`, \`image/jpeg\` | Afbeeldingen (clients tonen optioneel) |
| \`application/octet-stream\` | Binair downloadbestand |

### Aanbevolen capsule-structuur
\`\`\`
/index.gmi          ← startpagina
/gemlog/index.gmi   ← blogoverzicht
/gemlog/2025-01-15-titel.gmi
/about.gmi
/atom.xml           ← Atom-feed
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python — Gemini-client
\`\`\`python
import ssl, socket

def gemini_get(url: str) -> tuple[str, str]:
    """Haal een Gemini-document op. Retourneert (header, inhoud)."""
    # URL parsen
    url = url.replace('gemini://', '')
    host, _, pad = url.partition('/')
    pad = '/' + pad

    ctx = ssl.create_default_context()
    ctx.check_hostname = False          # Zelfondertekende certs toegestaan
    ctx.verify_mode    = ssl.CERT_NONE  # Gemini vertrouwt op TOFU

    with socket.create_connection((host, 1965), timeout=15) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as tls:
            tls.sendall(f'gemini://{host}{pad}\\r\\n'.encode())
            data = b''
            while chunk := tls.recv(4096):
                data += chunk

    header, _, inhoud = data.partition(b'\\r\\n')
    return header.decode(), inhoud.decode('utf-8', errors='replace')

header, inhoud = gemini_get('gemini://gemini.circumlunar.space/')
print('Header:', header)
print('Inhoud (eerste 300 tekens):', inhoud[:300])
\`\`\`

### Bash — Gemini capsule opzetten met Agate
\`\`\`bash
# Agate installeren (Rust)
cargo install agate

# Zelfondertekend certificaat genereren
mkdir -p ~/.agate/certs
openssl req -x509 -newkey rsa:4096 -keyout ~/.agate/certs/key.rsa \\
  -out ~/.agate/certs/cert.pem -days 3650 -nodes \\
  -subj "/CN=mijn-capsule.nl"

# Capsule starten
agate --content /srv/gemini --hostname mijn-capsule.nl \\
      --cert ~/.agate/certs/cert.pem \\
      --key  ~/.agate/certs/key.rsa

# Testverzoek met openssl
echo "gemini://localhost/\\r" | openssl s_client -connect localhost:1965 -quiet
\`\`\``
    }
  },

  spartan: {
    id: 'spartan', name: 'Spartan', fullName: 'Spartan Protocol',
    version: 'Specificatie 2021', standard: 'Community specificatie',
    color: '#DC2626', transport: 'TCP', port: '300',
    model: 'Client-Server (pull + upload)', qos: 'Geen', security: 'Geen (bewust)',
    category: 'Small Internet', idealFor: 'Eenvoudige capsules, formulierinvoer, experimenten zonder TLS',
    tags: ['Small Internet', 'Eenvoudig', 'TCP', 'Upload'],
    shortDesc: 'Een bewust vereenvoudigde Gemini-variant zonder TLS — sneller op te zetten en te testen, met ingebouwde ondersteuning voor het uploaden van data.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#DC2626"/>
      <path d="M32 10 L50 22 L50 42 L32 54 L14 42 L14 22 Z" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M32 18 L44 26 L44 38 L32 46 L20 38 L20 26 Z" fill="white" opacity="0.2"/>
      <line x1="32" y1="10" x2="32" y2="54" stroke="white" stroke-width="1.5" opacity="0.4"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Spartan is een lichtgewicht documentprotocol ontworpen in 2021 als **vereenvoudigde Gemini-variant**. Het verschil: Spartan vereist **geen TLS**, wat het protocol veel eenvoudiger op te zetten maakt voor experimenten, lokale netwerken of situaties waar beveiliging niet noodzakelijk is.

Spartan is bewust "Sparta-ans": no-nonsense, minimaal overhead, snel geïmplementeerd. Het gebruikt dezelfde Gemtext-opmaak als Gemini en voegt de mogelijkheid toe om data te uploaden (in tegenstelling tot Gemini's standaard pull-only model).

Het protocol wordt actief gebruikt in de Gemini-gemeenschap voor:
- Snelle lokale servers zonder certificaatconfiguratie
- Formulier-achtige interacties met data-upload
- Experimenten met nieuwe Gemini-achtige features`,

      werking: `## Werking

### Protocolstroom
\`\`\`
Client → "host /pad content-length\\r\\n"    (+ body als content-length > 0)
Server ← "N beschrijving/mime\\r\\n"         (statuscode + bericht)
         [inhoud volgt]
\`\`\`

### Verzoek-formaat
\`\`\`
mijn-server.nl /welkom.gmi 0\\r\\n
                            └── 0 = geen body (GET-achtig)

mijn-server.nl /opslaan 42\\r\\n
Hallo wereld, dit is 42 bytes data!
└── 42 bytes body na header (POST-achtig)
\`\`\`

### Statuscodes
| Code | Beschrijving |
|------|-------------|
| 2 | Succes — inhoud volgt |
| 3 | Redirect — nieuwe URL in body |
| 4 | Client-fout (onjuist verzoek) |
| 5 | Server-fout |

### Verschil met Gemini
| Aspect | Gemini | Spartan |
|--------|--------|---------|
| TLS | Verplicht | Geen |
| URL in verzoek | Volledige URL | Host + pad + length |
| Upload | Niet standaard | Ingebouwd |
| Poort | 1965 | 300 |
| Privacy | Hoog | Laag (geen encryptie) |`,

      toepassingen: `## Toepassingen

- **Lokale ontwikkelomgevingen**: Gemini-content testen zonder certificaatconfiguratie
- **LAN-gebaseerde capsules**: Thuis- of kantoornetwerken zonder internetblootstelling
- **Interactieve Spartan-apps**: Formulieren, gastenboeken, simpele wikis
- **Leerprotocollen**: Begrip van Gemini opbouwen door iets eenvoudigers te implementeren
- **Laagdrempelige publicatie**: Snel een tekstcapsule opzetten voor vrienden`,

      opties: `## Opties & Formaat

### Verzoek-opbouw
\`\`\`
[hostnaam] [/pad] [content-length]\\r\\n
[optionele body van exact content-length bytes]
\`\`\`

### Status-uitvoer
\`\`\`
2 text/gemini\\r\\n          ← succes, Gemtext volgt
2 text/plain\\r\\n           ← succes, plaintext
3 gemini://andere-url\\r\\n  ← redirect
4 Ongeldige aanvraag\\r\\n   ← client-fout
5 Interne serverfout\\r\\n   ← server-fout
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python — Spartan-server
\`\`\`python
import socketserver, os

CONTENT_DIR = '/srv/spartan'

class SpartanHandler(socketserver.StreamRequestHandler):
    def handle(self):
        regel = self.rfile.readline().decode().strip()
        delen = regel.split(' ', 2)
        if len(delen) < 3:
            self.wfile.write(b'4 Ongeldig verzoek\\r\\n')
            return

        host, pad, lengte_str = delen
        lengte = int(lengte_str)
        body   = self.rfile.read(lengte) if lengte > 0 else b''

        # Bestand opzoeken
        bestand = os.path.join(CONTENT_DIR, pad.lstrip('/'))
        if pad == '/' or pad == '':
            bestand = os.path.join(CONTENT_DIR, 'index.gmi')

        if os.path.isfile(bestand):
            mime = 'text/gemini' if bestand.endswith('.gmi') else 'text/plain'
            self.wfile.write(f'2 {mime}\\r\\n'.encode())
            with open(bestand, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.wfile.write(b'4 Niet gevonden\\r\\n')

server = socketserver.TCPServer(('0.0.0.0', 300), SpartanHandler)
print('Spartan server gestart op poort 300')
server.serve_forever()
\`\`\`

### Python — Spartan-client
\`\`\`python
import socket

def spartan_get(host, pad='/', data=b''):
    with socket.create_connection((host, 300), timeout=10) as s:
        verzoek = f'{host} {pad} {len(data)}\\r\\n'.encode() + data
        s.sendall(verzoek)
        respons = b''
        while chunk := s.recv(4096):
            respons += chunk
    header, _, inhoud = respons.partition(b'\\r\\n')
    return header.decode(), inhoud.decode()

header, inhoud = spartan_get('localhost', '/')
print(header, inhoud[:200])
\`\`\``
    }
  },

  titan: {
    id: 'titan', name: 'Titan', fullName: 'Titan Upload Protocol',
    version: 'Specificatie 2020', standard: 'Community specificatie (Gemini-uitbreiding)',
    color: '#64748B', transport: 'TCP + TLS', port: '1965',
    model: 'Client-Server (upload)', qos: 'Geen', security: 'TLS 1.2+ (Gemini-verbinding)',
    category: 'Small Internet', idealFor: 'Gemini-wiki\'s, CMS, uploaden van capsule-inhoud',
    tags: ['Gemini', 'Upload', 'TLS', 'Wiki'],
    shortDesc: 'Een uploadprotocol dat Gemini uitbreidt met schrijfmogelijkheden — maakt wiki\'s, CMS-systemen en interactieve Gemini-capsules mogelijk.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#64748B"/>
      <polyline points="32,48 32,20" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <polyline points="20,30 32,18 44,30" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <line x1="16" y1="48" x2="48" y2="48" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Titan is een uploadprotocol dat het Gemini-protocol uitbreidt met schrijfmogelijkheden. Waar Gemini alleen documenten kan *ophalen*, maakt Titan het mogelijk om inhoud naar een Gemini-server te *sturen* — denk aan het indienen van wiki-artikelen, notities of bestanden.

Het protocol gebruikt hetzelfde TLS-mechanisme als Gemini (poort 1965) maar met het \`titan://\` URL-schema. Titan-servers verwerken uploads en slaan de inhoud op, terwijl dezelfde server via \`gemini://\` de inhoud leesbaar maakt.

**Veelgebruikte toepassingen:**
- **Station** — een Gemini-wiki met Titan-uploads
- **Comets** — CMS voor Gemini-capsules
- Persoonlijke notitie-systemen over Gemini`,

      werking: `## Werking

### Protocolstroom
\`\`\`
Client → "titan://host/pad;size=N;mime=type;token=auth\\r\\n"
         [N bytes inhoud]
Server ← "20 text/gemini\\r\\n"  (succes, Gemini-respons)
         [optionele bevestigingspagina]
\`\`\`

### URL-parameters na \`;\`
| Parameter | Beschrijving |
|-----------|-------------|
| \`size\` | Exacte grootte van de te uploaden body in bytes (**verplicht**) |
| \`mime\` | MIME-type van de upload (bijv. \`text/gemini\`, \`text/plain\`) |
| \`token\` | Authenticatie-token (optioneel, server-specifiek) |

### Authenticatie
Titan-servers kunnen authenticatie vereisen via:
1. **Token** — via \`token=geheim\` in de URL
2. **TLS client certificate** — vergelijkbaar met Gemini (voorkeur)

### Relatie tot Gemini
\`\`\`
Lezen:   gemini://wiki.nl/artikel/python   → GET (Gemini)
Schrijven: titan://wiki.nl/artikel/python  → PUT (Titan)
Zelfde TLS-verbinding, poort 1965
\`\`\``,

      toepassingen: `## Toepassingen

- **Gemini-wiki's**: Station-wiki's waarbij gebruikers direct artikelen bijwerken via Titan
- **Persoonlijk notitiesysteem**: Notities vanuit terminal uploaden naar eigen capsule
- **Gedeelde logboeken**: Meerdere gebruikers voegen toe aan een gezamenlijk dagboek
- **Bestands-opslag**: Eenvoudige bestandsserver voor tekst en kleine binaire bestanden
- **Blog-publicatie**: Lokaal geschreven .gmi-bestanden automatisch uploaden`,

      opties: `## Opties & Configuratie

### Titanverzoek-opbouw
\`\`\`
titan://host/pad;size=42;mime=text/gemini;token=geheim\\r\\n
[42 bytes inhoud volgen direct na CRLF]
\`\`\`

### Server-implementaties
| Server | Taal | Opmerkingen |
|--------|------|------------|
| Titan (referentie) | Go | Eenvoudige referentie-implementatie |
| Satelite | Rust | Volledige Gemini+Titan server |
| Station wiki | Python | Wiki-systeem met Titan-upload |

### Foutcodes (Gemini-statuscodes)
\`\`\`
20 text/gemini   ← Upload geslaagd
59 Slecht verzoek ← Ongeldige parameters
61 Certificaat vereist ← TLS client cert nodig
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python — Titan-upload
\`\`\`python
import ssl, socket

def titan_upload(host, pad, inhoud: str, token='', mime='text/gemini'):
    """Upload inhoud naar een Titan-server."""
    body  = inhoud.encode('utf-8')
    query = f'titan://{host}{pad};size={len(body)};mime={mime}'
    if token:
        query += f';token={token}'
    query += '\\r\\n'

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode    = ssl.CERT_NONE

    with socket.create_connection((host, 1965), timeout=15) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as tls:
            tls.sendall(query.encode() + body)
            respons = b''
            while chunk := tls.recv(4096):
                respons += chunk

    header, _, pagina = respons.partition(b'\\r\\n')
    return header.decode(), pagina.decode()

# Artikel uploaden naar een Station-wiki
artikel = """# Mijn Artikel

Dit is een Gemini-pagina die via Titan geüpload is.

* Punt één
* Punt twee

=> gemini://wiki.nl/ Terug naar startpagina
"""

header, respons = titan_upload(
    host  = 'wiki.nl',
    pad   = '/artikel/mijn-pagina',
    inhoud = artikel,
    token = 'mijn-geheime-token'
)
print('Status:', header)
print('Respons:', respons[:200])
\`\`\``
    }
  },

  guppy: {
    id: 'guppy', name: 'Guppy', fullName: 'Guppy Protocol',
    version: 'Specificatie 2021', standard: 'Community specificatie',
    color: '#0891B2', transport: 'UDP', port: '6775',
    model: 'Client-Server (UDP request/response)', qos: 'Sequentienummers', security: 'Geen / optioneel DTLS',
    category: 'Small Internet', idealFor: 'Resource-beperkte apparaten, UDP-only netwerken, embedded Gemini',
    tags: ['UDP', 'Gemini-variant', 'Embedded', 'Lichtgewicht'],
    shortDesc: 'Een UDP-gebaseerde Gemini-variant voor resource-beperkte apparaten — minimale overhead, sequentienummers voor betrouwbaarheid, geen TLS vereist.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0891B2"/>
      <ellipse cx="28" cy="32" rx="16" ry="10" stroke="white" stroke-width="2.5" fill="none"/>
      <path d="M44 32 Q54 24 50 32 Q54 40 44 32Z" fill="white" opacity="0.8"/>
      <circle cx="22" cy="29" r="2.5" fill="white"/>
      <line x1="16" y1="26" x2="10" y2="20" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="16" y1="32" x2="9"  y2="32" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="16" y1="38" x2="10" y2="44" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Guppy is een lichtgewicht documentprotocol gebaseerd op **UDP** in plaats van TCP/TLS, geïnspireerd op Gemini maar ontworpen voor apparaten met weinig rekenkracht en geheugen. Het werd ontwikkeld door Alex Schroeder als alternatief voor situaties waarbij TCP-overhead of TLS-handshakes te zwaar zijn.

UDP brengt uitdagingen mee (geen garantie op aflevering, geen volgorde), maar Guppy lost dit op via **sequentienummers** en een eenvoudig hertransmissiemechanisme. De berichten zijn ontworpen om in één UDP-datagram te passen (max. ~1400 bytes per pakket), vergelijkbaar met hoe DNS werkt.

**Guppy vs. Gemini:**
- Geen TLS-handshake (snellere verbinding)
- UDP in plaats van TCP (geen three-way handshake)
- Maximale pakketgrootte: past in één datagram
- Sequentienummers voor betrouwbare aflevering`,

      werking: `## Werking

### Pakket-structuur
\`\`\`
Verzoek:  [4-byte seq] SP [URL] CRLF
Respons:  [4-byte seq] SP [statuscode] CRLF [body]
\`\`\`

Elk datagram begint met een 4-bytes big-endian **sequentienummer** gevolgd door een spatie.

### Verzoek-stroom
\`\`\`
Client → seq=1 guppy://host/pad\\r\\n       (UDP datagram)
Server ← seq=1 2 text/gemini\\r\\n[data]    (respons datagram 1)
Server ← seq=2 [vervolgdata]               (volgende datagrammen)
Client → seq=2 \\r\\n                       (bevestiging van seq 2)
...
Server ← seq=N 2 \\r\\n                    (einde-markering)
\`\`\`

### Statuscodes (vergelijkbaar met Gemini)
| Code | Beschrijving |
|------|-------------|
| 1 | Input vereist |
| 2 | Succes |
| 3 | Redirect |
| 4 | Tijdelijke fout |
| 5 | Permanente fout |
| 6 | Clientcertificaat vereist |`,

      toepassingen: `## Toepassingen

- **Microcontrollers**: ESP8266/ESP32 met beperkt geheugen kunnen Guppy-client implementeren
- **UDP-only netwerken**: Netwerken waar TCP verboden of onmogelijk is (sommige IoT-netwerken)
- **Lage-latentie documenten**: Geen handshake-overhead voor frequente korte verzoeken
- **Embedded webinterfaces**: Configuratie-interfaces op embedded apparaten
- **Experimentele Geminispace-clients**: Testen van protocolvarianten`,

      opties: `## Opties & Configuratie

### Pakket-limieten
| Parameter | Waarde | Reden |
|-----------|--------|-------|
| Max. datagramgrootte | ~1400 bytes | Past in één Ethernet-frame (MTU - headers) |
| Sequentienummerveld | 4 bytes (uint32) | Max. ~4 miljard pakketten |
| Timeout hertransmissie | ~5 seconden | Implementatie-afhankelijk |
| Max. hertransmissies | ~3 pogingen | Implementatie-afhankelijk |

### URL-schema
\`\`\`
guppy://host:6775/pad
       └── poort optioneel, standaard 6775
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python — Guppy-client
\`\`\`python
import socket
import struct

def guppy_get(host, pad='/', poort=6775):
    """Haal een Guppy-document op via UDP."""
    url    = f'guppy://{host}{pad}'
    seq    = 1
    verzoek = struct.pack('>I', seq) + b' ' + url.encode() + b'\\r\\n'

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(5)

    sock.sendto(verzoek, (host, poort))

    gegevens = b''
    try:
        while True:
            datagram, _ = sock.recvfrom(2048)
            resp_seq = struct.unpack('>I', datagram[:4])[0]
            inhoud   = datagram[5:]  # sla seq + spatie over

            if resp_seq == seq and inhoud.strip() == b'':
                break  # Einde-markering

            gegevens += inhoud

            # Bevestig dit datagram
            bevestiging = struct.pack('>I', resp_seq) + b' \\r\\n'
            sock.sendto(bevestiging, (host, poort))
            seq = resp_seq + 1

    except socket.timeout:
        pass  # Geen meer data

    sock.close()

    # Header en body scheiden
    header, _, body = gegevens.partition(b'\\r\\n')
    return header.decode(), body.decode('utf-8', errors='replace')

header, inhoud = guppy_get('guppy.example.tld', '/')
print('Status:', header)
print('Inhoud:', inhoud[:200])
\`\`\``
    }
  },

  nex: {
    id: 'nex', name: 'Nex', fullName: 'Nex Protocol',
    version: 'Specificatie 2021', standard: 'Community specificatie',
    color: '#059669', transport: 'TCP', port: '1900',
    model: 'Client-Server (selector → raw content)', qos: 'Geen', security: 'Geen',
    category: 'Small Internet', idealFor: 'Maximaal eenvoudige tekstpublicatie, terminal-gebruikers',
    tags: ['Small Internet', 'Ultra-simpel', 'TCP', 'Tekst'],
    shortDesc: 'Het eenvoudigste denkbare documentprotocol: client stuurt een pad, server stuurt ruwe inhoud — geen headers, geen statuscodes, geen TLS.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#059669"/>
      <line x1="10" y1="32" x2="46" y2="32" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
      <polyline points="36,20 50,32 36,44" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Nex (ook wel "nex protocol") is het meest minimalistische documentprotocol in de Small Internet-gemeenschap. Het werkt op TCP poort 1900 en is letterlijk zo simpel als het maar kan: de client stuurt een pad, de server stuurt ruwe inhoud terug — geen statuscodes, geen MIME-types, geen headers, geen TLS.

Nex is bedoeld als een nog eenvoudigere alternatief voor zowel Gopher als Gemini. Het \`nex://\` URL-schema wordt gebruikt. Inhoud is altijd platte tekst of Gemtext (de meeste Nex-servers serveren .gmi-bestanden).

**Filosofie:** "What if we removed everything we could possibly remove?"`,

      werking: `## Werking

### Protocol in drie regels
\`\`\`
Client → "/pad/naar/bestand\\r\\n"
Server ← [raw bestandsinhoud]
         [TCP-verbinding sluit als server klaar is]
\`\`\`

Dat is het volledige protocol. Geen headers. Geen statuscodes. De client weet dat de verbinding sluit wanneer de server klaar is.

### Wat er ontbreekt (vergeleken met Gemini)
| Feature | Gemini | Nex |
|---------|--------|-----|
| TLS | Verplicht | Geen |
| Statuscodes | Ja (20, 30, 40, ...) | Nee |
| MIME-type header | Ja | Nee |
| Redirect | Ja (30) | Nee |
| Foutafhandeling | Ja (40, 50) | Nee |

### Nex-mapstructuur (conventie)
\`\`\`
/index.gmi    ← startpagina (Gemtext)
/log/         ← blog-map
/about.txt    ← info
\`\`\`
Bestanden worden direct geserveerd; mappen serveren doorgaans \`index.gmi\`.`,

      toepassingen: `## Toepassingen

- **Ultra-minimale persoonlijke sites**: Iemand die absoluut niets complexer wil dan nodig
- **Leeromgeving**: Het implementeren van een Nex-server duurt 10 minuten en leert je alles over protocollen
- **LAN-bestandsservers**: Snel tekst delen op lokaal netwerk
- **Testomgeving voor Gemtext**: Gemtext-bestanden tonen zonder Gemini-server
- **Scriptable content**: Eenvoudig te bevragen met \`nc\` of Python in scripts`,

      opties: `## Opties & Configuratie

Nex heeft nauwelijks configuratie — dat is het punt. Typische server-instellingen:

| Instelling | Beschrijving |
|------------|-------------|
| Poort | 1900 (standaard) |
| Content-map | Map met .gmi en .txt bestanden |
| Index-bestand | index.gmi (conventie voor mappen) |
| Encoding | UTF-8 |

### Minimale Nex-server in bash
\`\`\`bash
#!/bin/bash
# nex-server.sh — start met: socat TCP-LISTEN:1900,fork EXEC:./nex-server.sh
CONTENT="/srv/nex"
read -r pad
pad=\${pad%%$'\\r'}                     # Verwijder \\r
pad=\${pad:-/}
bestand="\${CONTENT}\${pad}"
[ -d "\$bestand" ] && bestand="\${bestand}/index.gmi"
[ -f "\$bestand" ] && cat "\$bestand" || echo "Niet gevonden"
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python — Nex-client (10 regels)
\`\`\`python
import socket

def nex_get(host, pad='/', poort=1900):
    with socket.create_connection((host, poort), timeout=10) as s:
        s.sendall((pad + '\\r\\n').encode())
        data = b''
        while chunk := s.recv(4096):
            data += chunk
    return data.decode('utf-8', errors='replace')

inhoud = nex_get('nex.example.tld', '/')
print(inhoud[:300])
\`\`\`

### Python — Nex-server (20 regels)
\`\`\`python
import socketserver, os

CONTENT = '/srv/nex'

class NexHandler(socketserver.StreamRequestHandler):
    def handle(self):
        pad = self.rfile.readline().decode().strip().rstrip('\\r')
        pad = pad or '/'
        bestand = os.path.join(CONTENT, pad.lstrip('/'))
        if os.path.isdir(bestand):
            bestand = os.path.join(bestand, 'index.gmi')
        try:
            with open(bestand, 'rb') as f:
                self.wfile.write(f.read())
        except FileNotFoundError:
            self.wfile.write(b'Niet gevonden.\\n')

socketserver.TCPServer(('', 1900), NexHandler).serve_forever()
\`\`\`

### Netcat — directe verbinding
\`\`\`bash
# Document ophalen
echo -e "/index.gmi\\r" | nc nex.example.tld 1900

# Of via curl (experimentele ondersteuning)
# curl nex://nex.example.tld/
\`\`\``
    }
  },

  finger: {
    id: 'finger', name: 'Finger', fullName: 'Finger Protocol',
    version: 'RFC 1288 (1991)', standard: 'IETF RFC 742, RFC 1288',
    color: '#D97706', transport: 'TCP', port: '79',
    model: 'Client-Server (query → profiel)', qos: 'Geen', security: 'Geen',
    category: 'Small Internet', idealFor: 'Persoonlijke profielen, statusupdates, contactinfo',
    tags: ['Klassiek', 'TCP', 'Profiel', 'Minimaal'],
    shortDesc: 'Het oorspronkelijke sociale protocol uit 1977: bevraag wie er online is of lees het profiel van iemand via een eenvoudige TCP-verbinding op poort 79.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#D97706"/>
      <path d="M28 52 L28 30 Q28 26 32 26 Q36 26 36 30 L36 36" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M36 36 Q36 28 40 28 Q44 28 44 32 L44 40" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M36 52 L28 52" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 38 Q20 22 28 22 L28 30" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M44 40 L44 52 L36 52" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Finger is een van de oudste interactieve internetprotocollen, oorspronkelijk ontworpen in 1977 door Les Earnest aan Stanford. RFC 742 (1977) en RFC 1288 (1991) beschrijven het protocol. Het was bedoeld om UNIX-gebruikers te laten zien wie er ingelogd was op een systeem en basisinformatie over die gebruikers te tonen.

Het protocol is uiterst eenvoudig: de client maakt een TCP-verbinding op poort 79, stuurt een gebruikersnaam (of lege query), en de server stuurt platte tekst terug. Finger was jarenlang standaard op UNIX-systemen maar werd uitgeschakeld vanwege privacyzorgen.

Vandaag de dag beleeft Finger een **revival** in de Small Internet-gemeenschap als minimale persoonlijke homepage:
- \`finger gebruiker@server\` geeft een persoonlijk profiel in platte tekst
- Servers zoals SDF.org en ~tilde.club bieden Finger-diensten aan
- Sommige mensen publiceren hun blog, CV of status via Finger`,

      werking: `## Werking

### Protocol-stroom
\`\`\`
Client → "gebruiker\\r\\n"              (gebruikersnaam + CRLF)
Client → "/W gebruiker\\r\\n"           (/W = uitgebreide informatie)
Client → "\\r\\n"                        (lege query = wie is er online?)
Server ← [platte tekst, verbinding sluit]
\`\`\`

### Typische server-respons
\`\`\`
Login: jansen              Name: Jan Jansen
Directory: /home/jansen    Shell: /bin/bash
On since Mon Jan 15 14:22 (CET) on pts/0 from 192.168.1.10
Mail last read Mon Jan 15 13:45 2025 (CET)
No Plan.

------- .plan -------
Momenteel bezig met:
- Mijn Gemini-capsule bijwerken
- Een nieuwe Gopher-server opzetten
\`\`\`

### .plan en .project bestanden
- **\`~/.plan\`**: Persoonlijke statustekst, vrij in te vullen
- **\`~/.project\`**: Korte beschrijving van huidige project
- Beide worden automatisch getoond door de Finger-server

### Doorsturen (forwarding)
\`finger @server\` geeft een lijst van ingelogde gebruikers.
\`finger gebruiker@server\` geeft het profiel van een specifieke gebruiker.`,

      toepassingen: `## Toepassingen

- **Persoonlijk profiel**: Statustekst, actuele bezigheid, contactinformatie
- **Miniblog via .plan**: Regelmatige updates in ~/.plan als alternatief voor sociale media
- **Online-status systemen**: Wie is er actief op een gedeelde UNIX-server?
- **Open contactpagina's**: E-mailadressen, PGP-sleutels, links in platte tekst
- **SDF.org community**: Actief Finger-ecosysteem met honderden gebruikers
- **Automatische statusupdates**: Script dat ~/.plan bijwerkt vanuit andere systemen (agenda, voortgang)`,

      opties: `## Opties & Configuratie

### Queryvormen
| Query | Beschrijving |
|-------|-------------|
| \`gebruiker\\r\\n\` | Profiel van gebruiker opvragen |
| \`/W gebruiker\\r\\n\` | Uitgebreide informatie |
| \`\\r\\n\` | Lijst van ingelogde gebruikers |
| \`gebruiker@ander-host\\r\\n\` | Forwarding naar ander systeem |

### Finger URL-schema
\`\`\`
finger://gebruiker@server        ← direct profiel
finger://@server                 ← wie is er online
\`\`\`

### .plan bestand aanmaken
\`\`\`bash
cat > ~/.plan << 'EOF'
Bezig met: Bijwerken van mijn Gopher-hole
Status: Online

Recente berichten:
- 2025-01-15: Nieuw artikel over Gemini-protocollen
- 2025-01-10: LoRaWAN-sensor geïnstalleerd
EOF
chmod 644 ~/.plan
\`\`\``,

      voorbeeld: `## Voorbeeld

### Python — Finger-client
\`\`\`python
import socket

def finger(gebruiker='', server='sdf.org', poort=79):
    """Bevraag een Finger-server."""
    with socket.create_connection((server, poort), timeout=10) as s:
        query = (f'{gebruiker}\\r\\n').encode()
        s.sendall(query)
        respons = b''
        while chunk := s.recv(4096):
            respons += chunk
    return respons.decode('utf-8', errors='replace')

# Profiel van specifieke gebruiker
print(finger('gebraham', 'sdf.org'))

# Wie is er online op de server?
print(finger('', 'tilde.club'))
\`\`\`

### Bash — Finger gebruiken
\`\`\`bash
# Gebruik de ingebouwde finger-client
finger gebruiker@sdf.org

# Met netcat
echo -e "gebruiker\\r" | nc sdf.org 79

# .plan automatisch bijwerken vanuit script
#!/bin/bash
cat > ~/.plan << EOF
Laatste update: \$(date '+%Y-%m-%d %H:%M')
Systeemstatus: \$(uptime -p)
Weerbericht: \$(curl -s 'wttr.in/Amsterdam?format=3')
EOF
\`\`\`

### Python — Minimale Finger-server
\`\`\`python
import socketserver, os, pwd

class FingerHandler(socketserver.StreamRequestHandler):
    def handle(self):
        query = self.rfile.readline().decode().strip().lstrip('/W').strip()
        if not query:
            # Lijst van ingelogde gebruikers (vereenvoudigd)
            self.wfile.write(b'Finger-server actief.\\n')
            return
        try:
            info = pwd.getpwnam(query)
            plan_pad = os.path.join(info.pw_dir, '.plan')
            self.wfile.write(f'Login: {query}  Dir: {info.pw_dir}\\n'.encode())
            if os.path.exists(plan_pad):
                with open(plan_pad, 'rb') as f:
                    self.wfile.write(b'--- .plan ---\\n' + f.read())
        except KeyError:
            self.wfile.write(b'Gebruiker niet gevonden.\\n')

socketserver.TCPServer(('', 79), FingerHandler).serve_forever()
\`\`\``
    }
  },

  twtxt: {
    id: 'twtxt', name: 'Twtxt', fullName: 'Twtxt Decentralised Microblogging',
    version: 'v1.0 (2016)', standard: 'Community specificatie (cfenollosa)',
    color: '#1F2937', transport: 'HTTP / Gopher / Gemini (bestandsdeling)', port: '80 / 443',
    model: 'Pull (gedeeld tekstbestand)', qos: 'Geen', security: 'HTTPS (optioneel)',
    category: 'Gedecentraliseerd', idealFor: 'Microblogging zonder platform, terminal-gebruikers, kleine gemeenschappen',
    tags: ['Gedecentraliseerd', 'Tekst', 'Microblog', 'Pull'],
    shortDesc: 'Gedecentraliseerd microbloggen via eenvoudige platte tekstbestanden — geen server nodig, geen registratie, geen tracking.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#1F2937"/>
      <rect x="10" y="12" width="44" height="8"  rx="2" fill="white" opacity="0.8"/>
      <rect x="10" y="24" width="44" height="8"  rx="2" fill="white" opacity="0.6"/>
      <rect x="10" y="36" width="44" height="8"  rx="2" fill="white" opacity="0.4"/>
      <rect x="10" y="48" width="30" height="8"  rx="2" fill="white" opacity="0.2"/>
      <text x="13" y="19" fill="#1F2937" font-size="6" font-family="Ubuntu Mono,monospace">2025-01-15T10:00Z</text>
      <text x="13" y="31" fill="#1F2937" font-size="6" font-family="Ubuntu Mono,monospace">2025-01-14T08:30Z</text>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Twtxt is een gedecentraliseerd microblogformaat ontworpen in 2016 door Christian Kellner (buckket). De kern is extreem eenvoudig: berichten worden opgeslagen in een **plat tekstbestand**, gehost op een gewone webserver, en clients halen de bestanden van alle gevolgde gebruikers periodiek op.

Er is geen centrale server, geen registratie, geen algoritme en geen tracking. Je volgt iemand door hun twtxt-bestand URL toe te voegen aan je configuratie. Je publiceert door regels toe te voegen aan jouw eigen twtxt-bestand.

**Actieve implementaties:**
- **twtxt** (originele Python CLI)
- **txtnish** (uitgebreide shell-client)
- **jenny** (Go-client)
- **yarn.social** (federatief twtxt-platform)
- **tt** (TUI-client)`,

      werking: `## Werking

### Bestandsformaat
Elke regel in het twtxt-bestand is een bericht:
\`\`\`
[ISO8601 tijdstempel][TAB][berichttekst]
\`\`\`

Voorbeeld van een twtxt.txt bestand:
\`\`\`
2025-01-15T10:30:00+01:00	Hallo Twtxtwereld! Mijn eerste bericht.
2025-01-15T14:22:00+01:00	Bezig met mijn Gemini-capsule bouwen. #gemini
2025-01-16T09:00:00+01:00	@<jan https://jan.nl/twtxt.txt> Leuk artikel!
\`\`\`

### Mentions en Hashtags
\`\`\`
@<weergavenaam url-van-twtxt-bestand>   ← mention
#onderwerp                               ← hashtag
\`\`\`

### Discovery
Clients detecteren nieuwe berichten door periodiek (bijv. elk uur) alle gevolgde twtxt-bestanden op te halen via HTTP GET. Nieuwere regels zijn normaal onderaan.

### Metadata (optioneel, commentaarregels)
\`\`\`
# nick = jan
# url  = https://jan.nl/twtxt.txt
# description = Mijn persoonlijke twtxt-feed
\`\`\``,

      toepassingen: `## Toepassingen

- **Persoonlijk microbloggen**: Korte statusupdates, dagelijkse gedachten, projectvoortgang
- **Technische gemeenschappen**: Twtxt-gebruikers zijn typisch developers, sysadmins, UNIX-enthousiastelingen
- **Gedecentraliseerde nieuwsfeeds**: Volg mensen zonder afhankelijk te zijn van een platform
- **Indieweb-integratie**: Combineren met persoonlijke website, Gemini-capsule of Gopherhole
- **Hashtaggroepen**: Onderwerpen volgen via hashtag-aggregators
- **yarn.social**: Federated twtxt-platform met extra features (threads, media)`,

      opties: `## Opties & Configuratie

### twtxt configuratiebestand (\`~/.config/twtxt/config\`)
\`\`\`ini
[twtxt]
nick           = jansen
twturl         = https://mijnsite.nl/twtxt.txt
twtfile        = /var/www/html/twtxt.txt
limit_timeline = 20
timeline_update_interval = 10
use_pager      = true
check_following = true

[following]
jan = https://jan.nl/twtxt.txt
lisa = https://lisa.io/feed.txt
\`\`\`

### Berichtopmaak-regels
| Element | Syntax | Voorbeeld |
|---------|--------|---------|
| Mention | \`@<naam url>\` | \`@<jan https://jan.nl/twtxt.txt>\` |
| Hashtag | \`#woord\` | \`#gemini #twtxt\` |
| Link | Kale URL | \`https://voorbeeld.nl\` |`,

      voorbeeld: `## Voorbeeld

### Bash — Twtxt-bericht publiceren
\`\`\`bash
#!/bin/bash
TWTXT_BESTAND="$HOME/public_html/twtxt.txt"

bericht="$*"
tijdstip=\$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")

echo -e "\${tijdstip}\\t\${bericht}" >> "\$TWTXT_BESTAND"
echo "Gepubliceerd: \$bericht"

# Voorbeeld gebruik:
# ./twtxt-post.sh "Hallo wereld! #test"
\`\`\`

### Python — Twtxt-feed lezen
\`\`\`python
import requests, csv
from datetime import datetime
from io import StringIO

def lees_twtxt(url: str) -> list[dict]:
    """Haal een twtxt-feed op en parseer de berichten."""
    respons = requests.get(url, timeout=10,
                           headers={'User-Agent': 'MijnTwtxtClient/1.0'})
    respons.raise_for_status()

    berichten = []
    for regel in respons.text.splitlines():
        if regel.startswith('#') or not regel.strip():
            continue  # Sla commentaar en lege regels over
        if '\\t' in regel:
            tijdstip_str, _, tekst = regel.partition('\\t')
            try:
                tijdstip = datetime.fromisoformat(tijdstip_str)
                berichten.append({'tijdstip': tijdstip, 'tekst': tekst})
            except ValueError:
                continue
    return sorted(berichten, key=lambda x: x['tijdstip'], reverse=True)

# Meerdere feeds ophalen en samenvoegen
feeds = [
    'https://buckket.org/twtxt.txt',
    'https://www.uninformativ.de/twtxt.txt',
]

alle_berichten = []
for feed_url in feeds:
    try:
        alle_berichten.extend(lees_twtxt(feed_url))
    except Exception as e:
        print(f'Kon {feed_url} niet laden: {e}')

# Tijdlijn tonen
for bericht in sorted(alle_berichten, key=lambda x: x['tijdstip'], reverse=True)[:10]:
    print(f"[{bericht['tijdstip'].strftime('%Y-%m-%d %H:%M')}] {bericht['tekst']}")
\`\`\``
    }
  },

  nostr: {
    id: 'nostr', name: 'Nostr', fullName: 'Notes and Other Stuff Transmitted by Relays',
    version: 'NIP-01 (2020)', standard: 'Community NIPs (Nostr Implementation Possibilities)',
    color: '#7C3AED', transport: 'WebSocket (WSS)', port: '443 (WSS)',
    model: 'Event-gebaseerd Pub/Sub via Relays', qos: 'Relay-afhankelijk', security: 'Secp256k1 cryptografie',
    category: 'Gedecentraliseerd', idealFor: 'Gecensuurbestendige sociale media, gedecentraliseerde communicatie',
    tags: ['Gedecentraliseerd', 'WebSocket', 'Crypto', 'Sociaal'],
    shortDesc: 'Een gedecentraliseerd, gecensuurbestendig protocol voor sociale notities — cryptografisch ondertekende JSON-events via WebSocket-relays, zonder centrale autoriteit.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#7C3AED"/>
      <polygon points="32,8 38,26 56,26 42,37 47,55 32,44 17,55 22,37 8,26 26,26" fill="white" opacity="0.15" stroke="white" stroke-width="1.5"/>
      <circle cx="32" cy="32" r="6" fill="white"/>
      <circle cx="14" cy="20" r="4" fill="white" opacity="0.7"/>
      <circle cx="50" cy="20" r="4" fill="white" opacity="0.7"/>
      <circle cx="50" cy="48" r="4" fill="white" opacity="0.7"/>
      <circle cx="14" cy="48" r="4" fill="white" opacity="0.7"/>
      <line x1="26" y1="30" x2="18" y2="23" stroke="white" stroke-width="1.5" opacity="0.8"/>
      <line x1="38" y1="30" x2="46" y2="23" stroke="white" stroke-width="1.5" opacity="0.8"/>
      <line x1="38" y1="34" x2="46" y2="45" stroke="white" stroke-width="1.5" opacity="0.8"/>
      <line x1="26" y1="34" x2="18" y2="45" stroke="white" stroke-width="1.5" opacity="0.8"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Nostr (Notes and Other Stuff Transmitted by Relays) is een open protocol voor gedecentraliseerde, gecensuurbestendige communicatie, ontwikkeld in 2020 door "fiatjaf". In plaats van te vertrouwen op centrale servers gebruikt Nostr **cryptografische sleutelparen** (secp256k1, dezelfde curve als Bitcoin) voor identiteit en **relays** (eenvoudige WebSocket-servers) voor berichtdistributie.

Elke gebruiker heeft een privésleutel (\`nsec\`) en een publieke sleutel (\`npub\`). Berichten (events) worden ondertekend en naar meerdere relays gestuurd. Clients verbinden met meerdere relays en filteren events op basis van sleutel, type of tijdstip.

**NIPs (Nostr Implementation Possibilities)** zijn de extensiestandaarden:
- **NIP-01**: Basisprotocol (events, filters, relays)
- **NIP-04**: Versleutelde directe berichten
- **NIP-09**: Event-verwijdering
- **NIP-57**: Lightning Network zaps (micropayments)
- **NIP-65**: Relay-lijstmetadata`,

      werking: `## Werking

### Event-structuur
Elk Nostr-event is een JSON-object:
\`\`\`json
{
  "id":         "sha256-hash van de geserialiseerde event",
  "pubkey":     "hex secp256k1 publieke sleutel",
  "created_at": 1705312200,
  "kind":       1,
  "tags":       [["e", "event-id"], ["p", "pubkey"]],
  "content":    "Hallo Nostrwereld!",
  "sig":        "Schnorr handtekening over het id"
}
\`\`\`

### Event-typen (kind)
| Kind | Beschrijving |
|------|-------------|
| 0 | Gebruikersmetadata (naam, bio, avatar) |
| 1 | Tekstnotitie (basisbericht) |
| 3 | Contactlijst (gevolgde pubkeys) |
| 4 | Versleuteld direct bericht (NIP-04) |
| 5 | Event-verwijdering |
| 6 | Repost |
| 7 | Reactie |
| 9734/9735 | Lightning Zap-verzoek / bevestiging |

### Relay-communicatie (WebSocket)
\`\`\`json
// Publiceer
["EVENT", { ...event object... }]

// Abonneer op events
["REQ", "abonnement-id", { "kinds": [1], "limit": 20, "since": 1705000000 }]

// Relay stuurt event
["EVENT", "abonnement-id", { ...event... }]

// Abonnement beëindigen
["CLOSE", "abonnement-id"]
\`\`\``,

      toepassingen: `## Toepassingen

- **Gecensuurbestendige sociale media**: Alternatieven voor Twitter/X (Damus, Amethyst, Iris)
- **Micropayments via Lightning**: Content monetariseren met Bitcoin Lightning-zaps
- **Gedecentraliseerde chat**: Direct messages, groepsgesprekken
- **Live-events**: Livestream-metadata, real-time commentaar (NIP-53)
- **Authenticatie**: Nostr-sleutels als login-methode voor websites (NIP-07)
- **Marktplaatsen**: Gedecentraliseerde handel (NIP-15)
- **Lange berichten**: Blog-posts via kind 30023 (long-form content)`,

      opties: `## Opties & Configuratie

### Populaire Relays
| Relay | URL | Beleid |
|-------|-----|--------|
| damus.io | wss://relay.damus.io | Openbaar |
| nostr.wine | wss://nostr.wine | Betaald |
| nos.lol | wss://relay.nos.lol | Openbaar |
| purplepag.es | wss://purplepag.es | Metadata |

### Sleutelformaten (bech32)
| Prefix | Type | Voorbeeld |
|--------|------|---------|
| \`npub\` | Publieke sleutel | \`npub1abc...xyz\` |
| \`nsec\` | Privésleutel (geheim!) | \`nsec1abc...xyz\` |
| \`note\` | Event-ID | \`note1abc...xyz\` |
| \`nprofile\` | Profiel + relays | \`nprofile1...\` |

### Filtermogelijkheden
\`\`\`json
{
  "ids":     ["event-id-1", "event-id-2"],
  "authors": ["pubkey-1", "pubkey-2"],
  "kinds":   [1, 6, 7],
  "since":   1705000000,
  "until":   1705312200,
  "limit":   50,
  "#t":      ["nostr", "bitcoin"]
}
\`\`\``,

      voorbeeld: `## Voorbeeld

### JavaScript (nostr-tools)
\`\`\`javascript
import { generateSecretKey, getPublicKey, finalizeEvent,
         SimplePool } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

// Sleutelpaar genereren
const privkey = generateSecretKey();
const pubkey  = getPublicKey(privkey);
console.log('Publieke sleutel:', pubkey);

// Event aanmaken en ondertekenen
const event = finalizeEvent({
  kind:       1,
  created_at: Math.floor(Date.now() / 1000),
  tags:       [['t', 'lpw'], ['t', 'test']],
  content:    'Hallo Nostrwereld via JavaScript!'
}, privkey);

// Relays verbinden en event publiceren
const pool  = new SimplePool();
const relays = ['wss://relay.damus.io', 'wss://relay.nostr.band'];

await Promise.any(pool.publish(relays, event));
console.log('Event gepubliceerd:', event.id);

// Berichten ophalen
const sub = pool.subscribeMany(relays, [
  { kinds: [1], limit: 10, '#t': ['lpw'] }
], {
  onevent(event) {
    console.log(\`[\${new Date(event.created_at * 1000).toLocaleString()}]\`);
    console.log(event.content);
  }
});

// Na 5 seconden afsluiten
setTimeout(() => { sub.close(); pool.close(relays); }, 5000);
\`\`\`

### Python (pynostr)
\`\`\`python
from pynostr.key         import PrivateKey
from pynostr.event       import Event
from pynostr.relay_manager import RelayManager
import time

# Sleutels
privkey = PrivateKey()
print('npub:', privkey.public_key.bech32())

# Relay-manager
manager = RelayManager()
manager.add_relay('wss://relay.damus.io')
manager.open_connections({"cert_reqs": False})
time.sleep(1.5)

# Event publiceren
event = Event(content='Hallo via Python! #nostr #lpw',
              public_key=privkey.public_key.hex())
privkey.sign_event(event)
manager.publish_event(event)
print('Gepubliceerd:', event.id)

time.sleep(1)
manager.close_connections()
\`\`\``
    }
  },

  misfin: {
    id: 'misfin', name: 'Misfin', fullName: 'Misfin Messaging Protocol',
    version: 'Rev. B (2021)', standard: 'Community specificatie',
    color: '#0F766E', transport: 'TCP + TLS', port: '1958',
    model: 'Push messaging (client → server)', qos: 'Geen', security: 'TLS + client certificates',
    category: 'Small Internet', idealFor: 'Privéberichten in Geminispace, e-mailachtige communicatie zonder SMTP',
    tags: ['Gemini', 'Messaging', 'TLS', 'Privébericht'],
    shortDesc: 'Een eenvoudig berichtenprotocol voor Geminispace — stuur berichten via TLS met client-certificaten als identiteit, zonder wachtwoorden of e-mailserver.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0F766E"/>
      <rect x="10" y="18" width="44" height="32" rx="4" stroke="white" stroke-width="2.5" fill="none"/>
      <polyline points="10,22 32,36 54,22" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="46" cy="46" r="8" fill="#0F766E" stroke="white" stroke-width="2"/>
      <line x1="43" y1="46" x2="49" y2="46" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="46" y1="43" x2="46" y2="49" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Misfin is een lichtgewicht berichtenprotocol ontworpen voor de Gemini-gemeenschap, gepresenteerd in 2021. Het biedt een simpele manier om berichten te sturen tussen gebruikers in Geminispace — vergelijkbaar met e-mail maar zonder de complexiteit van SMTP, IMAP en wachtwoordbeheer.

Misfin gebruikt **TLS client certificates** voor identiteit, identiek aan hoe Gemini optionele authenticatie ondersteunt. Er is geen wachtwoord: je bent wie je TLS-certificaat zegt dat je bent. Adressen volgen het formaat \`gebruiker@domein\` (zoals e-mail).

**Protocol-poort:** 1958 (TCP + TLS verplicht)`,

      werking: `## Werking

### Protocolstroom
\`\`\`
Client brengt TLS-verbinding tot stand (met client certificate)
Client → "misfin://ontvanger@domein beknopte-beschrijving\\r\\n"
         [optionele berichttekst na CRLF]
Server ← "20 Afgeleverd\\r\\n"   (succes)
         of andere statuscode
\`\`\`

### Statuscodes
| Code | Beschrijving |
|------|-------------|
| 20 | Bericht afgeleverd |
| 30 | Redirect — stuur naar ander adres |
| 40 | Tijdelijke fout |
| 50 | Permanente fout (adres bestaat niet) |
| 60 | Clientcertificaat vereist |
| 61 | Certificaat niet geautoriseerd |

### Adresformaat
\`\`\`
gebruiker@mijn-domein.nl     ← Misfin-adres (ziet eruit als e-mail)
\`\`\`

### Identiteitsmodel
- Elke gebruiker heeft een TLS-certificaat (zoals Gemini)
- De publieke sleutel van het certificaat is de unieke identiteit
- **TOFU** (Trust On First Use): eerste contact legt vertrouwen vast
- Geen wachtwoorden, geen centrale autoriteit`,

      toepassingen: `## Toepassingen

- **Geminispace-berichten**: Communiceer met andere Gemini-gebruikers zonder e-mail
- **Contactformulieren op capsules**: Bezoekers sturen berichten via Misfin-knop
- **Kleine gemeenschappen**: Tilde-servers die Misfin aanbieden naast Gemini
- **Privénotities**: Stuur notities naar jezelf (archivering)
- **Gecombineerde Gemini+Misfin-servers**: Één server bedient beide protocollen`,

      opties: `## Opties & Configuratie

### TLS-certificaat aanmaken
\`\`\`bash
# Zelfondertekend certificaat voor Misfin-identiteit
openssl req -x509 -newkey rsa:2048 -keyout misfin-key.pem \\
  -out misfin-cert.pem -days 3650 -nodes \\
  -subj "/CN=gebruiker@mijn-domein.nl"
\`\`\`

### Berichtformaat
\`\`\`
misfin://ontvanger@server.nl korte beschrijving (max ~72 tekens)\\r\\n
[optionele berichttekst in Gemtext-formaat]
\`\`\`

### Server-configuratie (conceptueel)
| Instelling | Beschrijving |
|------------|-------------|
| \`hostname\` | Domeinnaam voor het TLS-certificaat |
| \`port\` | 1958 (standaard) |
| \`mailbox_dir\` | Map voor opgeslagen berichten per gebruiker |
| \`allowed_senders\` | Whitelist of openbaar |`,

      voorbeeld: `## Voorbeeld

### Python — Misfin-bericht sturen
\`\`\`python
import ssl, socket

def misfin_stuur(ontvanger_adres: str, beschrijving: str,
                 inhoud: str = '', cert_bestand='misfin-cert.pem',
                 sleutel_bestand='misfin-key.pem'):
    """
    Stuur een Misfin-bericht.
    ontvanger_adres: "gebruiker@server.nl"
    """
    gebruiker, _, server = ontvanger_adres.partition('@')

    ctx = ssl.create_default_context()
    ctx.load_cert_chain(certfile=cert_bestand, keyfile=sleutel_bestand)
    ctx.check_hostname = False
    ctx.verify_mode    = ssl.CERT_NONE  # TOFU

    with socket.create_connection((server, 1958), timeout=15) as sock:
        with ctx.wrap_socket(sock, server_hostname=server) as tls:
            verzoek = f'misfin://{ontvanger_adres} {beschrijving}\\r\\n'
            if inhoud:
                verzoek += inhoud
            tls.sendall(verzoek.encode('utf-8'))
            respons = tls.recv(1024).decode()

    print('Server-respons:', respons.strip())
    return respons.startswith('20')

# Gebruik
geslaagd = misfin_stuur(
    ontvanger_adres = 'vriend@gemini-server.nl',
    beschrijving    = 'Vraag over Gemini-protocol',
    inhoud          = '# Hallo\\n\\nHeb je tijd voor een korte vraag?\\n'
)
print('Afgeleverd!' if geslaagd else 'Mislukt.')
\`\`\``
    }
  },

  gemlog: {
    id: 'gemlog', name: 'Gemlog', fullName: 'Gemini Blog (Gemlog)',
    version: 'Conventie (geen RFC)', standard: 'Community conventie',
    color: '#6D28D9', transport: 'Gemini (TLS/TCP poort 1965)', port: '1965',
    model: 'Statische documenten (pull)', qos: 'Geen', security: 'TLS (via Gemini)',
    category: 'Small Internet Publicatie', idealFor: 'Persoonlijk bloggen in Geminispace, privacyvriendelijke publicatie',
    tags: ['Gemini', 'Blog', 'Gemtext', 'Conventie'],
    shortDesc: 'De standaardconventie voor bloggen in Geminispace — chronologische .gmi-bestanden in een /gemlog/ map, met optionele Atom-feed voor aggregators.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#6D28D9"/>
      <polygon points="32,10 40,22 54,24 44,34 46,48 32,42 18,48 20,34 10,24 24,22" fill="white" opacity="0.2" stroke="white" stroke-width="2"/>
      <line x1="38" y1="38" x2="52" y2="52" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <circle cx="34" cy="34" r="4" fill="white" opacity="0.8"/>
      <line x1="42" y1="46" x2="48" y2="40" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Een Gemlog (Gemini + blog) is een blog gehost in Geminispace via het Gemini-protocol. Het is geen apart protocol maar een **community-conventie** voor hoe blogposts in een Gemini-capsule worden georganiseerd. De naam is een samentrekking van "Gemini" en "log" (zoals weblog → blog).

Geomlogs zijn uitsluitend in **Gemtext** (.gmi) opgemaakt — geen HTML, geen CSS, geen afbeeldingen als inline elementen. Dit dwingt tot schrijven in plaats van vormgeven.

**Ecosystem:**
- **CAPCOM** — de bekendste Gemlog-aggregator (capcom.rocks)
- **Antenna** — real-time feed van nieuwe gemlog-berichten
- **Cosmos** — kurateerde Gemlog-verzameling
- **Gemini subscription** — via Atom/RSS-feeds`,

      werking: `## Werking

### Gemlog-mapstructuur (conventie)
\`\`\`
gemini://mijn-capsule.nl/
├── index.gmi                     ← startpagina (verwijst naar gemlog)
└── gemlog/
    ├── index.gmi                 ← blogindex (lijst van berichten)
    ├── 2025-01-15-eerste-bericht.gmi
    ├── 2025-01-20-tweede-bericht.gmi
    └── atom.xml                  ← Atom-feed voor aggregators
\`\`\`

### Gemlog index (index.gmi)
\`\`\`gemtext
# Mijn Gemlog

Een persoonlijk dagboek in Geminispace.

## Berichten

=> 2025-01-20-tweede-bericht.gmi 2025-01-20 — Tweede bericht
=> 2025-01-15-eerste-bericht.gmi 2025-01-15 — Eerste bericht
\`\`\`

### Blogpost-structuur
\`\`\`gemtext
# Titel van het bericht
Gepubliceerd: 2025-01-20

Introductietekst van het artikel.

## Sectiekop

Verdere tekst...

* Lijst-item één
* Lijst-item twee

=> gemini://mijn-capsule.nl/gemlog/ Terug naar gemlog
\`\`\`

### Atom-feed (voor aggregators)
\`\`\`xml
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Mijn Gemlog</title>
  <link href="gemini://mijn-capsule.nl/gemlog/atom.xml" rel="self"/>
  <entry>
    <title>Tweede bericht</title>
    <link href="gemini://mijn-capsule.nl/gemlog/2025-01-20-tweede.gmi"/>
    <updated>2025-01-20T10:00:00Z</updated>
    <content>Samenvatting...</content>
  </entry>
</feed>
\`\`\``,

      toepassingen: `## Toepassingen

- **Persoonlijk dagboek**: Gedachten, belevenissen, technische notities
- **Technisch blog**: Tutorials, projectverslagen, configuratietips
- **Fotoloze reisblog**: Beschrijvende tekstuele verslagen
- **Politieke/filosofische essays**: Langere beschouwingen zonder afleiding
- **Projectupdates**: Voortgang van software- of hardwareprojecten`,

      opties: `## Opties & Tools

### Gemlog-generators
| Tool | Taal | Beschrijving |
|------|------|-------------|
| gemlog.sh | Bash | Eenvoudig shell-script |
| Kiln | Rust | Statische capsule-generator |
| Comets | Python | Gemini CMS met gemlog-ondersteuning |
| dioscuri | Go | Capsule-generator |

### Bestandsnaamconventies
\`\`\`
YYYY-MM-DD-korte-slug.gmi    ← aanbevolen
YYYY-MM-DD.gmi               ← alternatief (één bericht per dag)
\`\`\`

### Aggregator-registratie
\`\`\`gemtext
# In /gemlog/index.gmi vermeld je Atom-feed:
=> /gemlog/atom.xml Atom-feed (voor CAPCOM/Antenna)
\`\`\`

Vervolgens dien je je feed in bij:
- gemini://gemini.circumlunar.space/capcom/
- gemini://warmedal.se/~bjorn/antenna/`,

      voorbeeld: `## Voorbeeld

### Bash — Gemlog-bericht aanmaken
\`\`\`bash
#!/bin/bash
# gemlog-nieuw.sh — Maak een nieuw gemlog-bericht aan

GEMLOG_DIR="/srv/gemini/gemlog"
DATUM=\$(date +%Y-%m-%d)
TITEL="\$1"

if [ -z "\$TITEL" ]; then
    echo "Gebruik: \$0 'Titel van het bericht'"
    exit 1
fi

# Slug aanmaken (kleine letters, spaties → koppeltekens)
SLUG=\$(echo "\$TITEL" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -dc 'a-z0-9-')
BESTAND="\${GEMLOG_DIR}/\${DATUM}-\${SLUG}.gmi"

# Bestand aanmaken
cat > "\$BESTAND" << EOF
# \$TITEL
Gepubliceerd: \$DATUM

Schrijf hier je bericht...

=> /gemlog/index.gmi Terug naar gemlog
EOF

echo "Bericht aangemaakt: \$BESTAND"

# Index bijwerken (voeg bovenaan toe)
TEMP=\$(mktemp)
head -n 8 "\${GEMLOG_DIR}/index.gmi" > "\$TEMP"
echo "=> \${DATUM}-\${SLUG}.gmi \${DATUM} — \$TITEL" >> "\$TEMP"
tail -n +9 "\${GEMLOG_DIR}/index.gmi" >> "\$TEMP"
mv "\$TEMP" "\${GEMLOG_DIR}/index.gmi"
echo "Index bijgewerkt."

# Open in editor
\${EDITOR:-nano} "\$BESTAND"
\`\`\``
    }
  },

  glog: {
    id: 'glog', name: 'Phlog / Glog', fullName: 'Gopher Log (Phlog)',
    version: 'Conventie (geen RFC)', standard: 'Community conventie',
    color: '#92400E', transport: 'Gopher (TCP poort 70)', port: '70',
    model: 'Statische tekstbestanden (pull)', qos: 'Geen', security: 'Geen (Gophers voor TLS)',
    category: 'Small Internet Publicatie', idealFor: 'Tekstueel bloggen in Gopherspace, puristisch schrijven',
    tags: ['Gopher', 'Blog', 'Tekst', 'Conventie'],
    shortDesc: 'Een blog gehost in Gopherspace — de "phlog" (Gopher + blog) is een reeks platte tekstbestanden in een hiërarchisch Gopher-menu, de oudste vorm van internet-bloggen.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#92400E"/>
      <rect x="14" y="10" width="36" height="46" rx="3" stroke="white" stroke-width="2.5" fill="none" opacity="0.8"/>
      <line x1="20" y1="20" x2="44" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="20" y1="27" x2="44" y2="27" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
      <line x1="20" y1="34" x2="38" y2="34" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
      <line x1="20" y1="41" x2="44" y2="41" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="20" y1="48" x2="33" y2="48" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
      <path d="M9 8 Q6 14 9 20" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Een **phlog** (Gopher + blog) — ook soms "glog" (Gopher log) of "gopherlog" genoemd — is een blog gepubliceerd in Gopherspace via het Gopher-protocol. Het is een van de oudste vormen van internet-bloggen, ouder dan het World Wide Web.

Phlogs bestaan uit eenvoudige platte tekstbestanden, georganiseerd in een Gopher-submenu. Er is geen opmaak, geen CSS, geen JavaScript — alleen tekst. Auteurs schrijven rechtstreeks in \`.txt\` of zonder extensie, en navigeren via Gopher-menu's (gophermaps).

**Geschiedenis:**
- Phlogs bestaan al sinds de vroege jaren 90
- Bloeiden op vanaf midden jaren 90 als alternatief voor het web
- Zijn nooit verdwenen — SDF.org, circumlunar.space en tilde-servers herbergen actieve phloggers
- De term "phlog" verwijst naar de Gopher-gemeenschap; "glog" is minder gebruikelijk maar synoniem`,

      werking: `## Werking

### Phlog-mapstructuur in een gopherhole
\`\`\`
Gopher-root (/)
├── gophermap              ← root-menu
├── about.txt
└── phlog/
    ├── gophermap          ← phlog-menu (lijst van berichten)
    ├── 2025-01-20.txt     ← bericht van 20 januari
    ├── 2025-01-15.txt     ← bericht van 15 januari
    └── 2024-12-31.txt     ← bericht van 31 december
\`\`\`

### Phlog gophermap (/phlog/gophermap)
\`\`\`
iMijn Phlog	fake	(NULL)	0
i	fake	(NULL)	0
02025-01-20 — Nieuwe LoRaWAN-sensor geplaatst	/phlog/2025-01-20.txt	mijnserver.nl	70
02025-01-15 — Gedachten over small internet	/phlog/2025-01-15.txt	mijnserver.nl	70
02024-12-31 — Terugblik op 2024	/phlog/2024-12-31.txt	mijnserver.nl	70
\`\`\`

### Root gophermap (/gophermap)
\`\`\`
iWelkom op mijn gopherhole!	fake	(NULL)	0
i	fake	(NULL)	0
1Phlog (blog)	/phlog	mijnserver.nl	70
0Over mij	/about.txt	mijnserver.nl	70
\`\`\`

### Tekstbestand-formaat
Phlogs zijn vrije tekst — geen markupregels. Sommige auteurs gebruiken ASCII-art of vaste breedte-opmaak voor structuur.`,

      toepassingen: `## Toepassingen

- **Persoonlijk dagboek**: De meest traditionele phlog-stijl — dagelijkse of wekelijkse reflecties
- **Technische notities**: Configuraties, commando's, UNIX-tips
- **Commentaar op tech**: Beschouwingen over internet, privacy, vrije software
- **SDF.org phlogs**: Honderden actieve phloggers op het publieke UNIX-systeem
- **Tilde-servers**: ~team, ~club en andere "tilde"-communities met phlog-cultuur
- **ASCII-art**: Visuele tekst-experimenten die goed werken in mono-spaced Gopher-clients`,

      opties: `## Opties & Tools

### Phlog opzetten op SDF.org
\`\`\`bash
# Na registratie op sdf.org en SSH-login:
mkdir ~/gopher/phlog
cat > ~/gopher/phlog/gophermap << 'EOF'
iMijn Phlog	fake	(NULL)	0
02025-01-20 — Eerste bericht	/users/jouwnaam/phlog/2025-01-20.txt	sdf.org	70
EOF

# Eerste bericht
cat > ~/gopher/phlog/2025-01-20.txt << 'EOF'
2025-01-20 — Mijn eerste phlog-bericht
=======================================

Hallo wereld! Dit is mijn eerste phlog op SDF.org.

Ik vind het prachtig dat Gopherspace nog steeds zo actief is.
EOF
\`\`\`

### Phlog-frequentie (conventie)
Phlogs worden gewaardeerd voor hun **authenticiteit** boven frequentie:
- Dagelijks: actieve "journaler"
- Wekelijks: meest voorkomend
- Maandelijks: langere essays`,

      voorbeeld: `## Voorbeeld

### Bash — Nieuw phlog-bericht toevoegen
\`\`\`bash
#!/bin/bash
# phlog-nieuw.sh

PHLOG_DIR="\${HOME}/gopher/phlog"
DATUM=\$(date +%Y-%m-%d)
SERVER="sdf.org"
GEBRUIKER="\$(whoami)"
BESTAND="\${PHLOG_DIR}/\${DATUM}.txt"

# Bericht schrijven
cat > "\$BESTAND" << EOF
\$(date '+%Y-%m-%d') — \$1
\$(printf '=%.0s' \$(seq 1 \${#DATUM}+3+\${#1}))

EOF
\${EDITOR:-nano} "\$BESTAND"

# Gophermap bijwerken (nieuw bericht bovenaan)
TEMP=\$(mktemp)
head -n 2 "\${PHLOG_DIR}/gophermap" > "\$TEMP"
echo "0\${DATUM} — \$1	/users/\${GEBRUIKER}/phlog/\${DATUM}.txt	\${SERVER}	70" >> "\$TEMP"
tail -n +3 "\${PHLOG_DIR}/gophermap" >> "\$TEMP"
mv "\$TEMP" "\${PHLOG_DIR}/gophermap"

echo "Phlog-bericht gepubliceerd: \$DATUM"
\`\`\`

### Python — Phlog-feed lezen
\`\`\`python
import socket

def lees_gophermap(host, selector='/phlog', poort=70):
    with socket.create_connection((host, poort), timeout=10) as s:
        s.sendall((selector + '\\r\\n').encode())
        data = b''
        while chunk := s.recv(4096):
            data += chunk
    berichten = []
    for regel in data.decode('utf-8', errors='replace').splitlines():
        if regel.startswith('0'):  # Type 0 = tekstbestand
            delen = regel[1:].split('\\t')
            if len(delen) >= 3:
                berichten.append({
                    'titel':    delen[0],
                    'selector': delen[1],
                    'host':     delen[2]
                })
    return berichten

phlog = lees_gophermap('sdf.org', '/users/someone/phlog')
for bericht in phlog[:5]:
    print(bericht['titel'])
\`\`\``
    }
  },

  bashblog: {
    id: 'bashblog', name: 'Bashblog', fullName: 'Bashblog — Single File Blog',
    version: 'v2.x', standard: 'Open Source (MIT)',
    color: '#1E40AF', transport: 'HTTP/HTTPS (statische bestanden)', port: '80 / 443',
    model: 'Statische HTML-generator (pull)', qos: 'Geen (CDN/webserver)', security: 'HTTPS via webserver/CDN',
    category: 'Small Internet Publicatie', idealFor: 'Eenvoudige blog zonder CMS, terminal-gerichte ontwikkelaars, minimale hosting',
    tags: ['Blog', 'Bash', 'Statisch', 'Minimaal'],
    shortDesc: 'Een enkelvoudig bash-script dat een volledige blog genereert — schrijf in Markdown of platte tekst, publiceer met één commando, geen server-software vereist.',
    icon: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#1E40AF"/>
      <rect x="8" y="14" width="48" height="36" rx="4" fill="white" opacity="0.15" stroke="white" stroke-width="2"/>
      <text x="13" y="28" fill="#4ADE80" font-size="10" font-family="Ubuntu Mono,monospace" font-weight="bold">$</text>
      <text x="22" y="28" fill="white" font-size="9" font-family="Ubuntu Mono,monospace">bb post</text>
      <line x1="13" y1="35" x2="51" y2="35" stroke="white" stroke-width="1" opacity="0.3"/>
      <text x="13" y="44" fill="white" font-size="8" font-family="Ubuntu Mono,monospace" opacity="0.7">→ index.html</text>
    </svg>`,
    content: {
      beschrijving: `## Beschrijving

Bashblog is een enkelvoudig bash-script (~600 regels) dat een complete, statische blog genereert. Ontwikkeld door Carlos Fenollosa in 2011, is het ontworpen voor ontwikkelaars die gewoon **willen schrijven** zonder CMS-complexiteit, databases, plugins of hosting-vereisten.

Het script genereert HTML uit Markdown- of platte tekstbestanden, maakt automatisch een index, RSS-feed en Atom-feed aan, en biedt een eenvoudig commando-interface:

\`\`\`bash
bb.sh post        # Nieuw bericht schrijven
bb.sh edit        # Bestaand bericht bewerken
bb.sh delete      # Bericht verwijderen
bb.sh rebuild     # Site volledig herbouwen
\`\`\`

De gegenereerde HTML heeft **geen JavaScript**, **geen tracking** en **geen cookies** — puur statisch.`,

      werking: `## Werking

### Werkstroom
\`\`\`
bash bb.sh post
  → Opent $EDITOR voor Markdown-inhoud
  → Lees titel uit eerste regel
  → Genereer HTML-bestand (datum-slug.html)
  → Genereer/update index.html
  → Genereer/update feed.rss en atom.xml
  → Optioneel: deploy via rsync/git/scp
\`\`\`

### Bestandsstructuur
\`\`\`
/blog/
├── bb.sh              ← het script zelf
├── .config            ← configuratie
├── index.html         ← gegenereerde blogindex
├── feed.rss           ← RSS-feed
├── atom.xml           ← Atom-feed
├── 2025-01-20-titel.html  ← berichten
└── images/            ← afbeeldingen
\`\`\`

### Markdown-ondersteuning
Bashblog gebruikt externe Markdown-parsers (optioneel):
- **markdown** (Python-Markdown) — aanbevolen
- **discount** — snelle C-implementatie
- **pandoc** — uitgebreide opties
- Zonder Markdown-parser: platte tekst met HTML-alinea's

### Configuratie (.config)
\`\`\`bash
# .config
global_title="Mijn Technische Blog"
global_description="Over Linux, Gopher en kleine protocollen"
global_author="Jan Jansen"
global_email="jan@voorbeeld.nl"
global_url="https://jan.voorbeeld.nl"
template_file="template.html"  # Eigen HTML-template
\`\`\``,

      toepassingen: `## Toepassingen

- **Ontwikkelaars-blog**: Technische artikelen, tutorials, persoonlijke notities
- **Minimale hosting**: Werkt op elke webserver die statische bestanden serveert (Nginx, Apache, GitHub Pages, Netlify)
- **Offline-schrijven**: Genereer lokaal, deploy handmatig
- **Privacy-first blog**: Geen tracking, geen cookies, geen externe CDN-afhankelijkheden
- **Tilde-servers**: Populair op ~tilde.team, ~sdf.org als persoonlijke homepage-generator
- **Gemini-aanpassing**: Script is aanpasbaar om ook .gmi-bestanden te genereren`,

      opties: `## Opties & Configuratie

### Volledige .config opties
| Variabele | Beschrijving | Standaard |
|-----------|-------------|-----------|
| \`global_title\` | Blogtitel | "My blog" |
| \`global_description\` | Blogbeschrijving | "" |
| \`global_author\` | Auteursnaam | "" |
| \`global_email\` | Auteurs-e-mail | "" |
| \`global_url\` | Blog-URL | "" |
| \`template_file\` | HTML-template | "" (ingebouwd) |
| \`date_format\` | Datumweergave | "%B %d, %Y" |
| \`markdown\` | Markdown-parser (auto-detect) | "" |
| \`disqus_shortname\` | Disqus-reacties | "" |
| \`twitter_handle\` | Deelknop-configuratie | "" |

### bb.sh commando's
\`\`\`bash
bb.sh post          # Nieuw bericht
bb.sh edit          # Kies en bewerk bericht
bb.sh delete        # Kies en verwijder bericht
bb.sh rebuild       # Herbouw alle bestanden
bb.sh list          # Toon alle berichten
\`\`\`

### Deployen naar GitHub Pages
\`\`\`bash
# Initieel
git init
git remote add origin https://github.com/jouw/jouw.github.io.git

# Na elk nieuw bericht
bb.sh post          # Schrijf bericht
git add -A
git commit -m "Nieuw bericht: \$TITEL"
git push
\`\`\``,

      voorbeeld: `## Voorbeeld

### Installatie en eerste bericht
\`\`\`bash
# Bashblog downloaden
curl -o bb.sh https://raw.githubusercontent.com/cfenollosa/bashblog/master/bb.sh
chmod +x bb.sh

# Configuratie instellen
cat > .config << 'EOF'
global_title="Mijn LPW Blog"
global_description="Notities over lichtgewicht internet protocollen"
global_author="Jan Jansen"
global_email="jan@voorbeeld.nl"
global_url="https://jan.voorbeeld.nl"
EOF

# Eerste bericht schrijven
./bb.sh post
# → Opent je editor. Eerste regel = titel.
\`\`\`

### Markdown-bericht (voorbeeld inhoud)
\`\`\`markdown
Mijn eerste bericht over MQTT

Dit is mijn eerste bericht. MQTT is een geweldig protocol
voor IoT-toepassingen.

## Wat ik geleerd heb

Vandaag heb ik een MQTT-broker opgezet met Mosquitto:

    sudo apt install mosquitto
    mosquitto -v

De broker luistert standaard op poort 1883.

## Conclusie

Simpel en effectief. Volgende week: CoAP.
\`\`\`

### Automatisch deployen met rsync
\`\`\`bash
#!/bin/bash
# deploy.sh
./bb.sh rebuild
rsync -avz --delete \\
    --exclude '.config' \\
    --exclude 'bb.sh' \\
    --exclude 'deploy.sh' \\
    --exclude '*.md' \\
    ./ jan@mijnserver.nl:/var/www/html/blog/
echo "Blog gepubliceerd!"
\`\`\``
    }
  }

};

// Samenvoegen met het hoofd-PROTOCOLS-object
Object.assign(PROTOCOLS, PROTOCOLS2);
