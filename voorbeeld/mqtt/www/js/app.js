// mqtt-client — UI-logica
// Styling & structuur identiek aan de twtxt-/stomp-app; domein = MQTT over WebSocket.
// Gebruikt de meegeleverde mqtt.js (window.mqtt). Payloads mogen platte tekst zijn
// of JSON {sender,text}; in dat laatste geval werkt de chat-/@mention-weergave.

// === Opslag (Capacitor Preferences met localStorage-fallback) ===
const Store = {
  async get(key) {
    if (window.Capacitor?.Plugins?.Preferences) {
      const { value } = await Capacitor.Plugins.Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  async set(key, value) {
    if (window.Capacitor?.Plugins?.Preferences) {
      return Capacitor.Plugins.Preferences.set({ key, value: String(value) });
    }
    localStorage.setItem(key, value);
  },
  async remove(key) {
    if (window.Capacitor?.Plugins?.Preferences) {
      return Capacitor.Plugins.Preferences.remove({ key });
    }
    localStorage.removeItem(key);
  },
};

// === Helpers ===
function $(sel) { return document.querySelector(sel); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function relTime(ts) {
  const d = new Date(ts), diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}
function bufToB64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64ToBuf(s)   { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

// === Wachtwoord-hash (PBKDF2-SHA-256, met eenvoudige fallback) ===
async function hashPassword(password, saltB64) {
  if (crypto?.subtle) {
    const enc = new TextEncoder();
    const salt = saltB64 ? b64ToBuf(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMat, 256);
    return { hash: bufToB64(bits), salt: bufToB64(salt) };
  }
  let h = 5381; const str = (saltB64 || 'x') + password;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return { hash: String(h >>> 0), salt: saltB64 || 'x' };
}

// === Vanilla Framework iconen als emoticons ===
const ICONS = [
  { icon: 'information',      code: ':info:',  label: 'info'  },
  { icon: 'warning',          code: ':warn:',  label: 'warn'  },
  { icon: 'success',          code: ':ok:',    label: 'ok'    },
  { icon: 'error',            code: ':fout:',  label: 'fout'  },
  { icon: 'help',             code: ':help:',  label: 'help'  },
  { icon: 'plus',             code: ':plus:',  label: 'plus'  },
  { icon: 'minus',            code: ':min:',   label: 'min'   },
  { icon: 'external-link',    code: ':link:',  label: 'link'  },
  { icon: 'share',            code: ':deel:',  label: 'delen' },
  { icon: 'search',           code: ':zoek:',  label: 'zoek'  },
  { icon: 'code',             code: ':code:',  label: 'code'  },
  { icon: 'copy',             code: ':kopi:',  label: 'kopi'  },
  { icon: 'user',             code: ':user:',  label: 'user'  },
  { icon: 'tag',              code: ':tag:',   label: 'tag'   },
  { icon: 'edit',             code: ':edit:',  label: 'edit'  },
  { icon: 'in-progress',      code: ':bezig:', label: 'bezig' },
  { icon: 'task-outstanding', code: ':todo:',  label: 'todo'  },
  { icon: 'task-complete',    code: ':klaar:', label: 'klaar' },
  { icon: 'close',            code: ':sluit:', label: 'sluit' },
];
const ICON_MAP = Object.fromEntries(ICONS.map(i => [i.code, i.icon]));

function formatText(text) {
  let html = esc(text);
  html = html.replace(/:([a-z-]+):/g, match => {
    const iconName = ICON_MAP[match];
    if (!iconName) return match;
    return `<i class="p-icon--${iconName}" title="${match}" aria-label="${match}"></i>`;
  });
  return html.replace(/@([a-z0-9_-]+)/gi,
    (_, u) => `<span class="mention">@${esc(u)}</span>`);
}

// MQTT topic-filter match (+ en # wildcards) voor lokale weergave-filtering
function topicMatches(filter, topic) {
  const f = filter.split('/'), t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (f[i] === '+') { if (t[i] === undefined) return false; continue; }
    if (f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

// === Globale toestand ===
let client = null;
let currentUser = '';
let connected   = false;
const messages  = [];              // { topic, sender, text, qos, retain, ts, own }
let activeTopicFilter = null;
const subscriptions  = new Map();  // topicFilter -> qos
const knownUsers = new Set();
const logEntries = [];
let unreadCount  = 0;
const MSG_CAP = 300;

// === Thema ===
async function applyTheme(theme) {
  document.body.dataset.theme = theme || 'ubuntu';
  await Store.set('theme', theme || 'ubuntu');
  const sel = $('#theme-select');
  if (sel) sel.value = theme || 'ubuntu';
}

// === Views ===
function showView(name) {
  ['timeline', 'tags', 'following', 'admin'].forEach(v => {
    $(`#view-${v}`).hidden = v !== name;
  });
  document.querySelectorAll('#bottom-nav button[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  const titles = { timeline: 'mqtt', tags: 'Topics', following: 'Verbinding', admin: 'Logboek' };
  $('#header-title').textContent = titles[name] || 'mqtt';
}

// === Compose (PUBLISH) ===
function openCompose() {
  $('#compose-bar').hidden = true;
  $('#compose-expanded').hidden = false;
  $('#compose').focus();
}
function closeCompose() {
  $('#compose-expanded').hidden = true;
  $('#compose-bar').hidden = false;
  $('#icon-picker').hidden = true;
  hideMentionDropdown();
}
function toggleIconPicker() {
  const picker = $('#icon-picker');
  if (picker.hidden) {
    if (!picker.innerHTML) {
      picker.innerHTML = `<div class="icon-picker__grid">${
        ICONS.map(i => `
          <button class="icon-picker__btn" data-icon-code="${i.code}" title="${i.label}">
            <i class="p-icon--${i.icon}"></i>
            <span class="icon-picker__label">${i.label}</span>
          </button>`).join('')
      }</div>`;
    }
    picker.hidden = false;
  } else {
    picker.hidden = true;
  }
}
function insertIcon(code) {
  const ta = $('#compose');
  const start = ta.selectionStart;
  ta.value = ta.value.slice(0, start) + code + ' ' + ta.value.slice(ta.selectionEnd);
  const pos = start + code.length + 1;
  ta.setSelectionRange(pos, pos);
  ta.focus();
  $('#icon-picker').hidden = true;
  updateCharcount();
}
function updateCharcount() {
  $('#charcount').textContent = `${$('#compose').value.length}/2000`;
}

// === @mention autocomplete ===
let mentionStart = -1;
function onComposeInput() {
  updateCharcount();
  setTimeout(() => {
    const ta = $('#compose');
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const match = before.match(/@([a-z0-9_-]*)$/i);
    if (!match) { hideMentionDropdown(); return; }
    mentionStart = pos - match[0].length;
    const query = match[1].toLowerCase();
    const hits = [...knownUsers].filter(u => u.toLowerCase().startsWith(query) && u !== currentUser);
    if (!hits.length) { hideMentionDropdown(); return; }
    const dd = $('#mention-dropdown');
    dd.innerHTML = hits.slice(0, 6).map((u, i) =>
      `<div class="mention-item${i === 0 ? ' active' : ''}" data-username="${esc(u)}">@${esc(u)}</div>`
    ).join('');
    dd.hidden = false;
  }, 0);
}
function hideMentionDropdown() { $('#mention-dropdown').hidden = true; mentionStart = -1; }
function insertMention(username) {
  const ta = $('#compose');
  const pos = ta.selectionStart;
  const before = ta.value.slice(0, mentionStart);
  const after  = ta.value.slice(pos);
  ta.value = `${before}@${username} ${after}`;
  const newPos = mentionStart + username.length + 2;
  ta.setSelectionRange(newPos, newPos);
  ta.focus();
  hideMentionDropdown();
  updateCharcount();
}

// === Auth (lokale accounts) ===
async function getAccounts() {
  const raw = await Store.get('accounts');
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
async function saveAccounts(acc) { await Store.set('accounts', JSON.stringify(acc)); }
function authError(msg) {
  const box = $('#auth-error');
  box.className = 'p-notification--negative';
  $('#auth-error-msg').textContent = msg;
  box.hidden = false;
}

async function doRegister() {
  $('#auth-error').hidden = true;
  const username = $('#auth-user').value.trim().toLowerCase();
  const password = $('#auth-pass').value;
  const pass2    = $('#auth-pass2').value;
  if (!username || !password) return authError('Vul een gebruikersnaam en wachtwoord in.');
  if (!/^[a-z0-9_-]{2,32}$/.test(username)) return authError('Gebruikersnaam: 2–32 tekens (a–z, 0–9, _ of -).');
  if (password.length < 6) return authError('Wachtwoord: minimaal 6 tekens.');
  if (password !== pass2)   return authError('Wachtwoorden komen niet overeen.');
  const accounts = await getAccounts();
  if (accounts[username]) return authError('Die gebruikersnaam bestaat al op dit toestel.');
  const { hash, salt } = await hashPassword(password);
  accounts[username] = { hash, salt, created: Date.now() };
  await saveAccounts(accounts);
  await enterSession(username);
}

async function doLogin() {
  $('#auth-error').hidden = true;
  const username = $('#auth-user').value.trim().toLowerCase();
  const password = $('#auth-pass').value;
  if (!username || !password) return authError('Vul een gebruikersnaam en wachtwoord in.');
  const accounts = await getAccounts();
  const acc = accounts[username];
  if (!acc) return authError('Onbekende gebruiker. Maak eerst een account aan.');
  const { hash } = await hashPassword(password, acc.salt);
  if (hash !== acc.hash) return authError('Onjuist wachtwoord.');
  await enterSession(username);
}

async function enterSession(username) {
  currentUser = username;
  knownUsers.add(username);
  await Store.set('current_user', username);
  $('#auth-pass').value = '';
  $('#auth-pass2').value = '';
  await startApp();
}

async function logout() {
  mqttDisconnect();
  await Store.remove('current_user');
  currentUser = '';
  messages.length = 0;
  subscriptions.clear();
  activeTopicFilter = null;
  unreadCount = 0;
  $('#app').hidden = true;
  $('#view-auth').hidden = false;
}

async function startApp() {
  const savedTheme = await Store.get('theme');
  await applyTheme(savedTheme || 'ubuntu');
  $('#header-user').textContent = currentUser ? `@${currentUser}` : '';

  $('#conn-url').value      = (await Store.get('conn_url'))      || 'wss://broker.hivemq.com:8884/mqtt';
  $('#conn-clientid').value = (await Store.get('conn_clientid')) || `${currentUser}-${Math.random().toString(16).slice(2, 8)}`;
  $('#conn-login').value    = (await Store.get('conn_login'))    || '';

  $('#view-auth').hidden = true;
  $('#app').hidden = false;

  await requestNotifPermission();
  showView('timeline');
  renderMessages();
  updateConnUI();

  const url = await Store.get('conn_url');
  if (url) mqttConnect(true).catch(() => {});
}

// === MQTT-verbinding ===
function updateConnUI() {
  const dot = $('#conn-dot'), lbl = $('#conn-label');
  const statusText = $('#conn-status-text');
  const btnC = $('#btn-connect'), btnD = $('#btn-disconnect');
  if (connected) {
    dot.className = 'conn-dot conn-dot--on';
    lbl.textContent = 'online';
    statusText.textContent = 'verbonden';
    btnC.hidden = true; btnD.hidden = false;
  } else {
    dot.className = 'conn-dot conn-dot--off';
    lbl.textContent = 'offline';
    statusText.textContent = 'niet verbonden';
    btnC.hidden = false; btnD.hidden = true;
  }
}

function mqttConnect(silent = false) {
  return new Promise((resolve, reject) => {
    if (typeof mqtt === 'undefined') {
      if (!silent) toastErr('mqtt.js niet geladen.');
      return reject(new Error('mqtt ontbreekt'));
    }
    const url      = $('#conn-url').value.trim();
    const clientId = $('#conn-clientid').value.trim() || undefined;
    const username = $('#conn-login').value.trim() || undefined;
    const password = $('#conn-pass').value || undefined;
    const clean    = $('#conn-clean').checked;
    if (!url) { if (!silent) toastInfo('Vul een WebSocket-URL in.'); return reject(new Error('geen url')); }

    Store.set('conn_url', url);
    if (clientId) Store.set('conn_clientid', clientId);
    Store.set('conn_login', username || '');

    $('#conn-dot').className = 'conn-dot conn-dot--wait';
    $('#conn-label').textContent = 'verbinden…';
    $('#conn-status-text').textContent = 'verbinden…';

    let c;
    try {
      c = mqtt.connect(url, {
        clientId, username, password, clean,
        keepalive: 30, connectTimeout: 12000, reconnectPeriod: 0,
        // protocolVersion standaard 4 (MQTT 3.1.1): maximaal compatibel met
        // publieke brokers én de lokale Aedes-broker. Zet op 5 voor MQTT 5.0.
      });
    } catch (e) {
      updateConnUI();
      if (!silent) toastErr('Ongeldige URL: ' + e.message);
      return reject(e);
    }
    client = c;
    let settled = false;

    c.on('connect', () => {
      settled = true;
      connected = true;
      updateConnUI();
      pushLog('in', 'CONNACK', url + (clientId ? ` · client-id: ${clientId}` : ''));
      if (!silent) toastInfo('Verbonden met de broker.');
      // Opgeslagen abonnementen herstellen
      Store.get('subs').then(raw => {
        let saved = {};
        try { saved = raw ? JSON.parse(raw) : {}; } catch (_) {}
        Object.entries(saved).forEach(([t, q]) => doSubscribe(t, q, true));
        renderSubs();
      });
      resolve();
    });

    c.on('message', (topic, payload, packet) => onMqttMessage(topic, payload, packet));

    c.on('error', (err) => {
      pushLog('err', 'ERROR', err.message || String(err));
      if (!silent) toastErr(err.message || 'MQTT-fout');
      if (!settled) { settled = true; reject(err); }
    });

    c.on('close', () => {
      const was = connected;
      connected = false;
      updateConnUI();
      pushLog('err', 'DISCONNECT', 'verbinding gesloten');
      if (was) toastInfo('Verbinding met de broker verbroken.');
      if (!settled) { settled = true; reject(new Error('Verbinding gesloten.')); }
    });
  });
}

function mqttDisconnect() {
  try { if (client) client.end(true); } catch (_) {}
  client = null;
  connected = false;
  subscriptions.clear();
  updateConnUI();
  renderSubs();
}

// === Abonnementen (topics) ===
function doSubscribe(topicFilter, qos = 1, silent = false) {
  topicFilter = (topicFilter || '').trim();
  qos = Number(qos) || 0;
  if (!topicFilter) return;
  if (subscriptions.has(topicFilter)) { if (!silent) toastInfo('Al geabonneerd op dit topic.'); return; }
  if (!connected || !client) { if (!silent) toastErr('Eerst verbinden met een broker.'); return; }
  client.subscribe(topicFilter, { qos }, (err, granted) => {
    if (err) { toastErr(err.message); return; }
    subscriptions.set(topicFilter, qos);
    persistSubs();
    renderSubs();
    pushLog('out', 'SUBSCRIBE', `${topicFilter} (QoS ${qos})`);
    if (granted && granted[0]) pushLog('in', 'SUBACK', `${granted[0].topic} · QoS ${granted[0].qos}`);
    if (!silent) toastInfo(`Geabonneerd op ${topicFilter}`);
  });
}

function doUnsubscribe(topicFilter) {
  if (client) client.unsubscribe(topicFilter, () => {});
  subscriptions.delete(topicFilter);
  persistSubs();
  renderSubs();
  pushLog('out', 'UNSUBSCRIBE', topicFilter);
}

function persistSubs() {
  Store.set('subs', JSON.stringify(Object.fromEntries(subscriptions)));
}

function renderSubs() {
  const wall = $('#tag-wall');
  const topics = [...subscriptions.keys()];
  if (!topics.length) {
    wall.innerHTML = '<p class="u-text--muted">Nog geen abonnementen. Voeg hierboven een topic-filter toe.</p>';
    return;
  }
  wall.innerHTML = `<div class="tag-wall">${
    topics.map(t => {
      const count = messages.filter(m => topicMatches(t, m.topic)).length;
      const active = activeTopicFilter === t ? ' tag-pill--active' : '';
      return `<button class="tag-pill${active}" data-dest="${esc(t)}">
        ${esc(t)}<span class="tag-pill__count">${count}</span>
        <span class="tag-pill__x" data-unsub="${esc(t)}" title="Opzeggen" style="margin-left:4px">×</span>
      </button>`;
    }).join('')
  }</div>`;
}

// === Binnenkomende MQTT-berichten ===
function onMqttMessage(topic, payload, packet) {
  const raw = payload.toString();
  const qos = packet?.qos ?? 0;
  const retain = !!packet?.retain;
  pushLog('in', 'PUBLISH', `${topic} (QoS ${qos}${retain ? ', retain' : ''})\n${raw}`);

  let sender = topic, text = raw;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      if (typeof obj.text === 'string') { text = obj.text; sender = obj.sender || topic; }
      else { text = JSON.stringify(obj); }   // telemetrie-JSON netjes tonen
    }
  } catch (_) { /* platte tekst/telemetrie */ }
  if (sender && sender !== topic) knownUsers.add(sender);

  const own = sender === currentUser;
  addMessage({ topic, sender, text, qos, retain, ts: Date.now(), own });

  if (!own) {
    const mentioned = text.toLowerCase().includes(`@${currentUser.toLowerCase()}`);
    if (mentioned) {
      const title = `@${sender} noemde jou`;
      showToast({ title, text: text.slice(0, 80), type: 'mention' });
      sendSystemNotif(title, text.slice(0, 80));
      playUbuntuSound(); bumpUnread(1);
    } else {
      showToast({ title: topic, text: text.slice(0, 60), type: 'post' });
      playUbuntuSound(); bumpUnread(1);
    }
  }
}

function addMessage(m) {
  messages.unshift(m);
  if (messages.length > MSG_CAP) messages.length = MSG_CAP;
  renderMessages();
}

function renderMessages() {
  let list = messages;
  if (activeTopicFilter) list = list.filter(m => m.topic === activeTopicFilter);
  $('#timeline-status').textContent = messages.length
    ? (activeTopicFilter ? `${list.length} op ${activeTopicFilter}` : `${messages.length} bericht${messages.length !== 1 ? 'en' : ''}`)
    : 'Nog geen berichten. Abonneer op een topic en wacht op verkeer, of publiceer zelf.';

  $('#timeline').innerHTML = list.map(m => `
    <div class="twt${m.own ? ' twt--own' : ''}">
      <div class="twt__meta">
        <span class="twt__nick">@${esc(m.sender)}</span>
        <span class="twt__time">· ${relTime(m.ts)}</span>
        <span class="twt__subject" data-filter-dest="${esc(m.topic)}">${esc(m.topic)}</span>
        <span class="twt__qos">QoS ${m.qos}${m.retain ? ' · retain' : ''}</span>
      </div>
      <div class="twt__body">${formatText(m.text)}</div>
    </div>`).join('');
}

function setTopicFilter(topic) {
  activeTopicFilter = topic;
  $('#tag-filter-bar').hidden = !topic;
  if (topic) { $('#tag-filter-name').textContent = topic; showView('timeline'); }
  renderMessages();
}

// === Publiceren (PUBLISH) ===
function publishMessage() {
  const topic  = $('#compose-subject').value.trim();
  const raw    = $('#compose').value.trim();
  const qos    = Number($('#compose-qos').value) || 0;
  const retain = $('#compose-retain').checked;
  if (!topic) return toastErr('Vul een topic in (bijv. sensors/woonkamer/temp).');
  if (!raw) return;
  if (!connected || !client) return toastErr('Niet verbonden met een broker.');

  // Chat-stijl payload als het geen JSON is; JSON laten we ongemoeid (telemetrie)
  let payload = raw, sender = currentUser, text = raw;
  let isJson = false;
  try { JSON.parse(raw); isJson = true; } catch (_) {}
  if (!isJson) payload = JSON.stringify({ sender: currentUser, text: raw, ts: Date.now() });

  client.publish(topic, payload, { qos, retain }, (err) => {
    if (err) return toastErr(err.message);
    pushLog('out', 'PUBLISH', `${topic} (QoS ${qos}${retain ? ', retain' : ''})\n${payload}`);
    // Geen lokale echo: ben je zelf geabonneerd op dit topic, dan levert de
    // broker het bericht terug en verschijnt het (precies één keer) in de feed.
    // Zo niet, dan zie je in MQTT je eigen publicatie niet — dat is correct.
    $('#compose').value = '';
    updateCharcount();
    closeCompose();
  });
}

// === Logboek ===
function pushLog(dir, cmd, detail) {
  logEntries.unshift({ dir, cmd, detail: detail || '', ts: Date.now() });
  if (logEntries.length > 200) logEntries.length = 200;
  if (!$('#view-admin').hidden) renderLog();
}
function renderLog() {
  const cls = { in: 'log-row--in', out: 'log-row--out', err: 'log-row--err' };
  $('#admin-list').innerHTML = logEntries.map(e => {
    const arrow = e.dir === 'in' ? '←' : (e.dir === 'out' ? '→' : '×');
    const body = e.detail ? `\n${esc(e.detail.length > 300 ? e.detail.slice(0, 300) + '…' : e.detail)}` : '';
    return `<div class="log-row ${cls[e.dir] || ''}">
      <span class="log-row__time">${new Date(e.ts).toLocaleTimeString('nl-NL')}</span>
      <span class="log-row__cmd">${arrow} ${esc(e.cmd)}</span>${body}
    </div>`;
  }).join('') || '<p class="u-text--muted">Nog geen pakketten.</p>';
}

// ============================================================
// NOTIFICATIES  (identiek aan de twtxt-/stomp-app)
// ============================================================
function playUbuntuSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 523.25, start: 0,    dur: 0.12, vol: 0.28 },
      { freq: 783.99, start: 0.10, dur: 0.18, vol: 0.22 },
    ];
    notes.forEach(n => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = n.freq;
      const t = ctx.currentTime + n.start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(n.vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
      osc.start(t); osc.stop(t + n.dur + 0.02);
    });
  } catch (_) {}
}

let toastCount = 0;
function showToast({ title, text, type = 'post', autoDismiss = 6000 }) {
  const icons = {
    mention: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>',
    post:    '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>',
    info:    '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
  };
  const id = `toast-${++toastCount}`;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.id = id;
  el.innerHTML = `
    <svg class="toast__icon" viewBox="0 0 24 24">${icons[type] || icons.info}</svg>
    <div class="toast__body">
      <div class="toast__title">${esc(title)}</div>
      ${text ? `<div class="toast__text">${esc(text)}</div>` : ''}
    </div>
    <button class="toast__close" data-toast-id="${id}" aria-label="Sluiten">×</button>`;
  $('#toast-container').prepend(el);
  if (autoDismiss > 0) setTimeout(() => dismissToast(id), autoDismiss);
}
function toastInfo(text) { showToast({ title: text, type: 'info', autoDismiss: 4000 }); }
function toastErr(text)  { showToast({ title: 'Fout', text, type: 'mention', autoDismiss: 7000 }); }

function dismissToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('removing');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

let notifPermission = false;
let notifIdCounter  = 100;
async function requestNotifPermission() {
  try {
    const { LocalNotifications } = Capacitor.Plugins;
    if (!LocalNotifications) return;
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') { notifPermission = true; return; }
    const res = await LocalNotifications.requestPermissions();
    notifPermission = res.display === 'granted';
  } catch (_) {}
}
async function sendSystemNotif(title, body) {
  if (!notifPermission) return;
  try {
    const { LocalNotifications } = Capacitor.Plugins;
    if (!LocalNotifications) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: ++notifIdCounter, title, body,
        smallIcon: 'ic_stat_icon_config_sample', iconColor: '#E95420',
      }],
    });
  } catch (_) {}
}

