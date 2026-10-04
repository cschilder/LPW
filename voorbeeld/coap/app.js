// CoAP-client — gebruikt ../api/coap.php
(() => {
  const { $, esc } = Kern;

  function renderResponse(d) {
    const r = d.response;
    const cls = r.code.startsWith('2') ? 'kern-badge--ok' : r.code.startsWith('4') || r.code.startsWith('5') ? 'kern-badge--err' : '';
    const opts = r.options.map((o) => `<tr><th>${esc(o.name)} <span class="kern-muted">(${o.num})</span></th><td>${
      typeof o.value === 'object' ? `blok ${o.value.num} · ${o.value.size} B · meer=${o.value.more ? 'ja' : 'nee'}` : esc(o.value)}</td></tr>`).join('');
    let body = '';
    if (r.payloadHex) body = `<pre class="kern-pre kern-hex">${esc(r.payloadHex)}</pre>`;
    else if (r.format === 'application/json' || r.format === 'application/senml+json') {
      try { body = `<pre class="kern-pre">${esc(JSON.stringify(JSON.parse(r.payload), null, 2))}</pre>`; } catch (_) { body = `<pre class="kern-pre">${esc(r.payload)}</pre>`; }
    } else if (r.payload) body = `<pre class="kern-pre">${esc(r.payload)}</pre>`;
    return `<div class="kern-card">
      <h5><span class="kern-badge ${cls}">${esc(r.code)} ${esc(r.codeName)}</span> ${esc(d.method)} ${esc(d.url)}</h5>
      <table class="kern-kv">
        <tr><th>Berichttype</th><td>${esc(r.type)} ${r.type === 'ACK' ? '(piggybacked)' : r.type === 'CON' ? '(separate response)' : ''}</td></tr>
        <tr><th>Message-ID · token</th><td>${r.mid} · <code>${esc(r.token)}</code></td></tr>
        <tr><th>Datagrammen verstuurd</th><td>${r.packets}${r.blocks > 1 ? ` · ${r.blocks} blokken (Block2)` : ''}</td></tr>
        <tr><th>Payload</th><td>${r.bytes} bytes · ${d.ms} ms</td></tr>
        ${opts}
      </table>${body}</div>`;
  }

  async function send(url = $('#c-url').value.trim(), method = $('#c-method').value) {
    $('#c-url').value = url;
    $('#c-method').value = method;
    const body = { url, method, type: $('#c-type').value };
    if (method === 'POST' || method === 'PUT') { body.payload = $('#c-payload').value; body.format = +$('#c-format').value; }
    const d = await Kern.api('coap', body);
    $('#result').innerHTML = renderResponse(d);
    const hist = [url, ...Kern.get('history', []).filter((u) => u !== url)].slice(0, 10);
    Kern.set('history', hist);
  }
  $('#btn-send').onclick = (e) => Kern.busy(e.target, () => send());
  $('#c-method').onchange = () => { $('#c-payload-wrap').hidden = !['POST', 'PUT'].includes($('#c-method').value); };

  $('#btn-discover').onclick = (e) => Kern.busy(e.target, async () => {
    const base = $('#d-host').value.trim().replace(/\/+$/, '');
    const d = await Kern.api('coap', { url: `${base}/.well-known/core`, method: 'GET' });
    const links = d.response.links || [];
    $('#resources').innerHTML = `<div class="kern-card"><h5>${links.length} resources op ${esc(base)}</h5><ul class="kern-list">${
      links.map((l) => {
        const a = l.attrs;
        const tags = [a.rt && `rt=${a.rt}`, a.if && `if=${a.if}`, a.ct !== undefined && `ct=${a.ct}`, a.obs && 'observeerbaar'].filter(Boolean);
        return `<li><a data-res="${esc(base + l.href)}"><code>${esc(l.href)}</code></a> ${a.title ? '— ' + esc(a.title) : ''}<br>${tags.map((t) => `<span class="kern-badge">${esc(t)}</span>`).join('')}</li>`;
      }).join('')}</ul></div>`;
  });
  $('#resources').addEventListener('click', (e) => {
    const a = e.target.closest('[data-res]');
    if (!a) return;
    Kern.show('verzoek');
    Kern.busy($('#btn-send'), () => send(a.dataset.res, 'GET'));
  });

  Kern.onStart(() => {
    const u = Kern.param('url');
    if (u) { $('#c-url').value = u; $('#d-host').value = u.replace(/^(coap:\/\/[^/]+).*/, '$1'); }
  });
})();
