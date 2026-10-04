// Nex-browser — gebruikt ../api/nex.php via de gedeelde KernBrowser
KernBrowser({
  scheme: 'nex',
  api: 'nex',
  public: [
    ['nex://nightfall.city/', 'Nightfall City — thuisbasis van Nex'],
    ['nex://nightfall.city/nex/', 'Nex-specificatie en software'],
  ],
  async render(d, url, ctx) {
    const head = ctx.head(`<span class="kern-badge kern-badge--ok">${d.dir ? 'map' : 'document'}</span>${d.conn.bytes} bytes ·`);
    // In mappen zijn "=> url tekst"-regels links; de rest is platte tekst.
    if (d.dir) return head + Kern.renderGemtext(d.body.replace(/^(?!=>).*$/gm, (l) => l.replace(/^[#*>`]/, ' $&')), url);
    return head + `<pre class="kern-pre">${Kern.esc(d.body)}</pre>`;
  },
});
