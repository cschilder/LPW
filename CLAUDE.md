# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**LPW — Lichtgewicht Internet Protocollen** is a static HTML5 website documenting 25 lightweight internet protocols across two categories: 12 IoT/networking protocols (MQTT, CoAP, WebSocket, AMQP, HTTP/2, HTTP/3, XMPP, STOMP, DDS, LwM2M, MQTT-SN, LoRaWAN) and 13 "small internet" protocols (Gopher, Gemini, Spartan, Titan, Guppy, Nex, Finger, Twtxt, Nostr, Misfin, Gemlog, Glog, Bashblog). The UI is in Dutch; technical terms and code examples are in English.

No build step — open `index.html` directly in a browser or serve with any static file server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Architecture

The site is a single-page application with no framework dependencies beyond CDN-loaded libraries. All content is generated dynamically by JavaScript at page load.

```
index.html          Shell: navigation, hero, grid/comparison placeholders, script tags
css/custom.css      Ubuntu colour variables, Start button, overlay, tabs, markdown styles
js/protocols.js     PROTOCOLS object — 12 IoT/networking protocols with Markdown content
js/protocols2.js    PROTOCOLS2 object — 13 small internet protocols; merged via Object.assign
js/app.js           Renders everything into the DOM; handles tabs, overlay, StackEdit, theme
```

### Data flow

1. `protocols.js` defines `window.PROTOCOLS` — a keyed object where each entry has `id`, `name`, metadata fields, an inline SVG `icon`, and a `content` object with five Markdown strings (`beschrijving`, `werking`, `toepassingen`, `opties`, `voorbeeld`). `protocols2.js` defines `PROTOCOLS2` with additional protocols and merges them via `Object.assign(PROTOCOLS, PROTOCOLS2)` at the bottom of the file.
2. `app.js` reads `PROTOCOLS` on `DOMContentLoaded` and calls four builders: `bouwProtocolGrid()`, `bouwVergelijkingstabel()`, `bouwProtocolSecties()`, then inits overlay/tabs/theme/navigation.
3. Each protocol section gets five tab panels. On load, Markdown is rendered via `marked.parse()` and syntax-highlighted with `Prism.highlightAllUnder()`.
4. User edits go through StackEdit (`bewerkSectie(protocolId, sectionId)`): the editor opens with the current Markdown, `fileChange` events update the DOM live, and content is debounce-saved to `localStorage` under key `lpw_<protocolId>_<sectionId>`. On next load, localStorage takes precedence over the defaults in `protocols.js`.

### CDN dependencies (no local copies)

| Library | Purpose | Key API used |
|---------|---------|-------------|
| Vanilla Framework 4.7.0 | UI components | CSS classes only |
| Ubuntu font (Google Fonts) | Typography | CSS only |
| marked.js 12 | Markdown → HTML | `marked.parse(md)` |
| Prism.js 1.29 | Syntax highlighting | `Prism.highlightAllUnder(el)` |
| stackedit-js 1.0.7 | In-browser Markdown editor | `new Stackedit()`, `.on('fileChange')`, `.openFile()` |

## Key conventions

### Adding a new protocol

Add one entry to either `js/protocols.js` or `js/protocols2.js` following the exact same shape as existing entries. The five `content` keys must be: `beschrijving`, `werking`, `toepassingen`, `opties`, `voorbeeld`. If adding to `protocols2.js`, place it inside the `PROTOCOLS2` object before the closing `};` — the `Object.assign` at the bottom merges it automatically. The site renders everything else automatically — no changes to `index.html` or `app.js` are needed.

For a third extension file, define `const PROTOCOLS3 = { ... }` with the same entry shape and add `Object.assign(PROTOCOLS, PROTOCOLS3)` at the bottom, then include `<script src="js/protocols3.js"></script>` in `index.html` between `protocols2.js` and `app.js`.

### Vanilla Framework class names used

Navigation: `p-navigation`, `p-navigation__row`, `p-navigation__banner`, `p-navigation__logo-link`, `p-navigation__nav`, `p-navigation__items`, `p-navigation__item`, `p-navigation__link`  
Layout: `u-fixed-width`, `row`, `col-*`, `p-strip`, `p-strip--light`, `p-strip--dark`  
Tabs: `p-tabs`, `p-tabs__list`, `p-tabs__item`, `p-tabs__link`, `is-selected`  
Buttons: `p-button`, `p-button--brand`, `p-button--link`  
Tables: `p-table`

### Theme system

`data-theme="light|dark"` is set on `<html>`. CSS custom properties (`--bg-section`, `--card-bg`, etc.) switch values between themes. Persisted in `localStorage` under `lpw_theme`.

### Internationalisation

All UI text is Dutch. Protocol names, RFC references, code examples, and library names stay in English. Keep this separation when editing content.
