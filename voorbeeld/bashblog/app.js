// Bashblog — statische blog genereren via ../api/bashblog.php (Markdown → HTML op de server)
(() => {
  // Voorbeeld met dezelfde Markdown-regels als de server (alles eerst ge-escaped)
  function md(src) {
    const esc = Kern.esc;
    const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(((?:https?:|mailto:|\/|\.)[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const out = [];
    let para = [], list = null;
    const flush = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } };
    for (const l of src.split('\n')) {
      let m;
      if ((m = l.match(/^(#{1,6})\s+(.+)$/))) { flush(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); }
      else if ((m = l.match(/^\s*[-*+]\s+(.+)$/))) { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } (list = list || []).push(`<li>${inline(m[1])}</li>`); }
      else if ((m = l.match(/^>\s?(.*)$/))) { flush(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
      else if (!l.trim()) flush();
      else para.push(l.trim());
    }
    flush();
    return out.join('');
  }
  KernBlog({
    api: 'bashblog',
    indexFile: 'index.html',
    postFile: (slug) => `${slug}.html`,
    preview: (title, body) => `<div class="gemtext"><h2>${Kern.esc(title)}</h2>${md(body)}</div>`,
    onState: (s) => {
      const url = s.baseUrl + 'index.html';
      Kern.$('#v-open').href = url;
      const f = Kern.$('#v-frame');
      if (s.posts.length && f.dataset.src !== url + s.posts.length) { f.dataset.src = url + s.posts.length; f.src = url + '?v=' + s.posts.length; }
    },
  });
})();
