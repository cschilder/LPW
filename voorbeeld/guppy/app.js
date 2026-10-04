// Guppy-browser — gebruikt ../api/guppy.php (UDP met volgnummers en acks)
KernBrowser({
  scheme: 'guppy',
  api: 'guppy',
  public: [
    ['guppy://hd.206267.xyz/', 'hd.206267.xyz — capsule van de Guppy-auteur'],
    ['guppy://guppy.000contagion.net/', '000contagion'],
  ],
  async render(d, url, ctx) {
    if (d.status === 1) {
      const q = await Kern.ask(d.meta || 'Invoer gevraagd');
      if (q != null) { const u = new URL(url); u.search = '?' + encodeURIComponent(q); ctx.go(u.href); }
      return null;
    }
    if (d.status === 3) { Kern.toast('Redirect', d.meta); ctx.go(d.meta); return null; }
    if (d.status === 4) return ctx.head(`<span class="kern-badge kern-badge--err">4 fout</span>${Kern.esc(d.meta)} ·`);
    const head = ctx.head(
      `<span class="kern-badge kern-badge--ok">${Kern.esc(d.mime)}</span>` +
      `<span class="kern-badge">${d.packets} UDP-pakketten</span>` +
      `<span class="kern-badge">seq ${d.seq_first}…${d.seq_end}</span>` +
      (d.duplicates ? `<span class="kern-badge kern-badge--warn">${d.duplicates} dubbel</span>` : '') +
      (d.complete ? '' : '<span class="kern-badge kern-badge--err">onvolledig</span>') + ' ·');
    return head + (d.mime.startsWith('text/gemini') ? Kern.renderGemtext(d.body, url) : `<pre class="kern-pre">${Kern.esc(d.body)}</pre>`);
  },
});
