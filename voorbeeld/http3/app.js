// HTTP/3 & QUIC — gebruikt ../api/http3.php
(() => {
  const { $, esc } = Kern;
  const PRESETS = [['https://cloudflare-quic.com/', 'Cloudflare QUIC-testsite'], ['https://www.google.com/', 'Google'],
    ['https://www.facebook.com/', 'Meta (mvfst)'], ['https://quic.nginx.org/', 'nginx QUIC'], ['https://www.litespeedtech.com/', 'LiteSpeed']];
  $('#presets').innerHTML = PRESETS.map(([u, t]) => `<li><a data-u="${esc(u)}">${esc(t)}</a> <span class="kern-muted">${esc(u)}</span></li>`).join('');
  $('#presets').addEventListener('click', (e) => { const a = e.target.closest('[data-u]'); if (a) { $('#q-url').value = a.dataset.u; $('#btn-test').click(); } });

  const step = (n, title, ok, body) => `<div class="kern-card"><h5><span class="kern-badge ${ok === true ? 'kern-badge--ok' : ok === false ? 'kern-badge--err' : 'kern-badge--warn'}">${n}</span> ${title}</h5>${body}</div>`;

  $('#btn-test').onclick = (e) => Kern.busy(e.target, async () => {
    const d = await Kern.api('http3', { url: $('#q-url').value.trim() });
    const h = d.https, q = d.quic;
    let out = step(1, 'Alt-Svc-advertentie', d.advertised.length > 0,
      `<p style="margin:0">HTTPS-antwoord: <span class="kern-badge">HTTP/${esc(h.version)} ${h.status}</span></p>
       <pre class="kern-pre">alt-svc: ${esc(h.altSvc || '(geen — deze server adverteert geen HTTP/3)')}</pre>
       ${d.advertised.map((a) => `<span class="kern-badge kern-badge--ok">${esc(a.alpn)} op ${esc(a.authority)}</span> <span class="kern-muted">onthouden ${Math.round(a.maxAge / 3600)} uur</span>`).join(' ')}`);
    out += step(2, 'QUIC-versieonderhandeling over UDP', q.ok,
      q.ok ? `<p style="margin:0">Version Negotiation ontvangen in ${q.rtt} ms (${q.bytes} bytes) — connection-ID's ${q.cidEcho ? 'correct omgewisseld ✓' : 'niet omgewisseld'}.</p>
        <table class="kern-kv">${q.versions.map((v) => `<tr><th><code>${esc(v.hex)}</code></th><td>${esc(v.name)}</td></tr>`).join('')}</table>`
        : `<p style="margin:0">${esc(q.reason)}</p>`);
    out += step(3, 'Echte HTTP/3-request', d.curlHttp3 ? !!(d.h3request && d.h3request.status) : null,
      d.curlHttp3 ? (d.h3request.status ? `<p>Status ${d.h3request.status} via HTTP/3 in ${d.h3request.ms} ms.</p>` : `<p>${esc(d.h3request.error)}</p>`)
        : '<p style="margin:0">De curl op deze server is niet met HTTP/3 gebouwd (gebruikelijk op gedeelde hosting). Stap 1 en 2 bewijzen wel dat de site QUIC/HTTP-3 spreekt.</p>');
    $('#steps').innerHTML = out;
  });
  Kern.onStart(() => { if (Kern.param('url')) $('#q-url').value = Kern.param('url'); });
})();
