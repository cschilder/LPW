// Gemlog — schrijven/publiceren via ../api/gemlog.php, lezen via ../api/gemini.php
KernBlog({
  api: 'gemlog',
  indexFile: 'index.gmi',
  postFile: (slug) => `${slug}.gmi`,
  preview: (title, body) => Kern.renderGemtext(`# ${title}\n\n${body}`),
  read: {
    suggest: [
      ['gemini://warmedal.se/~antenna/', 'Antenna — verzamelt nieuwe gemlogberichten'],
      ['gemini://geminiprotocol.net/news/', 'Project Gemini — nieuws'],
      ['gemini://localhost/gemlog/', 'Lokale testcapsule (alleen in de ontwikkelomgeving)'],
    ],
    // index.gmi ophalen en regels "=> url JJJJ-MM-DD titel" verzamelen (Gemini-abonnementsformaat)
    async fetch(url) {
      const d = await Kern.api('gemini', { url });
      if (d.status !== 20) throw new Error(`Gemini-status ${d.status} ${d.meta}`);
      return (d.body || '').split('\n').map((l) => l.match(/^=>\s*(\S+)\s+(\d{4}-\d\d-\d\d)\s*[-–—:]?\s*(.*)$/))
        .filter(Boolean).map((m) => ({ url: Kern.resolveUrl(url, m[1]), date: m[2], title: m[3] || m[1] }));
    },
    open: (url) => Kern.demoFor(url) || url,
  },
});
