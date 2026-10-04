/* ============================================================
   Minimale STOMP 1.2 client over de browser-WebSocket.
   Zonder externe afhankelijkheden — werkt in de Capacitor-WebView
   én in een gewone browser.

   Ondersteunt: CONNECT/STOMP, CONNECTED, SUBSCRIBE, UNSUBSCRIBE,
   SEND, MESSAGE, RECEIPT, ERROR, DISCONNECT en heart-beating.

   Referentie: https://stomp.github.io/stomp-specification-1.2.html
   ============================================================ */
'use strict';

const NULL = '\x00';
const LF   = '\n';

// Escape/unescape voor header-waarden (STOMP 1.2 §3.1)
function escapeHeader(v) {
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/:/g, '\\c');
}
function unescapeHeader(v) {
  return String(v)
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\c/g, ':')
    .replace(/\\\\/g, '\\');
}

// Serialiseer een frame naar wire-formaat
function buildFrame(command, headers = {}, body = '') {
  let out = command + LF;
  for (const k in headers) {
    if (headers[k] === undefined || headers[k] === null) continue;
    // content-length/content-type headers niet escapen bij CONNECT-commando
    out += `${escapeHeader(k)}:${escapeHeader(headers[k])}` + LF;
  }
  out += LF + (body || '') + NULL;
  return out;
}

// Parse één frame-string naar { command, headers, body }
function parseFrame(data) {
  const idx = data.indexOf(LF + LF);
  const headerPart = data.slice(0, idx);
  let body = data.slice(idx + 2);
  if (body.endsWith(NULL)) body = body.slice(0, -1);

  const lines = headerPart.split(LF);
  const command = lines.shift().trim();
  const headers = {};
  for (const line of lines) {
    const c = line.indexOf(':');
    if (c === -1) continue;
    const key = unescapeHeader(line.slice(0, c));
    const val = unescapeHeader(line.slice(c + 1));
    // Eerste waarde wint (STOMP-conventie)
    if (!(key in headers)) headers[key] = val;
  }
  return { command, headers, body };
}

class StompClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this._subId = 0;
    this._receiptId = 0;
    this.subscriptions = new Map();   // id -> { destination, callback }
    this._receipts = new Map();       // receipt-id -> resolve
    this._pending = '';               // buffer voor gefragmenteerde frames
    this._hbSend = 0;
    this._hbRecv = 0;
    this._hbSendTimer = null;
    this._hbRecvTimer = null;
    this._lastRecv = 0;

    // Callbacks (extern in te stellen)
    this.onConnect    = () => {};
    this.onDisconnect = () => {};
    this.onError      = () => {};
    this.onFrame      = () => {};     // (dir, frame)  dir = 'in' | 'out'
  }

  // Verbind met de broker. opts: { url, login, passcode, host, heartbeat:[send,recv] }
  connect(opts) {
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(opts.url, ['v12.stomp', 'v11.stomp', 'stomp']);
      } catch (e) {
        return reject(new Error('Ongeldige WebSocket-URL: ' + e.message));
      }
      this.ws = ws;
      const [cx, cy] = opts.heartbeat || [10000, 10000];

      const failTimer = setTimeout(() => {
        reject(new Error('Time-out bij verbinden met de broker.'));
        try { ws.close(); } catch (_) {}
      }, 15000);

      ws.onopen = () => {
        const headers = {
          'accept-version': '1.2,1.1',
          'host': opts.host || location.hostname || 'localhost',
          'heart-beat': `${cx},${cy}`,
        };
        if (opts.login)    headers['login']    = opts.login;
        if (opts.passcode) headers['passcode'] = opts.passcode;
        this._send('CONNECT', headers, '');
      };

      ws.onmessage = (ev) => {
        this._lastRecv = Date.now();
        this._onData(ev.data, (frame) => {
          if (frame.command === 'CONNECTED') {
            clearTimeout(failTimer);
            this.connected = true;
            this._setupHeartbeat(frame.headers['heart-beat'], cx, cy);
            this.onConnect(frame);
            resolve(frame);
          } else if (frame.command === 'ERROR') {
            clearTimeout(failTimer);
            const msg = frame.headers.message || frame.body || 'STOMP ERROR';
            this.onError(new Error(msg), frame);
            reject(new Error(msg));
          } else {
            this._dispatch(frame);
          }
        });
      };

      ws.onerror = () => {
        clearTimeout(failTimer);
        const err = new Error('WebSocket-fout — is de broker bereikbaar en spreekt hij STOMP-over-WebSocket?');
        this.onError(err);
        reject(err);
      };

      ws.onclose = (ev) => {
        clearTimeout(failTimer);
        this._teardownHeartbeat();
        const was = this.connected;
        this.connected = false;
        this.subscriptions.clear();
        if (was) this.onDisconnect(ev);
        else reject(new Error(`Verbinding gesloten (code ${ev.code}).`));
      };
    });
  }

  // Abonneer op een destination. callback(messageFrame)
  subscribe(destination, callback, headers = {}) {
    if (!this.connected) throw new Error('Niet verbonden.');
    const id = headers.id || `sub-${++this._subId}`;
    this.subscriptions.set(id, { destination, callback });
    this._send('SUBSCRIBE', {
      id,
      destination,
      ack: headers.ack || 'auto',
    });
    return id;
  }

  unsubscribe(id) {
    if (!this.subscriptions.has(id)) return;
    this.subscriptions.delete(id);
    if (this.connected) this._send('UNSUBSCRIBE', { id });
  }

  // Verstuur een bericht naar een destination
  send(destination, body = '', headers = {}) {
    if (!this.connected) throw new Error('Niet verbonden.');
    const h = {
      destination,
      'content-type': headers['content-type'] || 'text/plain',
      'content-length': byteLength(body),
      ...headers,
    };
    this._send('SEND', h, body);
  }

  disconnect() {
    if (!this.ws) return;
    if (this.connected) {
      try { this._send('DISCONNECT', { receipt: `d-${++this._receiptId}` }); } catch (_) {}
    }
    this._teardownHeartbeat();
    this.connected = false;
    try { this.ws.close(); } catch (_) {}
    this.ws = null;
  }

  // ---- interne helpers ----
  _send(command, headers, body) {
    const frame = buildFrame(command, headers, body);
    this.ws.send(frame);
    this.onFrame('out', { command, headers, body });
  }

  _onData(chunk, handleFrame) {
    // Heart-beat pings (losse LF) negeren
    this._pending += chunk;
    let nullIdx;
    while ((nullIdx = this._pending.indexOf(NULL)) !== -1) {
      let raw = this._pending.slice(0, nullIdx);
      this._pending = this._pending.slice(nullIdx + 1);
      // strip voorloop-LF (heart-beats tussen frames)
      raw = raw.replace(/^\n+/, '');
      if (!raw.trim()) continue;
      const frame = parseFrame(raw + NULL);
      this.onFrame('in', frame);
      handleFrame(frame);
    }
  }

  _dispatch(frame) {
    if (frame.command === 'MESSAGE') {
      const sub = frame.headers.subscription;
      const s = this.subscriptions.get(sub);
      if (s) s.callback(frame);
    } else if (frame.command === 'RECEIPT') {
      const rid = frame.headers['receipt-id'];
      const r = this._receipts.get(rid);
      if (r) { r(); this._receipts.delete(rid); }
    }
  }

  _setupHeartbeat(serverHb, cx, cy) {
    // serverHb = "sx,sy"; onderhandel volgens spec §3.7
    let sx = 0, sy = 0;
    if (serverHb) { const p = serverHb.split(','); sx = +p[0] || 0; sy = +p[1] || 0; }
    this._hbSend = (cx === 0 || sy === 0) ? 0 : Math.max(cx, sy);
    this._hbRecv = (cy === 0 || sx === 0) ? 0 : Math.max(cy, sx);

    if (this._hbSend > 0) {
      this._hbSendTimer = setInterval(() => {
        try { this.ws.send(LF); this.onFrame('out', { command: '<heart-beat>', headers: {}, body: '' }); } catch (_) {}
      }, this._hbSend);
    }
    if (this._hbRecv > 0) {
      this._lastRecv = Date.now();
      this._hbRecvTimer = setInterval(() => {
        if (Date.now() - this._lastRecv > this._hbRecv * 2.5) {
          this.onError(new Error('Geen heart-beat van de broker — verbinding lijkt dood.'));
          this.disconnect();
        }
      }, this._hbRecv);
    }
  }

  _teardownHeartbeat() {
    if (this._hbSendTimer) clearInterval(this._hbSendTimer);
    if (this._hbRecvTimer) clearInterval(this._hbRecvTimer);
    this._hbSendTimer = this._hbRecvTimer = null;
  }
}

function byteLength(str) {
  // aantal bytes in UTF-8
  return new TextEncoder().encode(str).length;
}

// Globaal beschikbaar maken
window.StompClient = StompClient;
