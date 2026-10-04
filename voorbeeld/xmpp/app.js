// XMPP-over-WebSocket-client (RFC 6120/6121 + RFC 7395) — volledig in de browser.
// Let op: bij WebSocket-framing is elk frame een los XML-document, dus elke stanza
// moet xmlns="jabber:client" expliciet dragen (er is geen omhullende stream).
// SASL SCRAM-SHA-256/-1 via WebCrypto (incl. controle van de serverhandtekening), PLAIN als
// terugval, in-band registratie (XEP-0077), resource binding, roster, presence en chat.
(() => {
  const { $, esc } = Kern;
  const NS = { framing: 'urn:ietf:params:xml:ns:xmpp-framing', sasl: 'urn:ietf:params:xml:ns:xmpp-sasl',
    bind: 'urn:ietf:params:xml:ns:xmpp-bind', client: 'jabber:client', roster: 'jabber:iq:roster', register: 'jabber:iq:register' };
  const enc = new TextEncoder();
  const b64 = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const xmlEsc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

  let ws = null, jid = '', waiters = [], iqId = 0, roster = {}, threads = {};

  // ---------- transport ----------
  function send(xml) {
    ws.send(xml);
    Kern.log('out', 'XML', xml.replace(/<auth([^>]*)>[^<]*</, '<auth$1>••••<').replace(/<password>[^<]*</, '<password>••••<'));
  }
  function waitFor(pred, ms = 10000) {
    return new Promise((resolve, reject) => {
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => { waiters = waiters.filter((x) => x !== w); reject(new Error('Time-out: geen antwoord van de server')); }, ms);
    });
  }
  function onStanza(el) {
    Kern.log('in', el.localName.toUpperCase(), new XMLSerializer().serializeToString(el).slice(0, 1200));
    for (const w of [...waiters]) if (w.pred(el)) { waiters = waiters.filter((x) => x !== w); w.resolve(el); return; }
    handle(el);
  }
  function connect(url) {
    return new Promise((resolve, reject) => {
      ws = new WebSocket(url, 'xmpp');
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('WebSocket-verbinding mislukt'));
      ws.onclose = () => { if (jid) { Kern.toast('Verbinding gesloten', '', 'err'); offline(); } };
      ws.onmessage = (ev) => {
        const doc = new DOMParser().parseFromString(ev.data, 'application/xml');
        if (doc.querySelector('parsererror')) return;
        onStanza(doc.documentElement);
      };
    });
  }
  const openStream = (domain) => {
    send(`<open xmlns="${NS.framing}" to="${xmlEsc(domain)}" version="1.0"/>`);
    return waitFor((el) => el.localName === 'features');
  };
  const iq = (type, inner, to = '') => {
    const id = `lpw${++iqId}`;
    send(`<iq xmlns="${NS.client}" type="${type}" id="${id}"${to ? ` to="${xmlEsc(to)}"` : ''}>${inner}</iq>`);
    return waitFor((el) => el.localName === 'iq' && el.getAttribute('id') === id);
  };

  // ---------- SASL ----------
  async function hmac(hash, key, data) {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, typeof data === 'string' ? enc.encode(data) : data));
  }
  async function scram(mech, user, pass) {
    const hash = mech === 'SCRAM-SHA-256' ? 'SHA-256' : 'SHA-1';
    const bits = hash === 'SHA-256' ? 256 : 160;
    const cnonce = b64(crypto.getRandomValues(new Uint8Array(18)));
    const first = `n=${user.replace(/=/g, '=3D').replace(/,/g, '=2C')},r=${cnonce}`;
    send(`<auth xmlns="${NS.sasl}" mechanism="${mech}">${btoa('n,,' + first)}</auth>`);
    const ch = await waitFor((el) => ['challenge', 'failure'].includes(el.localName));
    if (ch.localName === 'failure') throw new Error('SASL geweigerd');
    const serverFirst = atob(ch.textContent);
    const p = Object.fromEntries(serverFirst.split(',').map((kv) => [kv[0], kv.slice(2)]));
    if (!p.r.startsWith(cnonce)) throw new Error('SCRAM: server-nonce klopt niet');
    const km = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    const salted = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(p.s), iterations: +p.i, hash }, km, bits));
    const clientKey = await hmac(hash, salted, 'Client Key');
    const storedKey = new Uint8Array(await crypto.subtle.digest(hash, clientKey));
    const finalNoProof = `c=biws,r=${p.r}`;
    const authMsg = `${first},${serverFirst},${finalNoProof}`;
    const sig = await hmac(hash, storedKey, authMsg);
    const proof = clientKey.map((b, i) => b ^ sig[i]);
    const serverSig = b64(await hmac(hash, await hmac(hash, salted, 'Server Key'), authMsg));
    send(`<response xmlns="${NS.sasl}">${btoa(`${finalNoProof},p=${b64(proof)}`)}</response>`);
    const res = await waitFor((el) => ['success', 'failure'].includes(el.localName));
    if (res.localName === 'failure') throw new Error('Onjuist wachtwoord of onbekende gebruiker');
    const v = atob(res.textContent || '').match(/v=([^,]+)/);
    if (!v || v[1] !== serverSig) throw new Error('SCRAM: serverhandtekening ongeldig — mogelijk onderschept!');
    Kern.log('in', 'SCRAM', `${mech}: serverhandtekening geverifieerd ✓ (${p.i} PBKDF2-iteraties)`);
    return mech;
  }
  async function auth(features, user, pass) {
    const mechs = [...features.getElementsByTagNameNS(NS.sasl, 'mechanism')].map((m) => m.textContent);
    for (const m of ['SCRAM-SHA-256', 'SCRAM-SHA-1']) if (mechs.includes(m)) return scram(m, user, pass);
    if (mechs.includes('PLAIN')) {
      send(`<auth xmlns="${NS.sasl}" mechanism="PLAIN">${btoa(`\0${user}\0${pass}`)}</auth>`);
      const r = await waitFor((el) => ['success', 'failure'].includes(el.localName));
      if (r.localName === 'failure') throw new Error('Onjuist wachtwoord of onbekende gebruiker');
      return 'PLAIN';
    }
    throw new Error(`Geen ondersteund SASL-mechanisme (${mechs.join(', ')})`);
  }

  // ---------- sessie ----------
  const cfg = () => ({ ws: $('#x-ws').value.trim(), user: $('#x-user').value.trim(), domain: $('#x-domain').value.trim(), pass: $('#x-pass').value });

  async function login() {
    const c = cfg();
    Kern.set('account', { ws: c.ws, user: c.user, domain: c.domain, pass: c.pass });
    Kern.status('wait', 'verbinden…');
    await connect(c.ws);
    const f1 = await openStream(c.domain);
    const mech = await auth(f1, c.user, c.pass);
    const f2 = await openStream(c.domain);
    if (!f2.getElementsByTagNameNS(NS.bind, 'bind').length) throw new Error('Server biedt geen resource binding');
    const b = await iq('set', `<bind xmlns="${NS.bind}"><resource>lpw-demo</resource></bind>`);
    jid = b.getElementsByTagName('jid')[0]?.textContent || `${c.user}@${c.domain}`;
    const r = await iq('get', `<query xmlns="${NS.roster}"/>`);
    roster = {};
    [...r.getElementsByTagName('item')].forEach((it) => { roster[it.getAttribute('jid')] = { name: it.getAttribute('name') || '', sub: it.getAttribute('subscription'), show: 'offline' }; });
    send(`<presence xmlns="${NS.client}"><status>Online via de LPW-demo</status></presence>`);
    Kern.status('on', 'online');
    $('#session').innerHTML = `<div class="kern-card"><span class="kern-badge kern-badge--ok">verbonden</span> <strong>${esc(jid)}</strong><br>
      <span class="kern-muted">SASL ${esc(mech)} · ${esc(c.ws)}</span></div>`;
    $('#btn-x-login').hidden = true;
    $('#btn-x-logout').hidden = false;
    renderRoster();
    renderChat();
    Kern.toast('Ingelogd', jid, 'ok');
  }

  async function register() {
    const c = cfg();
    await connect(c.ws);
    const f = await openStream(c.domain);
    if (![...f.children].some((e) => e.localName === 'register')) Kern.log('in', 'INFO', 'server adverteert geen register-feature; we proberen het toch');
    const r = await iq('set', `<query xmlns="${NS.register}"><username>${xmlEsc(c.user)}</username><password>${xmlEsc(c.pass)}</password></query>`);
    ws.close();
    ws = null;
    if (r.getAttribute('type') === 'result') { Kern.toast('Account aangemaakt', `${c.user}@${c.domain}`, 'ok'); return login(); }
    const err = r.getElementsByTagName('error')[0];
    const cond = err?.firstElementChild?.localName || 'onbekend';
    throw new Error(cond === 'conflict' ? 'Die gebruikersnaam bestaat al op deze server' : cond === 'not-allowed' ? 'Registratie is uitgeschakeld op deze server' : `Registratie mislukt: ${cond}`);
  }

  function offline() {
    jid = '';
    $('#btn-x-login').hidden = false;
    $('#btn-x-logout').hidden = true;
    $('#session').innerHTML = '';
    Kern.status('off', 'offline');
    renderChat();
  }

  // ---------- inkomende stanza's ----------
  function handle(el) {
    const from = (el.getAttribute('from') || '').split('/')[0];
    if (el.localName === 'message') {
      const body = el.getElementsByTagName('body')[0]?.textContent;
      if (!body) return;
      (threads[from] = threads[from] || []).push({ from, body, ts: Date.now() });
      if (!roster[from]) roster[from] = { name: '', sub: 'none', show: 'online' };
      Kern.toast(`Bericht van ${from}`, body.slice(0, 80), 'ok');
      if (!$('#chat-with').value) $('#chat-with').value = from;
      renderRoster();
      renderChat();
    } else if (el.localName === 'presence') {
      const type = el.getAttribute('type');
      if (type === 'subscribe') {
        send(`<presence xmlns="${NS.client}" to="${xmlEsc(from)}" type="subscribed"/>`);
        send(`<presence xmlns="${NS.client}" to="${xmlEsc(from)}" type="subscribe"/>`);
        Kern.toast('Contactverzoek geaccepteerd', from, 'ok');
        return;
      }
      if (from === jid.split('/')[0]) return;
      roster[from] = roster[from] || { name: '', sub: 'none' };
      roster[from].show = type === 'unavailable' ? 'offline' : (el.getElementsByTagName('show')[0]?.textContent || 'online');
      roster[from].status = el.getElementsByTagName('status')[0]?.textContent || '';
      renderRoster();
      renderChat();
    } else if (el.localName === 'iq' && el.getAttribute('type') === 'set') {
      [...el.getElementsByTagName('item')].forEach((it) => {
        const j = it.getAttribute('jid');
        if (it.getAttribute('subscription') === 'remove') delete roster[j];
        else roster[j] = { ...(roster[j] || { show: 'offline' }), sub: it.getAttribute('subscription'), name: it.getAttribute('name') || '' };
      });
      send(`<iq xmlns="${NS.client}" type="result" id="${xmlEsc(el.getAttribute('id'))}"/>`);
      renderRoster();
    }
  }

  // ---------- UI ----------
  const dot = (show) => `<span class="conn-dot conn-dot--${show === 'offline' ? 'off' : show === 'online' || show === 'chat' ? 'on' : 'wait'}" style="display:inline-block;vertical-align:middle"></span>`;
  function renderRoster() {
    const items = Object.entries(roster);
    $('#roster').innerHTML = items.length ? items.map(([j, r]) => `<div class="user-row">${dot(r.show)}<div class="user-row__info">
        <div class="user-row__name">${esc(r.name || j)}</div><div class="user-row__url">${esc(j)} · ${esc(r.show)}${r.status ? ' · ' + esc(r.status) : ''} · abonnement: ${esc(r.sub)}</div></div>
        <button class="kern-btn kern-btn--ghost kern-btn--small" data-chat="${esc(j)}">Chat</button></div>`).join('')
      : `<div class="kern-card kern-muted">${jid ? 'Nog geen contacten — voeg er hierboven een toe.' : 'Log eerst in.'}</div>`;
    const sel = $('#chat-with'), cur = sel.value;
    sel.innerHTML = items.map(([j]) => `<option value="${esc(j)}">${esc(j)}</option>`).join('') || '<option value="">(geen contacten)</option>';
    if (cur && roster[cur]) sel.value = cur;
  }
  function renderChat() {
    const w = $('#chat-with').value;
    $('#chat-head').innerHTML = jid ? `${dot('online')} <strong>${esc(jid.split('/')[0])}</strong> <span class="kern-muted">in gesprek met</span> ${w ? `${dot(roster[w]?.show || 'offline')} <strong>${esc(w)}</strong>` : '—'}`
      : '<span class="kern-muted">Niet verbonden — zie het tabblad Account.</span>';
    const t = threads[w] || [];
    $('#thread').innerHTML = t.map((m) => `<div class="twt${m.from === 'ik' ? ' twt--own' : ''}"><div class="twt__meta"><span class="twt__nick">${esc(m.from === 'ik' ? jid.split('@')[0] : m.from.split('@')[0])}</span><span class="twt__time">· ${Kern.relTime(m.ts)}</span></div><div class="twt__body">${esc(m.body)}</div></div>`).join('')
      || (w ? '<div class="kern-card kern-muted">Nog geen berichten in dit gesprek.</div>' : '');
  }
  $('#chat-with').onchange = renderChat;
  $('#btn-chat-send').onclick = () => {
    const to = $('#chat-with').value, body = $('#chat-text').value.trim();
    if (!jid) return Kern.toast('Niet verbonden', 'Log eerst in bij Account.', 'err');
    if (!to || !body) return;
    send(`<message xmlns="${NS.client}" to="${xmlEsc(to)}" type="chat" id="m${Date.now()}"><body>${xmlEsc(body)}</body></message>`);
    (threads[to] = threads[to] || []).push({ from: 'ik', body, ts: Date.now() });
    $('#chat-text').value = '';
    renderChat();
  };
  $('#chat-text').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-chat-send').click(); });
  $('#btn-add').onclick = (e) => Kern.busy(e.target, async () => {
    const j = $('#add-jid').value.trim();
    if (!jid || !/^[^@\s]+@[^@\s]+$/.test(j)) return Kern.toast('Ongeldig', 'Log in en geef een JID als naam@server', 'err');
    await iq('set', `<query xmlns="${NS.roster}"><item jid="${xmlEsc(j)}"/></query>`);
    send(`<presence xmlns="${NS.client}" to="${xmlEsc(j)}" type="subscribe"/>`);
    $('#add-jid').value = '';
    Kern.toast('Contactverzoek verstuurd', j, 'ok');
  });
  document.addEventListener('click', (e) => { const c = e.target.closest('[data-chat]'); if (c) { $('#chat-with').value = c.dataset.chat; Kern.show('chat'); renderChat(); } });
  const guard = (fn) => (e) => Kern.busy(e.target, async () => {
    try { await fn(); } catch (err) { Kern.toast('XMPP-fout', err.message, 'err'); Kern.log('err', 'FOUT', err.message); try { ws?.close(); } catch (_) {} ws = null; offline(); }
  });
  $('#btn-x-login').onclick = guard(login);
  $('#btn-x-register').onclick = guard(register);
  $('#btn-x-logout').onclick = () => { send(`<close xmlns="${NS.framing}"/>`); const w = ws; jid = ''; setTimeout(() => w?.close(), 300); offline(); };

  Kern.onStart((user) => {
    const a = Kern.get('account');
    $('#x-user').value = a?.user || user;
    $('#x-domain').value = a?.domain || '';
    $('#x-ws').value = a?.ws || '';
    $('#x-pass').value = a?.pass || '';
    renderRoster();
    renderChat();
    if (!a) Kern.show('account');
  });
})();
