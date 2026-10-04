// Phlog (Gopher-log) — schrijven/publiceren via ../api/phlog.php, lezen via ../api/gopher.php
KernBlog({
  api: 'phlog',
  indexFile: 'gophermap',
  postFile: (slug) => `${slug}.txt`,
  // voorbeeld zoals het bestand eruit komt te zien: 70 kolommen
  preview: (title, body) => {
    const wrap = (t) => t.replace(/\s*\n\s*/g, ' ').replace(/(.{1,70})(\s+|$)/g, '$1\n').trim();
    const txt = `${title}\n${'='.repeat(Math.min(70, title.length))}\n${new Date().toISOString().slice(0, 10)}\n\n`
      + body.trim().split(/\n{2,}/).map(wrap).join('\n\n');
    return `<pre class="kern-pre">${Kern.esc(txt)}</pre>`;
  },
  read: {
    suggest: [
      ['gopher://gopher.floodgap.com/1/feeds/latest', 'Floodgap — laatste phlogberichten in Gopherspace'],
      ['gopher://sdf.org/1/phlogs/', 'SDF — overzicht van phlogs'],
      ['gopher://localhost/1/phlog', 'Lokale test-gopherhole (alleen in de ontwikkelomgeving)'],
    ],
    // gophermap ophalen; type-0-items (tekst) zijn berichten, datum uit de naam halen indien aanwezig
    async fetch(url) {
      const m = url.match(/^gopher:\/\/([^/:]+)(?::(\d+))?\/(.)?(.*)$/);
      if (!m) throw new Error('Gebruik gopher://host/1/pad');
      const d = await Kern.api('gopher', { host: m[1], port: +(m[2] || 70), type: '1', selector: decodeURIComponent(m[4] || '') });
      return (d.items || []).filter((i) => i.t === '0' || i.t === '1').map((i) => {
        const date = (i.name.match(/\d{4}-\d\d-\d\d/) || [''])[0];
        return { date, title: i.name.replace(date, '').replace(/^[\s:–—-]+/, '') || i.name,
          url: `gopher://${i.host}${i.port !== 70 ? ':' + i.port : ''}/${i.t}${i.sel}` };
      });
    },
    open: (url) => Kern.demoFor(url) || url,
  },
});
