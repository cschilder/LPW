// Gedeelde "klein-web-browser" voor spartan, nex en guppy (en herbruikbaar voor meer).
// De app levert alleen het schema, de API-naam en een render-functie; deze module
// regelt adresbalk, geschiedenis, bladwijzers, links tussen protocollen en het
// negeren van verouderde antwoorden.
//
//   KernBrowser({
//     scheme: 'spartan', api: 'spartan', public: [[url, label], …],
//     body: (url) => ({ url }),                  // API-parameters
//     render: async (d, url, ctx) => html,       // ctx.go(url), ctx.head(badges)
//   });
window.KernBrowser = function (cfg) {
  const { $, esc } = Kern;
  let history = [], current = '', reqId = 0;

  async function go(url, { push = true, extra = {} } = {}) {
    url = String(url).trim();
    if (!/^[a-z]+:\/\//i.test(url)) url = `${cfg.scheme}://${url}`;
    if (!url.toLowerCase().startsWith(cfg.scheme + '://')) {
      const demo = Kern.demoFor(url);
      if (demo) { location.href = demo; return; }
      window.open(url, '_blank', 'noopener');
      return;
    }
    if (push && current && current !== url) history.push(current);
    current = url;
    $('#addr').value = url;
    $('#page').innerHTML = '<p class="kern-muted">Laden…</p>';
    const mine = ++reqId;
    let d;
    try { d = await Kern.api(cfg.api, { ...(cfg.body ? cfg.body(url) : { url }), ...extra }); }
    catch (e) {
      if (mine === reqId) $('#page').innerHTML = `<span class="kern-badge kern-badge--err">Fout</span> ${esc(e.message)}`;
      return;
    }
    if (mine !== reqId) return;
    const ctx = {
      go: (u, opts) => go(Kern.resolveUrl(url, u), { push: false, ...opts }),
      head: (badges) => `<p class="kern-muted">${badges} ${d.ms} ms</p>`,
    };
    const html = await cfg.render(d, url, ctx);
    if (html != null && mine === reqId) $('#page').innerHTML = html;
  }

  $('#page').addEventListener('click', async (e) => {
    const a = e.target.closest('a[data-href]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.input && cfg.onInputLink) return cfg.onInputLink(a.dataset.href, go);
    go(a.dataset.href);
  });
  $('#btn-go').onclick = () => go($('#addr').value);
  $('#addr').addEventListener('keydown', (e) => { if (e.key === 'Enter') go($('#addr').value); });
  $('#btn-back').onclick = () => { if (history.length) go(history.pop(), { push: false }); };

  function renderLists() {
    const bm = Kern.get('bookmarks', []);
    $('#bookmarks').innerHTML = bm.length
      ? bm.map((u, i) => `<li><a data-go="${esc(u)}">${esc(u)}</a> <button class="kern-btn kern-btn--ghost kern-btn--small" data-del="${i}">×</button></li>`).join('')
      : '<li class="kern-muted">Nog geen bladwijzers.</li>';
  }
  $('#btn-bookmark').onclick = () => {
    const bm = Kern.get('bookmarks', []);
    if (current && !bm.includes(current)) { bm.unshift(current); Kern.set('bookmarks', bm); }
    renderLists();
    Kern.toast('Bladwijzer opgeslagen', current, 'ok');
  };
  Kern.onView('bladwijzers', renderLists);
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { Kern.show('bladeren'); go(g.dataset.go); }
    const del = e.target.closest('[data-del]');
    if (del) { const bm = Kern.get('bookmarks', []); bm.splice(+del.dataset.del, 1); Kern.set('bookmarks', bm); renderLists(); }
  });
  $('#public').innerHTML = (cfg.public || []).map(([u, t]) =>
    `<li><a data-go="${esc(u)}">${esc(t)}</a><br><span class="kern-muted">${esc(u)}</span></li>`).join('');

  Kern.onStart(() => go(Kern.param('url') || cfg.public[0][0], { push: false }));
  return { go };
};
