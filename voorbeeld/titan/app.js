// Titan-uploader — gebruikt ../api/titan.php
(() => {
  const { $, esc } = Kern;
  const update = () => {
    $('#preview').innerHTML = Kern.renderGemtext($('#t-body').value);
    $('#t-size').textContent = `${new TextEncoder().encode($('#t-body').value).length} bytes`;
  };
  $('#t-body').addEventListener('input', update);

  $('#btn-upload').onclick = (e) => Kern.busy(e.target, async () => {
    const url = $('#t-url').value.trim();
    Kern.set('last', { url, token: $('#t-token').value });
    const d = await Kern.api('titan', { url, body: $('#t-body').value, mime: $('#t-mime').value, token: $('#t-token').value });
    const ok = d.status >= 20 && d.status < 40;
    const target = d.status >= 30 && d.status < 40 ? Kern.resolveUrl(url.replace(/^titan:/, 'gemini:').split(';')[0], d.meta) : null;
    $('#result').innerHTML = `<div class="kern-card">
      <span class="kern-badge ${ok ? 'kern-badge--ok' : 'kern-badge--err'}">${d.status}</span> ${esc(d.meta)}
      <p class="kern-muted">${d.bytes} bytes geüpload in ${d.ms} ms · ${esc(d.conn.tls || '')}</p>
      ${target ? `<div class="kern-btns"><a class="kern-btn" href="../gemini/?url=${encodeURIComponent(target)}">Open ${esc(target)} in de Gemini-demo →</a></div>` : ''}
    </div>`;
    if (ok) Kern.toast('Geüpload', target || url, 'ok');
  });

  Kern.onStart(() => {
    const last = Kern.get('last');
    if (Kern.param('url')) $('#t-url').value = Kern.param('url');
    else if (last) { $('#t-url').value = last.url; $('#t-token').value = last.token || ''; }
    update();
  });
})();
