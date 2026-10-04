// Spartan-browser — gebruikt ../api/spartan.php via de gedeelde KernBrowser
KernBrowser({
  scheme: 'spartan',
  api: 'spartan',
  public: [
    ['spartan://mozz.us/', 'mozz.us — thuisbasis van het Spartan-protocol'],
    ['spartan://spartan.mozz.us/', 'Spartan-specificatie'],
    ['spartan://jdcard.com/', 'jdcard.com'],
  ],
  // Invoerlink (=:) → tekst vragen en als data uploaden
  async onInputLink(href, go) {
    const tekst = await Kern.ask('Tekst om te uploaden:');
    if (tekst) go(href, { extra: { data: tekst } });
  },
  async render(d, url, ctx) {
    const names = { 2: 'succes', 3: 'redirect', 4: 'clientfout', 5: 'serverfout' };
    const head = ctx.head(`<span class="kern-badge ${d.status === 2 ? 'kern-badge--ok' : d.status >= 4 ? 'kern-badge--err' : ''}">${d.status} ${names[d.status]}</span>${Kern.esc(d.meta)} ·`);
    if (d.status === 3) { Kern.toast('Redirect', d.meta); ctx.go(d.meta); return null; }
    if (d.status !== 2) return head;
    return head + (d.mime === 'text/gemini' ? Kern.renderGemtext(d.body, url) : `<pre class="kern-pre">${Kern.esc(d.body)}</pre>`);
  },
});
