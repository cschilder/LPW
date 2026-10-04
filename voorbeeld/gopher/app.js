// Gopher-browser — gebruikt de PHP-brug ../api/gopher.php
(() => {
  const { $, esc } = Kern;
  const PUBLIC = [
    ['gopher://gopher.floodgap.com/1/', 'Floodgap — het bekendste gopherhole'],
    ['gopher://gopher.floodgap.com/7/v2/vs', 'Veronica-2 — zoeken in gopherspace'],
    ['gopher://sdf.org/1/', 'SDF Public Access UNIX'],
    ['gopher://gopher.quux.org/1/', 'Quux — Gopher-archief'],
    ['gopher://bitreich.org/1/', 'Bitreich'],
  ];
  const TYPE = { 0: 'TXT', 1: 'DIR', 7: 'ZOEK', h: 'WEB', g: 'GIF', I: 'IMG', p: 'PNG', 9: 'BIN', 3: 'FOUT', 8: 'TEL' };
  let history = [];
  let current = '';
  let reqId = 0;   // alleen het laatste verzoek mag de pagina vullen

  // gopher://host[:port]/<type><selector>[%09query]
  function parse(url) {
    const m = String(url).trim().match(/^(?:gopher:\/\/)?([^/:]+)(?::(\d+))?(?:\/(.)?(.*))?$/i);
    if (!m) throw new Error('Ongeldige gopher-URL');
    let sel = decodeURIComponent(m[4] || '');
    let query = '';
    const tab = sel.indexOf('\t');
    if (tab >= 0) { query = sel.slice(tab + 1); sel = sel.slice(0, tab); }
    return { host: m[1], port: +(m[2] || 70), type: m[3] || '1', selector: sel, query };
  }
  const build = (host, port, type, sel, query = '') =>
    `gopher://${host}${port !== 70 ? ':' + port : ''}/${type}${encodeURI(sel)}${query ? '%09' + encodeURIComponent(query) : ''}`;

  async function go(url, push = true) {
    let p;
    try { p = parse(url); } catch (e) { return Kern.toast('Ongeldige URL', e.message, 'err'); }
    if (p.type === '7' && !p.query) {
      const q = await Kern.ask('Zoekterm voor deze zoekdienst:');
      if (!q) return;
      p.query = q;
      url = build(p.host, p.port, '7', p.selector, q);
    }
    if (push && current) history.push(current);
    current = url;
    $('#addr').value = url;
    $('#page').innerHTML = '<p class="kern-muted">Laden…</p>';
    const mine = ++reqId;
    let d;
    try { d = await Kern.api('gopher', p); }
    catch (e) { if (mine === reqId) $('#page').innerHTML = `<span class="kern-badge kern-badge--err">Fout</span> ${esc(e.message)}`; return; }
    if (mine === reqId) render(d, p);
  }

  function render(d, p) {
    const head = `<p class="kern-muted"><span class="kern-badge">type ${esc(p.type)}</span>${d.meta.bytes} bytes in ${d.ms} ms${d.meta.truncated ? ' · afgekapt' : ''}</p>`;
    if (d.items) {
      const rows = d.items.map((it) => {
        if (it.t === 'i') return `<li><span class="kern-type"></span>${esc(it.name) || '&nbsp;'}</li>`;
        if (it.t === '3') return `<li><span class="kern-type">FOUT</span><span class="kern-badge kern-badge--err">${esc(it.name)}</span></li>`;
        let href, ext = false;
        if (it.t === 'h' && it.sel.startsWith('URL:')) { href = it.sel.slice(4); ext = true; }
        else href = build(it.host, it.port, it.t, it.sel);
        return `<li><span class="kern-type">${TYPE[it.t] || esc(it.t)}</span><a data-href="${esc(href)}" data-ext="${ext ? 1 : ''}">${esc(it.name)}</a></li>`;
      }).join('');
      $('#page').innerHTML = head + `<ul class="kern-list" style="font-family:'Ubuntu Mono',monospace">${rows}</ul>`;
    } else if (d.image) {
      $('#page').innerHTML = head + `<img src="${d.image}" alt="" style="max-width:100%">`;
    } else {
      $('#page').innerHTML = head + `<pre class="kern-pre">${esc(d.text)}</pre>`;
    }
  }

  $('#page').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-href]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.ext) return window.open(a.dataset.href, '_blank', 'noopener');
    go(a.dataset.href);
  });
  $('#btn-go').onclick = () => go($('#addr').value);
  $('#addr').addEventListener('keydown', (e) => { if (e.key === 'Enter') go($('#addr').value); });
  $('#btn-back').onclick = () => { if (history.length) go(history.pop(), false); };

  function renderBookmarks() {
    const bm = Kern.get('bookmarks', []);
    $('#bookmarks').innerHTML = bm.length
      ? bm.map((u, i) => `<li><a data-go="${esc(u)}">${esc(u)}</a> <button class="kern-btn kern-btn--ghost kern-btn--small" data-del="${i}">×</button></li>`).join('')
      : '<li class="kern-muted">Nog geen bladwijzers.</li>';
  }
  $('#btn-bookmark').onclick = () => {
    const bm = Kern.get('bookmarks', []);
    if (current && !bm.includes(current)) { bm.unshift(current); Kern.set('bookmarks', bm); }
    renderBookmarks();
    Kern.toast('Bladwijzer opgeslagen', current, 'ok');
  };
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { Kern.show('bladeren'); go(g.dataset.go); }
    const del = e.target.closest('[data-del]');
    if (del) { const bm = Kern.get('bookmarks', []); bm.splice(+del.dataset.del, 1); Kern.set('bookmarks', bm); renderBookmarks(); }
  });
  $('#public').innerHTML = PUBLIC.map(([u, t]) => `<li><a data-go="${esc(u)}">${esc(t)}</a><br><span class="kern-muted">${esc(u)}</span></li>`).join('');

  Kern.onStart(() => {
    renderBookmarks();
    go(Kern.param('url') || Kern.get('home', PUBLIC[0][0]), false);
  });
})();
