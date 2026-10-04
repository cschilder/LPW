// Nostr-client (NIP-01, NIP-19, optioneel NIP-07) — rechtstreeks via WebSocket met de relays.
// nostr-tools (nostr.bundle.js) wordt alleen gebruikt voor sleutels, ondertekenen en verifiëren;
// het relay-verkeer (EVENT/REQ/CLOSE/OK/EOSE/NOTICE) doen we zelf, zodat het Logboek het echte protocol toont.
(() => {
  const { $, esc } = Kern;
  const N = window.NostrTools;
  const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'];
  const conns = {};          // url -> { ws, state }
  const seen = new Map();    // event-id -> { ev, relays:Set, valid }
  const profiles = {};       // pubkey -> { name }
  let sk = null, pk = '', subId = '', eose = false;

  const toHex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
  const fromHex = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));

  // ---------- sleutels ----------
  function loadKeys() {
    let hex = Kern.get('sk');
    if (!hex) { hex = toHex(N.generateSecretKey()); Kern.set('sk', hex); Kern.toast('Nieuwe Nostr-sleutel', 'Er is een sleutelpaar voor je aangemaakt.', 'ok'); }
    sk = fromHex(hex);
    pk = N.getPublicKey(sk);
    renderKeys();
  }
  function renderKeys() {
    const npub = N.nip19.npubEncode(pk);
    $('#keys').innerHTML = `<h5>Jouw identiteit</h5><table class="kern-kv">
      <tr><th>npub (publiek)</th><td><code style="word-break:break-all">${esc(npub)}</code></td></tr>
      <tr><th>hex</th><td><code style="word-break:break-all">${esc(pk)}</code></td></tr>
      <tr><th>nsec (geheim)</th><td><button class="kern-btn kern-btn--ghost kern-btn--small" id="btn-show-nsec">Tonen</button> <span id="nsec"></span></td></tr>
      <tr><th>Ondertekenen</th><td>${window.nostr ? '<span class="kern-badge kern-badge--ok">NIP-07-extensie</span>' : 'lokaal in deze browser'}</td></tr></table>
      <div class="kern-btns"><button class="kern-btn kern-btn--ghost kern-btn--small" id="btn-copy-npub">npub kopiëren</button></div>`;
    $('#btn-copy-npub').onclick = () => Kern.copy(npub);
    $('#btn-show-nsec').onclick = () => { $('#nsec').innerHTML = `<code style="word-break:break-all">${esc(N.nip19.nsecEncode(sk))}</code>`; };
  }
  async function sign(tmpl) {
    if (window.nostr) return window.nostr.signEvent(tmpl);
    return N.finalizeEvent(tmpl, sk);
  }

  // ---------- relays ----------
  const relayList = () => Kern.get('relays', DEFAULT_RELAYS);
  function connect(url) {
    if (conns[url]?.ws && conns[url].ws.readyState <= 1) return;
    const c = (conns[url] = { state: 'verbinden…' });
    try { c.ws = new WebSocket(url); } catch (e) { c.state = 'ongeldige URL'; return renderRelays(); }
    c.ws.onopen = () => { c.state = 'verbonden'; renderRelays(); if (subId) sendTo(url, ['REQ', subId, currentFilter()]); };
    c.ws.onclose = () => { c.state = 'gesloten'; renderRelays(); };
    c.ws.onerror = () => { c.state = 'fout'; renderRelays(); };
    c.ws.onmessage = (m) => onRelay(url, m.data);
    renderRelays();
  }
  function sendTo(url, msg) {
    const c = conns[url];
    if (!c?.ws || c.ws.readyState !== 1) return false;
    const s = JSON.stringify(msg);
    c.ws.send(s);
    Kern.log('out', `${msg[0]} → ${url.replace('wss://', '').replace('ws://', '')}`, s.slice(0, 800));
    return true;
  }
  const broadcast = (msg) => relayList().filter((u) => sendTo(u, msg));

  function onRelay(url, data) {
    let m; try { m = JSON.parse(data); } catch (_) { return; }
    const short = url.replace(/^wss?:\/\//, '');
    if (m[0] === 'EVENT') {
      const ev = m[2];
      Kern.log('in', `EVENT ← ${short}`, JSON.stringify(ev).slice(0, 600));
      let rec = seen.get(ev.id);
      if (!rec) { rec = { ev, relays: new Set(), valid: N.verifyEvent(ev) }; seen.set(ev.id, rec); }
      rec.relays.add(short);
      if (ev.kind === 0) { try { profiles[ev.pubkey] = JSON.parse(ev.content); } catch (_) {} }
      scheduleRender();
    } else if (m[0] === 'EOSE') {
      Kern.log('in', `EOSE ← ${short}`, `${m[1]}: opgeslagen events gehad, nu live`);
      eose = true;
      renderFeed();
    } else if (m[0] === 'OK') {
      Kern.log(m[2] ? 'in' : 'err', `OK ← ${short}`, `${m[1].slice(0, 16)}… ${m[2] ? 'geaccepteerd' : 'GEWEIGERD: ' + m[3]}`);
      okResults[url] = m[2];
      renderPostStatus();
    } else if (m[0] === 'NOTICE' || m[0] === 'CLOSED') {
      Kern.log('err', `${m[0]} ← ${short}`, String(m.slice(1).join(' ')));
    }
  }
  function renderRelays() {
    $('#relays').innerHTML = relayList().map((u) => {
      const st = conns[u]?.state || 'niet verbonden';
      return `<div class="user-row"><span class="conn-dot conn-dot--${st === 'verbonden' ? 'on' : st.startsWith('verb') ? 'wait' : 'off'}"></span>
        <div class="user-row__info"><div class="user-row__name">${esc(u)}</div><div class="user-row__url">${esc(st)}</div></div>
        <button class="kern-btn kern-btn--ghost kern-btn--small" data-rm="${esc(u)}">×</button></div>`;
    }).join('');
    const on = relayList().filter((u) => conns[u]?.state === 'verbonden').length;
    Kern.status(on ? 'on' : 'off', `${on}/${relayList().length} relays`);
  }

  // ---------- feed ----------
  const currentFilter = () => {
    const f = $('#n-filter').value.trim().replace(/^#/, '').toLowerCase();
    return f ? { kinds: [1], '#t': [f], limit: 40 } : { kinds: [1], limit: 40 };
  };
  function subscribe() {
    if (subId) broadcast(['CLOSE', subId]);
    subId = 'lpw' + Math.random().toString(36).slice(2, 8);
    seen.forEach((r, id) => { if (r.ev.kind === 1) seen.delete(id); });
    eose = false;
    $('#feed-status').textContent = 'Opgeslagen events ophalen…';
    broadcast(['REQ', subId, currentFilter()]);
    broadcast(['REQ', subId + 'p', { kinds: [0], limit: 200 }]);
    renderFeed();
  }
  let renderTimer = null;
  const scheduleRender = () => { clearTimeout(renderTimer); renderTimer = setTimeout(renderFeed, 80); };
  function renderFeed() {
    const all = [...seen.values()].filter((r) => r.ev.kind === 1);
    if (eose) $('#feed-status').textContent = `Live — ${all.length} notitie${all.length === 1 ? '' : 's'} · nieuwe events verschijnen vanzelf`;
    const notes = all.sort((a, b) => b.ev.created_at - a.ev.created_at).slice(0, 60);
    $('#feed').innerHTML = notes.map(({ ev, relays, valid }) => {
      const name = profiles[ev.pubkey]?.name || N.nip19.npubEncode(ev.pubkey).slice(0, 14) + '…';
      const body = esc(ev.content).replace(/#(\w+)/g, '<span class="mention">#$1</span>');
      return `<div class="twt${ev.pubkey === pk ? ' twt--own' : ''}"><div class="twt__meta"><span class="twt__nick">${esc(name)}</span>
        <span class="twt__time">· ${Kern.relTime(ev.created_at * 1000)}</span>
        <span class="twt__qos" title="${esc([...relays].join(', '))}">${valid ? '✓ handtekening' : '✗ ONGELDIG'} · ${relays.size ? `${relays.size} relay${relays.size > 1 ? 's' : ''}` : 'verstuurd'}</span></div>
        <div class="twt__body">${body}</div></div>`;
    }).join('') || '<div class="kern-card kern-muted">Nog geen notities voor dit filter.</div>';
  }

  // ---------- publiceren ----------
  let okResults = {};
  function renderPostStatus() {
    const vals = Object.entries(okResults);
    $('#post-status').innerHTML = vals.map(([u, ok]) => `<span class="kern-badge ${ok === true ? 'kern-badge--ok' : ok === false ? 'kern-badge--err' : ''}">${esc(u.replace(/^wss?:\/\//, ''))} ${ok === true ? '✓' : ok === false ? '✗' : '…'}</span>`).join(' ');
  }
  async function publish(tmpl) {
    const ev = await sign({ created_at: Math.floor(Date.now() / 1000), ...tmpl });
    okResults = {};
    const sent = broadcast(['EVENT', ev]);
    sent.forEach((u) => { okResults[u] = null; });
    renderPostStatus();
    if (!sent.length) Kern.toast('Geen relay verbonden', 'Voeg een relay toe of wacht op verbinding.', 'err');
    return ev;
  }
  $('#btn-post').onclick = (e) => Kern.busy(e.target, async () => {
    const text = $('#n-text').value.trim();
    if (!text) return;
    const tags = [...new Set((text.match(/#(\w+)/g) || []).map((t) => t.slice(1).toLowerCase()))].map((t) => ['t', t]);
    const ev = await publish({ kind: 1, tags, content: text });
    if (!seen.has(ev.id)) seen.set(ev.id, { ev, relays: new Set(), valid: N.verifyEvent(ev) });
    renderFeed();
  });
  $('#btn-profile').onclick = (e) => Kern.busy(e.target, async () => {
    const meta = { name: $('#p-name').value.trim(), about: $('#p-about').value.trim() };
    Kern.set('profile', meta);
    profiles[pk] = meta;
    await publish({ kind: 0, tags: [], content: JSON.stringify(meta) });
    Kern.toast('Profiel gepubliceerd', meta.name, 'ok');
  });
  $('#btn-sub').onclick = subscribe;
  $('#n-filter').addEventListener('keydown', (e) => { if (e.key === 'Enter') subscribe(); });
  $('#btn-import').onclick = () => {
    try {
      const d = N.nip19.decode($('#k-import').value.trim());
      if (d.type !== 'nsec') throw new Error('geen nsec');
      Kern.set('sk', toHex(d.data)); $('#k-import').value = ''; loadKeys(); Kern.toast('Sleutel geïmporteerd', '', 'ok');
    } catch (err) { Kern.toast('Ongeldige nsec', err.message, 'err'); }
  };
  $('#btn-newkey').onclick = () => { Kern.set('sk', null); loadKeys(); };
  $('#btn-relay-add').onclick = () => {
    const u = $('#r-add').value.trim();
    if (!/^wss?:\/\/[^\s]+$/.test(u)) return Kern.toast('Ongeldige relay', 'Gebruik wss://…', 'err');
    Kern.set('relays', [...new Set([...relayList(), u])]);
    $('#r-add').value = '';
    connect(u);
  };
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (!rm) return;
    const u = rm.dataset.rm;
    conns[u]?.ws?.close();
    delete conns[u];
    Kern.set('relays', relayList().filter((x) => x !== u));
    renderRelays();
  });

  Kern.onStart((user) => {
    loadKeys();
    const prof = Kern.get('profile', { name: user, about: 'Ontdekt Nostr via de LPW-demo' });
    $('#p-name').value = prof.name;
    $('#p-about').value = prof.about;
    profiles[pk] = prof;
    if (Kern.param('relay')) Kern.set('relays', [Kern.param('relay')]);
    relayList().forEach(connect);
    setTimeout(subscribe, 900);
  });
})();
