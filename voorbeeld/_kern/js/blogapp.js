// Gedeelde blog-app voor gemlog, phlog (glog) en bashblog.
// Schrijven (met live voorbeeld) → publiceren via de PHP-generator (beheerwachtwoord),
// beheren van je eigen blog, en lezen van andermans blogs.
//   KernBlog({ api: 'gemlog', preview: (title, body) => html, read: { … } })
window.KernBlog = function (cfg) {
  const { $, esc } = Kern;
  let state = { posts: [], files: [], baseUrl: '' };

  const preview = () => { $('#b-preview').innerHTML = cfg.preview($('#b-title').value, $('#b-body').value); };
  ['#b-title', '#b-body'].forEach((s) => $(s).addEventListener('input', preview));

  async function call(body, write = false) {
    if (write) {
      const admin = await Kern.needAdmin();
      if (!admin) return null;
      body.admin = admin;
    }
    try { return await Kern.api(cfg.api, body); }
    catch (e) { if (/beheerwachtwoord/i.test(e.message)) Kern.admin.set(''); throw e; }
  }
  function renderMine() {
    $('#m-title').value = state.title || '';
    $('#m-desc').value = state.description || '';
    $('#m-posts').innerHTML = state.posts.map((p) => `<div class="user-row"><div class="user-row__info">
        <div class="user-row__name">${esc(p.title)}</div><div class="user-row__url">${esc(p.date)} · ${p.bytes} bytes${p.tags.length ? ' · ' + p.tags.map(esc).join(', ') : ''}</div></div>
        <a class="kern-btn kern-btn--ghost kern-btn--small" href="${esc(state.baseUrl + cfg.postFile(p.slug))}" target="_blank" rel="noopener">Open</a>
        <button class="kern-btn kern-btn--ghost kern-btn--small" data-del="${esc(p.slug)}">×</button></div>`).join('')
      || '<div class="kern-card kern-muted">Nog geen berichten gepubliceerd.</div>';
    $('#m-files').innerHTML = state.files.map((f) => `<li><a href="${esc(state.baseUrl + f.name)}" target="_blank" rel="noopener"><code>${esc(f.name)}</code></a> <span class="kern-muted">${f.bytes} B</span></li>`).join('')
      || '<li class="kern-muted">—</li>';
    $('#m-url').textContent = state.baseUrl + cfg.indexFile;
    if (cfg.onState) cfg.onState(state);
  }
  async function load() {
    try { state = await call({ action: 'list' }); renderMine(); } catch (_) {}
  }

  $('#btn-publish').onclick = (e) => Kern.busy(e.target, async () => {
    const d = await call({ action: 'publish', title: $('#b-title').value, body: $('#b-body').value, tags: $('#b-tags').value, author: Kern.user }, true);
    if (!d) return;
    state = d;
    renderMine();
    Kern.toast('Gepubliceerd', `${d.posts[0]?.title} → ${cfg.indexFile} bijgewerkt`, 'ok');
    Kern.show('mijn');
  });
  $('#btn-settings').onclick = (e) => Kern.busy(e.target, async () => {
    const d = await call({ action: 'settings', title: $('#m-title').value, description: $('#m-desc').value }, true);
    if (d) { state = d; renderMine(); Kern.toast('Opgeslagen', 'Index opnieuw gegenereerd', 'ok'); }
  });
  document.addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]');
    if (!d) return;
    Kern.busy(d, async () => { const r = await call({ action: 'delete', slug: d.dataset.del }, true); if (r) { state = r; renderMine(); } });
  });
  $('#btn-copy-url').onclick = () => Kern.copy($('#m-url').textContent);

  // ---------- lezen van andermans blog (optioneel) ----------
  if (cfg.read) {
    const r = cfg.read;
    $('#r-list').innerHTML = r.suggest.map(([u, t]) => `<li><a data-read="${esc(u)}">${esc(t)}</a><br><span class="kern-muted">${esc(u)}</span></li>`).join('');
    const go = async (url) => {
      $('#r-url').value = url;
      $('#r-out').innerHTML = '<div class="kern-card kern-muted">Laden…</div>';
      try {
        const items = await r.fetch(url);
        $('#r-out').innerHTML = items.length ? `<div class="kern-card"><h5>${items.length} berichten</h5><ul class="kern-list">${
          items.map((i) => `<li><span class="kern-type">${esc(i.date || '')}</span><a href="${esc(r.open(i.url))}">${esc(i.title)}</a></li>`).join('')}</ul></div>`
          : '<div class="kern-card kern-muted">Geen gedateerde berichten gevonden op deze pagina.</div>';
      } catch (e) { $('#r-out').innerHTML = `<div class="kern-card"><span class="kern-badge kern-badge--err">Fout</span> ${esc(e.message)}</div>`; }
    };
    $('#btn-read').onclick = (e) => Kern.busy(e.target, () => go($('#r-url').value.trim()));
    document.addEventListener('click', (e) => { const a = e.target.closest('[data-read]'); if (a) go(a.dataset.read); });
  }

  Kern.onView('mijn', load);
  Kern.onStart(() => { preview(); load(); });
};