function bumpUnread(n = 1) {
  unreadCount += n;
  const badge = $('#notif-badge');
  badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
  badge.hidden = false;
  $('#notif-btn').classList.add('has-new');
}
function clearUnread() {
  unreadCount = 0;
  $('#notif-badge').hidden = true;
  $('#notif-btn').classList.remove('has-new');
}

// === Events ===
document.addEventListener('DOMContentLoaded', async () => {
  $('#btn-login').addEventListener('click', () => {
    $('#auth-pass2-wrap').hidden = true;
    $('#auth-pass2').value = '';
    doLogin();
  });
  let registerMode = false;
  $('#btn-register').addEventListener('click', () => {
    if (!registerMode) {
      registerMode = true;
      $('#auth-pass2-wrap').hidden = false;
      $('#auth-pass2').focus();
      return;
    }
    doRegister();
  });
  $('#auth-user').addEventListener('input', () => {
    registerMode = false;
    $('#auth-pass2-wrap').hidden = true;
    $('#auth-pass2').value = '';
  });
  $('#logout-btn').addEventListener('click', logout);

  $('#notif-btn').addEventListener('click', () => {
    clearUnread(); showView('timeline'); renderMessages();
  });
  $('#toast-container').addEventListener('click', e => {
    const btn = e.target.closest('[data-toast-id]');
    if (btn) dismissToast(btn.dataset.toastId);
  });
  $('#theme-select').addEventListener('change', e => applyTheme(e.target.value));

  $('#compose-bar').addEventListener('click', openCompose);
  $('#compose-bar').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') openCompose();
  });
  $('#btn-compose-cancel').addEventListener('click', closeCompose);
  $('#btn-post').addEventListener('click', publishMessage);
  $('#compose').addEventListener('input', onComposeInput);
  $('#btn-icon-picker').addEventListener('click', toggleIconPicker);
  $('#icon-picker').addEventListener('click', e => {
    const btn = e.target.closest('[data-icon-code]');
    if (btn) insertIcon(btn.dataset.iconCode);
  });
  $('#mention-dropdown').addEventListener('mousedown', e => {
    const item = e.target.closest('[data-username]');
    if (item) { e.preventDefault(); insertMention(item.dataset.username); }
  });

  $('#btn-clear-filter').addEventListener('click', () => setTopicFilter(null));
  $('#timeline').addEventListener('click', e => {
    const badge = e.target.closest('[data-filter-dest]');
    if (badge) setTopicFilter(badge.dataset.filterDest);
  });

  document.querySelectorAll('#bottom-nav button[data-view]').forEach(btn =>
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      showView(v);
      if (v === 'timeline') renderMessages();
      if (v === 'tags')     renderSubs();
      if (v === 'admin')    renderLog();
    }));

  $('#btn-subscribe').addEventListener('click', () => {
    const t = $('#sub-destination').value.trim();
    const q = Number($('#sub-qos').value) || 0;
    if (t) { doSubscribe(t, q); $('#sub-destination').value = ''; }
  });
  $('#sub-destination').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#btn-subscribe').click();
  });
  $('#tag-wall').addEventListener('click', e => {
    const x = e.target.closest('[data-unsub]');
    if (x) { e.stopPropagation(); doUnsubscribe(x.dataset.unsub); return; }
    const pill = e.target.closest('[data-dest]');
    if (pill) setTopicFilter(pill.dataset.dest);
  });

  $('#btn-connect').addEventListener('click', () => mqttConnect(false).catch(() => {}));
  $('#btn-disconnect').addEventListener('click', mqttDisconnect);
  $('#btn-clear-log').addEventListener('click', () => { logEntries.length = 0; renderLog(); });

  const savedUser = await Store.get('current_user');
  if (savedUser) {
    currentUser = savedUser;
    knownUsers.add(savedUser);
    await startApp();
  } else {
    $('#view-auth').hidden = false;
  }
});
