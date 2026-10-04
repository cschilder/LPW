// LPW demo-kern — gedeelde basis voor alle protocol-demo's.
// Bouwt header, inlog/registratie, thema's, onderste navigatie, toasts en het
// Logboek op, en biedt een API-helper voor de PHP-protocolbruggen (../api/*.php).
//
// Gebruik in een app:
//   <body data-app="gopher" data-titel="gopher" data-sub="Gopher-client (RFC 1436)">
//     <section class="view-content" data-view="main" data-label="Bladeren" data-icon="browse">…</section>
//   <script src="../_kern/js/kern.js"></script>
//   <script>Kern.onStart(user => { … });</script>
//
// Alle demo's delen dezelfde origin, dus één account werkt in elke demo.
(function () {
  'use strict';

  const Kern = (window.Kern = {});
  const APP = document.body.dataset.app || 'demo';
  const startHandlers = [];

  // ---------- helpers ----------
  Kern.$ = (sel, root = document) => root.querySelector(sel);
  Kern.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  Kern.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Kern.param = (name) => new URLSearchParams(location.search).get(name);
  Kern.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  Kern.hex = (bytes, sep = ' ') => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(sep);
  Kern.fromHex = (hex) => {
    const clean = String(hex).replace(/[^0-9a-f]/gi, '');
    const out = new Uint8Array(clean.length >> 1);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  };
  Kern.time = (ts = Date.now()) => new Date(ts).toLocaleTimeString('nl-NL');
  Kern.relTime = (ts) => {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'zojuist';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}u`;
    return new Date(ts).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  Kern.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); Kern.toast('Gekopieerd', '', 'info'); }
    catch (_) { Kern.toast('Kopiëren mislukt', '', 'err'); }
  };

  // ---------- opslag (gedeeld + per app/per gebruiker) ----------
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} },
  };
  const readJSON = (k, def) => { try { const v = ls.get(k); return v == null ? def : JSON.parse(v); } catch (_) { return def; } };
  Kern.user = '';
  Kern.get = (key, def = null) => readJSON(`lpw_${APP}_${Kern.user}_${key}`, def);
  Kern.set = (key, val) => ls.set(`lpw_${APP}_${Kern.user}_${key}`, JSON.stringify(val));
  Kern.shared = {
    get: (key, def = null) => readJSON(`lpw_shared_${Kern.user}_${key}`, def),
    set: (key, val) => ls.set(`lpw_shared_${Kern.user}_${key}`, JSON.stringify(val)),
  };

  // ---------- iconen (Material-paden, zelfde stijl als twtxt) ----------
  const ICON = {
    chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    browse: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    send: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
    tag: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
    user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    key: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
    gauge: 'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z',
    cube: 'M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z',
    search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    log: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    mail: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    rss: 'M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20 5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z',
    radio: 'M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z',
  };
  Kern.icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[name] || ICON.info}"/></svg>`;

  // ---------- opbouw van de schil ----------
  function buildShell() {
    const b = document.body;
    const titel = b.dataset.titel || APP;
    const sub = b.dataset.sub || '';
    const views = Kern.$$('section[data-view]');

    const auth = document.createElement('div');
    auth.id = 'view-auth';
    auth.hidden = true;
    auth.innerHTML = `
      <div class="auth-wrap"><div class="p-card auth-card">
        <h2 class="p-card__title u-no-margin--bottom">${Kern.esc(titel)}</h2>
        <p class="p-text--small u-text--muted">${Kern.esc(sub)}</p>
        <div id="auth-error" class="p-notification--negative" hidden>
          <div class="p-notification__content"><p class="p-notification__message" id="auth-error-msg"></p></div>
        </div>
        <label class="p-form__label" for="auth-user">Gebruikersnaam</label>
        <input class="p-form-validation__input" type="text" id="auth-user" autocapitalize="none" autocomplete="username" placeholder="jouwNaam">
        <label class="p-form__label" for="auth-pass">Wachtwoord</label>
        <input class="p-form-validation__input" type="password" id="auth-pass" autocomplete="current-password">
        <div id="auth-pass2-wrap" hidden>
          <label class="p-form__label" for="auth-pass2">Wachtwoord bevestigen</label>
          <input class="p-form-validation__input" type="password" id="auth-pass2" autocomplete="new-password">
        </div>
        <div class="u-sv1"></div>
        <button class="p-button--positive" id="btn-login" style="width:100%">Inloggen</button>
        <div class="u-sv--small"></div>
        <button class="p-button" id="btn-register" style="width:100%">Account aanmaken</button>
        <p class="p-text--small u-text--muted" style="margin-top:.6rem">
          Eén lokaal account (op dit toestel, wachtwoord PBKDF2-gehasht) werkt in álle LPW-demo's.
          <a href="../index.html" style="color:var(--accent)">← alle demo's</a>
        </p>
      </div></div>`;

    const app = document.createElement('div');
    app.id = 'app';
    app.hidden = true;
    app.innerHTML = `
      <header class="app-header">
        <span class="app-header__title"><a class="kern-home" href="../index.html" title="Alle demo's">⌂</a><span id="header-title">${Kern.esc(titel)}</span></span>
        <div class="app-header__right">
          <span class="app-header__conn"><span class="conn-dot conn-dot--idle" id="conn-dot"></span><span id="conn-label">klaar</span></span>
          <span class="app-header__user" id="header-user"></span>
          <select class="app-header__theme-select" id="theme-select" title="Thema kiezen">
            <option value="ubuntu">Ubuntu</option><option value="dark">Donker</option>
            <option value="suru">Suru</option><option value="aubergine">Aubergine</option>
          </select>
          <button class="p-button--base is-dense app-header__logout" id="logout-btn">Uitloggen</button>
        </div>
      </header>
      <main id="kern-views"></main>
      <nav id="bottom-nav"></nav>`;

    const main = app.querySelector('#kern-views');
    views.forEach((v) => { v.classList.add('view-content'); v.hidden = true; main.appendChild(v); });

    const log = document.createElement('section');
    log.className = 'view-content';
    log.dataset.view = 'logboek';
    log.dataset.label = 'Logboek';
    log.dataset.icon = 'log';
    log.hidden = true;
    log.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h4 class="p-muted-heading" style="margin-bottom:0">Protocolverkeer</h4>
        <button class="kern-btn kern-btn--ghost kern-btn--small" id="btn-clear-log">Wissen</button>
      </div>
      <p class="p-text--small u-text--muted">Groen = binnenkomend · oranje = uitgaand · rood = fout. Bij bruggen zie je wat de PHP-brug écht over de draad stuurde.</p>
      <div id="admin-list"></div>`;
    main.appendChild(log);

    const nav = app.querySelector('#bottom-nav');
    [...views, log].forEach((v, i) => {
      const btn = document.createElement('button');
      btn.dataset.view = v.dataset.view;
      if (i === 0) btn.classList.add('active');
      btn.innerHTML = `${Kern.icon(v.dataset.icon)}${Kern.esc(v.dataset.label || v.dataset.view)}`;
      btn.addEventListener('click', () => Kern.show(v.dataset.view));
      nav.appendChild(btn);
    });

    const toasts = document.createElement('div');
    toasts.id = 'toast-container';
    toasts.setAttribute('aria-live', 'polite');

    b.prepend(app);
    b.prepend(auth);
    b.appendChild(toasts);
  }

  const viewHooks = {};
  Kern.onView = (name, fn) => { (viewHooks[name] = viewHooks[name] || []).push(fn); };
  Kern.show = (name) => {
    Kern.$$('#kern-views > section[data-view]').forEach((s) => { s.hidden = s.dataset.view !== name; });
    Kern.$$('#bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    const sec = Kern.$(`#kern-views > section[data-view="${name}"]`);
    Kern.$('#header-title').textContent = name === Kern.firstView ? (document.body.dataset.titel || APP) : (sec?.dataset.label || name);
    if (name === 'logboek') renderLog();
    (viewHooks[name] || []).forEach((fn) => fn());
    window.scrollTo(0, 0);
  };

  // ---------- status-indicator ----------
  Kern.status = (state, label) => {
    const dot = Kern.$('#conn-dot');
    if (!dot) return;
    dot.className = `conn-dot conn-dot--${state === 'on' ? 'on' : state === 'wait' ? 'wait' : 'off'}`;
    Kern.$('#conn-label').textContent = label || (state === 'on' ? 'online' : state === 'wait' ? 'bezig…' : 'fout');
  };

  // ---------- toasts ----------
  let toastN = 0;
  Kern.toast = (title, text = '', type = 'info', ms) => {
    const cont = Kern.$('#toast-container');
    if (!cont) return;
    const id = `toast-${++toastN}`;
    const el = document.createElement('div');
    const cls = type === 'err' ? 'mention' : type === 'ok' ? 'post' : 'info';
    el.className = `toast toast--${cls}`;
    el.id = id;
    el.innerHTML = `${Kern.icon(type === 'err' ? 'info' : type === 'ok' ? 'chat' : 'info').replace('<svg', '<svg class="toast__icon"')}
      <div class="toast__body"><div class="toast__title">${Kern.esc(title)}</div>${text ? `<div class="toast__text">${Kern.esc(text)}</div>` : ''}</div>
      <button class="toast__close" aria-label="Sluiten">×</button>`;
    el.querySelector('.toast__close').onclick = () => dismiss(el);
    cont.prepend(el);
    setTimeout(() => dismiss(el), ms || (type === 'err' ? 7000 : 4000));
  };
  function dismiss(el) {
    if (!el.isConnected || el.classList.contains('removing')) return;
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  // ---------- logboek ----------
  const logEntries = [];
  Kern.log = (dir, cmd, detail = '') => {
    logEntries.unshift({ dir, cmd, detail: String(detail), ts: Date.now() });
    if (logEntries.length > 300) logEntries.length = 300;
    const sec = Kern.$('#kern-views > section[data-view="logboek"]');
    if (sec && !sec.hidden) renderLog();
  };
  function renderLog() {
    const list = Kern.$('#admin-list');
    if (!list) return;
    const cls = { in: 'log-row--in', out: 'log-row--out', err: 'log-row--err' };
    list.innerHTML = logEntries.map((e) => {
      const arrow = e.dir === 'in' ? '←' : e.dir === 'out' ? '→' : '×';
      const d = e.detail.length > 1500 ? e.detail.slice(0, 1500) + '…' : e.detail;
      return `<div class="log-row ${cls[e.dir] || ''}"><span class="log-row__time">${Kern.time(e.ts)}</span><span class="log-row__cmd">${arrow} ${Kern.esc(e.cmd)}</span>${d ? '\n' + Kern.esc(d) : ''}</div>`;
    }).join('') || '<p class="u-text--muted">Nog geen verkeer.</p>';
  }

  // ---------- API-helper voor de PHP-bruggen ----------
  const SECRET_KEYS = /pass|wachtwoord|token|key|secret|admin/i;
  Kern.api = async (proto, body = {}, { silent = false } = {}) => {
    const shown = Object.fromEntries(Object.entries(body).map(([k, v]) =>
      [k, SECRET_KEYS.test(k) && v ? '••••' : (typeof v === 'string' && v.length > 300 ? v.slice(0, 300) + '…' : v)]));
    Kern.log('out', `API ${proto}.php`, JSON.stringify(shown));
    Kern.status('wait');
    let res, data;
    try {
      res = await fetch(`../api/${proto}.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      try { data = JSON.parse(text); }
      catch (_) { throw new Error(`Brug gaf geen JSON (HTTP ${res.status}). Draait PHP? ${text.slice(0, 120)}`); }
    } catch (e) {
      Kern.status('off', 'fout');
      Kern.log('err', 'BRUG', e.message);
      if (!silent) Kern.toast('Brug niet bereikbaar', e.message, 'err');
      throw e;
    }
    (data.trace || []).forEach((t) => Kern.log(t.dir, t.cmd, t.detail));
    if (!data.ok) {
      Kern.status('off', 'fout');
      Kern.log('err', 'FOUT', data.error || 'onbekend');
      if (!silent) Kern.toast('Fout', data.error || 'onbekend', 'err');
      const err = new Error(data.error || 'onbekend');
      err.data = data;
      throw err;
    }
    Kern.status('on', data.ms != null ? `${data.ms} ms` : 'online');
    return data;
  };

  // Resultaat in beeld brengen (handig op mobiel: het staat vaak onder het formulier)
  Kern.reveal = (el) => { const e = typeof el === 'string' ? Kern.$(el) : el; if (e) setTimeout(() => e.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };

  // Invoervraag als kaart (i.p.v. de blokkerende browser-prompt)
  Kern.ask = (label, { secret = false, value = '' } = {}) => new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'kern-ask';
    wrap.innerHTML = `<div class="kern-card kern-ask__card">
        <label class="kern-label">${Kern.esc(label)}</label>
        <input class="kern-input" type="${secret ? 'password' : 'text'}" value="${Kern.esc(value)}" autocapitalize="none">
        <div class="kern-btns"><button class="kern-btn" data-ok>OK</button><button class="kern-btn kern-btn--ghost" data-cancel>Annuleren</button></div>
      </div>`;
    const done = (v) => { wrap.remove(); resolve(v); };
    const inp = wrap.querySelector('input');
    wrap.querySelector('[data-ok]').onclick = () => done(inp.value);
    wrap.querySelector('[data-cancel]').onclick = () => done(null);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') done(null); });
    document.body.appendChild(wrap);
    inp.focus();
  });

  // Knop tijdelijk uitschakelen terwijl een actie loopt
  Kern.busy = async (btn, fn) => {
    const label = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Bezig…'; }
    try { return await fn(); }
    catch (_) { /* fout is al getoond */ }
    finally { if (btn) { btn.disabled = false; btn.textContent = label; } }
  };

  // ---------- gemtext ----------
  // Rendert text/gemini; links krijgen data-href (absoluut gemaakt t.o.v. base).
  Kern.resolveUrl = (base, href) => {
    try { return new URL(href, base).href; } catch (_) { return href; }
  };
  Kern.renderGemtext = (text, base = '') => {
    const out = [];
    let pre = false, preBuf = [], list = [];
    const flushList = () => { if (list.length) { out.push(`<ul>${list.join('')}</ul>`); list = []; } };
    for (const raw of String(text).replace(/\r/g, '').split('\n')) {
      if (raw.startsWith('```')) {
        if (pre) { out.push(`<pre>${Kern.esc(preBuf.join('\n'))}</pre>`); preBuf = []; pre = false; }
        else { flushList(); pre = true; }
        continue;
      }
      if (pre) { preBuf.push(raw); continue; }
      if (raw.startsWith('* ')) { list.push(`<li>${Kern.esc(raw.slice(2))}</li>`); continue; }
      flushList();
      if (raw.startsWith('=>')) {
        const m = raw.slice(2).trim().match(/^(\S+)(?:\s+(.*))?$/);
        if (!m) continue;
        const abs = base ? Kern.resolveUrl(base, m[1]) : m[1];
        out.push(`<p class="gem-link"><a class="kern-link" data-href="${Kern.esc(abs)}">${Kern.esc(m[2] || m[1])}</a> <span class="kern-muted">${Kern.esc(abs.split(':')[0])}</span></p>`);
      } else if (raw.startsWith('=:')) {
        const m = raw.slice(2).trim().match(/^(\S+)(?:\s+(.*))?$/);
        if (!m) continue;
        const abs = base ? Kern.resolveUrl(base, m[1]) : m[1];
        out.push(`<p class="gem-link"><a class="kern-link" data-href="${Kern.esc(abs)}" data-input="1">${Kern.esc(m[2] || m[1])}</a> <span class="kern-muted">invoer</span></p>`);
      } else if (raw.startsWith('###')) out.push(`<h3>${Kern.esc(raw.slice(3).trim())}</h3>`);
      else if (raw.startsWith('##')) out.push(`<h2>${Kern.esc(raw.slice(2).trim())}</h2>`);
      else if (raw.startsWith('#')) out.push(`<h1>${Kern.esc(raw.slice(1).trim())}</h1>`);
      else if (raw.startsWith('>')) out.push(`<blockquote>${Kern.esc(raw.slice(1).trim())}</blockquote>`);
      else out.push(`<p>${Kern.esc(raw)}</p>`);
    }
    flushList();
    if (pre) out.push(`<pre>${Kern.esc(preBuf.join('\n'))}</pre>`);
    return `<div class="gemtext">${out.join('')}</div>`;
  };

  // Link naar een andere demo (bijv. gopher://-link vanuit gemini)
  Kern.demoFor = (url) => {
    const scheme = String(url).split(':')[0].toLowerCase();
    const map = { gemini: 'gemini', gopher: 'gopher', spartan: 'spartan', guppy: 'guppy', nex: 'nex', finger: 'finger', titan: 'titan', coap: 'coap', misfin: 'misfin' };
    return map[scheme] ? `../${map[scheme]}/?url=${encodeURIComponent(url)}` : null;
  };

  // ---------- thema ----------
  function applyTheme(t) {
    document.body.dataset.theme = t || 'ubuntu';
    ls.set('lpw_theme', t || 'ubuntu');
    const sel = Kern.$('#theme-select');
    if (sel) sel.value = t || 'ubuntu';
  }

  // ---------- accounts (gedeeld door alle demo's) ----------
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function hashPassword(pw, saltB64) {
    const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, km, 256);
    return { hash: b64(bits), salt: b64(salt) };
  }
  const accounts = () => readJSON('lpw_accounts', {});
  function authError(msg) {
    Kern.$('#auth-error-msg').textContent = msg;
    Kern.$('#auth-error').hidden = false;
  }
  async function register() {
    Kern.$('#auth-error').hidden = true;
    const u = Kern.$('#auth-user').value.trim().toLowerCase();
    const p = Kern.$('#auth-pass').value, p2 = Kern.$('#auth-pass2').value;
    if (!u || !p) return authError('Vul een gebruikersnaam en wachtwoord in.');
    if (!/^[a-z0-9_-]{2,32}$/.test(u)) return authError('Gebruikersnaam: 2–32 tekens (a–z, 0–9, _ of -).');
    if (p.length < 6) return authError('Wachtwoord: minimaal 6 tekens.');
    if (p !== p2) return authError('Wachtwoorden komen niet overeen.');
    const acc = accounts();
    if (acc[u]) return authError('Die gebruikersnaam bestaat al op dit toestel.');
    acc[u] = { ...(await hashPassword(p)), created: Date.now() };
    ls.set('lpw_accounts', JSON.stringify(acc));
    enter(u);
  }
  async function login() {
    Kern.$('#auth-error').hidden = true;
    const u = Kern.$('#auth-user').value.trim().toLowerCase();
    const p = Kern.$('#auth-pass').value;
    if (!u || !p) return authError('Vul een gebruikersnaam en wachtwoord in.');
    const a = accounts()[u];
    if (!a) return authError('Onbekende gebruiker. Maak eerst een account aan.');
    if ((await hashPassword(p, a.salt)).hash !== a.hash) return authError('Onjuist wachtwoord.');
    enter(u);
  }
  function enter(u) {
    Kern.user = u;
    ls.set('lpw_current_user', u);
    Kern.$('#auth-pass').value = '';
    Kern.$('#auth-pass2').value = '';
    Kern.$('#header-user').textContent = `@${u}`;
    Kern.$('#view-auth').hidden = true;
    Kern.$('#app').hidden = false;
    Kern.show(Kern.firstView);
    startHandlers.forEach((fn) => { try { fn(u); } catch (e) { console.error(e); Kern.toast('App-fout', e.message, 'err'); } });
  }
  function logout() {
    ls.del('lpw_current_user');
    location.reload();
  }

  Kern.onStart = (fn) => {
    startHandlers.push(fn);
    if (Kern.user && !Kern.$('#app')?.hidden) fn(Kern.user);
  };

  // ---------- init ----------
  function init() {
    buildShell();
    Kern.firstView = Kern.$('#kern-views > section[data-view]')?.dataset.view;
    applyTheme(ls.get('lpw_theme'));
    Kern.$('#theme-select').addEventListener('change', (e) => applyTheme(e.target.value));
    Kern.$('#logout-btn').addEventListener('click', logout);
    Kern.$('#btn-clear-log').addEventListener('click', () => { logEntries.length = 0; renderLog(); });
    Kern.$('#btn-login').addEventListener('click', () => { Kern.$('#auth-pass2-wrap').hidden = true; login(); });
    let regMode = false;
    Kern.$('#btn-register').addEventListener('click', () => {
      if (!regMode) { regMode = true; Kern.$('#auth-pass2-wrap').hidden = false; Kern.$('#auth-pass2').focus(); return; }
      register();
    });
    Kern.$('#auth-user').addEventListener('input', () => { regMode = false; Kern.$('#auth-pass2-wrap').hidden = true; });
    Kern.$('#auth-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') (regMode ? register : login)(); });

    const saved = ls.get('lpw_current_user');
    if (saved && accounts()[saved]) enter(saved);
    else Kern.$('#view-auth').hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
