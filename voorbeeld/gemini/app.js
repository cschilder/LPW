// Gemini-browser met TOFU — gebruikt de PHP-brug ../api/gemini.php
(() => {
  const { $, esc } = Kern;
  const PUBLIC = [
    ['gemini://geminiprotocol.net/', 'Project Gemini — officiële capsule'],
    ['gemini://kennedy.gemi.dev/', 'Kennedy — zoekmachine voor Geminispace'],
    ['gemini://tlgs.one/', 'TLGS — nog een zoekmachine'],
    ['gemini://warmedal.se/~antenna/', 'Antenna — gemlog-aggregator'],
    ['gemini://station.martinrue.com/', 'Station — Gemini-sociaal netwerk'],
  ];
  const STATUS = {
    10: 'invoer', 11: 'geheime invoer', 20: 'succes', 30: 'tijdelijke redirect', 31: 'permanente redirect',
    40: 'tijdelijke fout', 41: 'server niet beschikbaar', 42: 'CGI-fout', 43: 'proxyfout', 44: 'rustig aan',
    50: 'permanente fout', 51: 'niet gevonden', 52: 'verdwenen', 53: 'proxy geweigerd', 59: 'ongeldig verzoek',
    60: 'certificaat vereist', 61: 'niet geautoriseerd', 62: 'certificaat ongeldig',
  };
  let history = [], current = '', reqId = 0;

  function tofu(host, cert) {
    if (!cert) return '';
    const store = Kern.get('tofu', {});
    const known = store[host];
    let badge;
    if (!known) {
      store[host] = { sha256: cert.sha256, first: Date.now(), cn: cert.subject };
      Kern.set('tofu', store);
      badge = '<span class="kern-badge kern-badge--warn">nieuw · onthouden</span>';
    } else if (known.sha256 === cert.sha256) {
      badge = '<span class="kern-badge kern-badge--ok">✓ vertrouwd</span>';
    } else {
      badge = '<span class="kern-badge kern-badge--err">⚠ certificaat GEWIJZIGD</span>';
      Kern.toast('Certificaat gewijzigd!', `${host} toont een ander certificaat dan eerder. Mogelijk onderschept.`, 'err', 9000);
    }
    return `${badge} 🔒 ${esc(cert.subject || host)} · sha256 ${esc(cert.sha256.slice(0, 16))}… · geldig t/m ${esc(cert.valid_to)}${cert.self_signed ? ' · zelfondertekend' : ''}`;
  }

  async function go(url, push = true, hops = 0) {
    url = url.trim();
    if (!/^[a-z]+:\/\//i.test(url)) url = 'gemini://' + url;
    if (!url.startsWith('gemini://')) {
      const demo = Kern.demoFor(url);
      if (demo) { location.href = demo; return; }
      return window.open(url, '_blank', 'noopener');
    }
    if (push && current && current !== url) history.push(current);
    current = url;
    $('#addr').value = url;
    $('#page').innerHTML = '<p class="kern-muted">Laden…</p>';
    const mine = ++reqId;
    let d;
    try { d = await Kern.api('gemini', { url }); }
    catch (e) { if (mine === reqId) $('#page').innerHTML = `<span class="kern-badge kern-badge--err">Fout</span> ${esc(e.message)}`; return; }
    if (mine !== reqId) return;
    const host = new URL(url).host;
    $('#certbar').innerHTML = tofu(host, d.conn.cert);
    const s = d.status, cls = Math.floor(s / 10);
    const head = `<p class="kern-muted"><span class="kern-badge ${cls === 2 ? 'kern-badge--ok' : cls >= 4 ? 'kern-badge--err' : ''}">${s} ${esc(STATUS[s] || '')}</span>${esc(d.meta)} · ${d.ms} ms · ${esc(d.conn.tls || '')}</p>`;

    if (cls === 1) {
      const q = await Kern.ask(d.meta || 'Invoer gevraagd', { secret: s === 11 });
      if (q == null) { $('#page').innerHTML = head; return; }
      const u = new URL(url); u.search = '?' + encodeURIComponent(q);
      return go(u.href.replace(/^gemini:/, 'gemini:'), false, hops);
    }
    if (cls === 3) {
      if (hops >= 5) { $('#page').innerHTML = head + '<p>Te veel redirects.</p>'; return; }
      Kern.toast('Redirect', `${s} → ${d.meta}`, 'info');
      return go(Kern.resolveUrl(url, d.meta), false, hops + 1);
    }
    if (cls !== 2) { $('#page').innerHTML = head; return; }
    if (d.image) { $('#page').innerHTML = head + `<img src="${d.image}" alt="" style="max-width:100%">`; return; }
    if (d.binary) { $('#page').innerHTML = head + '<p>Binaire inhoud — niet getoond.</p>'; return; }
    $('#page').innerHTML = head + (d.mime === 'text/gemini' ? Kern.renderGemtext(d.body, url) : `<pre class="kern-pre">${esc(d.body)}</pre>`);
  }

  $('#page').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-href]');
    if (a) { e.preventDefault(); go(a.dataset.href); }
  });
  $('#btn-go').onclick = () => go($('#addr').value);
  $('#addr').addEventListener('keydown', (e) => { if (e.key === 'Enter') go($('#addr').value); });
  $('#btn-back').onclick = () => { if (history.length) go(history.pop(), false); };

  function renderLists() {
    const bm = Kern.get('bookmarks', []);
    $('#bookmarks').innerHTML = bm.length
      ? bm.map((u, i) => `<li><a data-go="${esc(u)}">${esc(u)}</a> <button class="kern-btn kern-btn--ghost kern-btn--small" data-del="${i}">×</button></li>`).join('')
      : '<li class="kern-muted">Nog geen bladwijzers.</li>';
    const t = Kern.get('tofu', {});
    $('#tofu').innerHTML = Object.entries(t).map(([h, c]) =>
      `<tr><th>${esc(h)}</th><td><code>${esc(c.sha256.slice(0, 23))}…</code><br><span class="kern-muted">sinds ${new Date(c.first).toLocaleDateString('nl-NL')}</span></td></tr>`).join('')
      || '<tr><td class="kern-muted">Nog geen hosts bezocht.</td></tr>';
  }
  $('#btn-bookmark').onclick = () => {
    const bm = Kern.get('bookmarks', []);
    if (current && !bm.includes(current)) { bm.unshift(current); Kern.set('bookmarks', bm); }
    renderLists();
    Kern.toast('Bladwijzer opgeslagen', current, 'ok');
  };
  $('#btn-tofu-reset').onclick = () => { Kern.set('tofu', {}); renderLists(); };
  Kern.onView('bladwijzers', renderLists);
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { Kern.show('bladeren'); go(g.dataset.go); }
    const del = e.target.closest('[data-del]');
    if (del) { const bm = Kern.get('bookmarks', []); bm.splice(+del.dataset.del, 1); Kern.set('bookmarks', bm); renderLists(); }
  });
  $('#public').innerHTML = PUBLIC.map(([u, t]) => `<li><a data-go="${esc(u)}">${esc(t)}</a><br><span class="kern-muted">${esc(u)}</span></li>`).join('');

  Kern.onStart(() => go(Kern.param('url') || PUBLIC[0][0], false));
})();
