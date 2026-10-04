// websocket-client — UI-logica
// Styling & structuur identiek aan de twtxt-/stomp-app; domein = ruwe WebSocket (RFC 6455).
// Berichten gaan als JSON-frame {sender,text,ts} over de draad, zodat afzender en
// @mentions werken met zowel een echo-server (stuurt terug) als een broadcast-server (groepschat).

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

// === Globale toestand ===
let ws = null;
let currentUser = '';
let connected   = false;
const messages  = [];              // { sender, text, ts, own }
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
  ['timeline', 'following', 'admin'].forEach(v => {
    $(`#view-${v}`).hidden = v !== name;
  });
  document.querySelectorAll('#bottom-nav button[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  const titles = { timeline: 'websocket', following: 'Verbinding', admin: 'Logboek' };
  $('#header-title').textContent = titles[name] || 'websocket';
}

// === Compose ===
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
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + code + ' ' + ta.value.slice(end);
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
  wsDisconnect();
  await Store.remove('current_user');
  currentUser = '';
  messages.length = 0;
  unreadCount = 0;
  $('#app').hidden = true;
  $('#view-auth').hidden = false;
}

async function startApp() {
  const savedTheme = await Store.get('theme');
  await applyTheme(savedTheme || 'ubuntu');
  $('#header-user').textContent = currentUser ? `@${currentUser}` : '';

  $('#conn-url').value   = (await Store.get('conn_url'))   || 'wss://echo.websocket.events';
  $('#conn-proto').value = (await Store.get('conn_proto')) || '';

  $('#view-auth').hidden = true;
  $('#app').hidden = false;

  await requestNotifPermission();
  showView('timeline');
  renderMessages();
  updateConnUI();

  const url = await Store.get('conn_url');
  if (url) wsConnect(true).catch(() => {});
}

// === WebSocket-verbinding ===
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

function wsConnect(silent = false) {
  return new Promise((resolve, reject) => {
    const url   = $('#conn-url').value.trim();
    const proto = $('#conn-proto').value.trim();
    if (!url) { if (!silent) toastInfo('Vul een WebSocket-URL in.'); return reject(new Error('geen url')); }

    Store.set('conn_url', url);
    Store.set('conn_proto', proto);

    $('#conn-dot').className = 'conn-dot conn-dot--wait';
    $('#conn-label').textContent = 'verbinden…';
    $('#conn-status-text').textContent = 'verbinden…';

    let sock;
    try {
      const protos = proto ? proto.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      sock = protos && protos.length ? new WebSocket(url, protos) : new WebSocket(url);
    } catch (e) {
      updateConnUI();
      if (!silent) toastErr('Ongeldige URL: ' + e.message);
      return reject(e);
    }
    ws = sock;

    const failTimer = setTimeout(() => {
      try { sock.close(); } catch (_) {}
      reject(new Error('Time-out bij verbinden.'));
    }, 15000);

    sock.onopen = () => {
      clearTimeout(failTimer);
      connected = true;
      updateConnUI();
      pushLog('in', 'OPEN', url + (sock.protocol ? ` (subprotocol: ${sock.protocol})` : ''));
      if (!silent) toastInfo('Verbonden met de server.');
      resolve();
    };

    sock.onmessage = (ev) => {
      const raw = typeof ev.data === 'string' ? ev.data : '[binair frame]';
      pushLog('in', 'MESSAGE', raw);
      let sender = '(server)', text = raw;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && typeof obj.text === 'string') {
          sender = obj.sender || sender;
          text = obj.text;
        }
      } catch (_) { /* platte tekst */ }
      if (sender && sender !== '(server)') knownUsers.add(sender);
      const own = sender === currentUser;
      addMessage({ sender, text, ts: Date.now(), own });
      if (!own) {
        const mentioned = text.toLowerCase().includes(`@${currentUser.toLowerCase()}`);
        if (mentioned) {
          const title = `@${sender} noemde jou`;
          const body  = text.length > 80 ? text.slice(0, 80) + '…' : text;
          showToast({ title, text: body, type: 'mention' });
          sendSystemNotif(title, body);
          playUbuntuSound(); bumpUnread(1);
        } else {
          showToast({ title: `Bericht van @${sender}`, text: text.slice(0, 60), type: 'post' });
          playUbuntuSound(); bumpUnread(1);
        }
      }
    };

    sock.onerror = () => {
      pushLog('err', 'ERROR', 'WebSocket-fout — is de server bereikbaar?');
      if (!silent) toastErr('WebSocket-fout — is de server bereikbaar?');
    };

    sock.onclose = (ev) => {
      clearTimeout(failTimer);
      const was = connected;
      connected = false;
      updateConnUI();
      pushLog('err', 'CLOSE', `code ${ev.code}${ev.reason ? ' · ' + ev.reason : ''}`);
      if (was) toastInfo('Verbinding verbroken.');
      else reject(new Error(`Verbinding gesloten (code ${ev.code}).`));
    };
  });
}

function wsDisconnect() {
  try { if (ws) ws.close(1000, 'client disconnect'); } catch (_) {}
  ws = null;
  connected = false;
  updateConnUI();
}

// === Bericht versturen ===
function sendMessage() {
  const text = $('#compose').value.trim();
  if (!text) return;
  if (!connected || !ws) return toastErr('Niet verbonden met een server.');
  const frame = JSON.stringify({ sender: currentUser, text, ts: Date.now() });
  try {
    ws.send(frame);
    pushLog('out', 'SEND', frame);
    // Geen lokale echo: een echo-/broadcast-server stuurt het frame terug,
    // waardoor je eigen bericht vanzelf (precies één keer) in de feed verschijnt.
    $('#compose').value = '';
    updateCharcount();
    closeCompose();
  } catch (e) { toastErr(e.message); }
}

function addMessage(m) {
  messages.unshift(m);
  if (messages.length > MSG_CAP) messages.length = MSG_CAP;
  renderMessages();
}

function renderMessages() {
  $('#timeline-status').textContent = messages.length
    ? `${messages.length} bericht${messages.length !== 1 ? 'en' : ''}`
    : 'Nog geen berichten. Verbind met een server en verstuur er één.';
  $('#timeline').innerHTML = messages.map(m => `
    <div class="twt${m.own ? ' twt--own' : ''}">
      <div class="twt__meta">
        <span class="twt__nick">@${esc(m.sender)}</span>
        <span class="twt__time">· ${relTime(m.ts)}</span>
      </div>
      <div class="twt__body">${formatText(m.text)}</div>
    </div>`).join('');
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
  }).join('') || '<p class="u-text--muted">Nog geen frames.</p>';
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
  $('#btn-post').addEventListener('click', sendMessage);
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

  document.querySelectorAll('#bottom-nav button[data-view]').forEach(btn =>
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      showView(v);
      if (v === 'timeline') renderMessages();
      if (v === 'admin')    renderLog();
    }));

  $('#btn-connect').addEventListener('click', () => wsConnect(false).catch(() => {}));
  $('#btn-disconnect').addEventListener('click', wsDisconnect);
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
