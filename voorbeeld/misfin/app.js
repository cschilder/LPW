// Misfin-mail — gebruikt ../api/misfin.php (identiteit maken + versturen)
(() => {
  const { $, esc } = Kern;

  function renderIdentity() {
    const id = Kern.get('identity');
    $('#who').innerHTML = id
      ? `<span class="kern-badge kern-badge--ok">afzender</span> <strong>${esc(id.name)}</strong> &lt;${esc(id.address)}&gt;<br><span class="kern-muted">certificaat sha256 ${esc(id.sha256.slice(0, 23))}…</span>`
      : '<span class="kern-badge kern-badge--warn">geen identiteit</span> Maak eerst een identiteit aan op het tabblad <a class="kern-link" data-tab="identiteit">Identiteit</a>.';
    $('#identity').innerHTML = id ? `<div class="kern-card">
        <h5>${esc(id.address)}</h5>
        <table class="kern-kv"><tr><th>Naam (CN)</th><td>${esc(id.name)}</td></tr>
          <tr><th>Vingerafdruk</th><td><code>${esc(id.sha256)}</code></td></tr>
          <tr><th>Aangemaakt</th><td>${new Date(id.created).toLocaleString('nl-NL')}</td></tr></table>
        <details style="margin-top:.5rem"><summary class="kern-muted">Certificaat (PEM)</summary><pre class="kern-pre">${esc(id.cert)}</pre></details>
      </div>` : '';
  }
  const size = () => {
    const to = $('#m-to').value.trim();
    const n = new TextEncoder().encode(`misfin://${to} ${$('#m-body').value}\r\n`).length;
    $('#m-size').innerHTML = `${n} / 2048 bytes ${n > 2048 ? '<span class="kern-badge kern-badge--err">te lang</span>' : ''}`;
  };
  $('#m-body').addEventListener('input', size);
  $('#m-to').addEventListener('input', size);

  $('#btn-identity').onclick = (e) => Kern.busy(e.target, async () => {
    const d = await Kern.api('misfin', { action: 'identity', mailbox: $('#i-mailbox').value.trim(), host: $('#i-host').value.trim(), name: $('#i-name').value.trim() });
    Kern.set('identity', { address: d.address, name: $('#i-name').value.trim() || d.address, cert: d.cert, key: d.key, sha256: d.sha256, created: Date.now() });
    renderIdentity();
    Kern.toast('Identiteit aangemaakt', d.address, 'ok');
  });

  const STATUS = { 20: 'afgeleverd', 30: 'tijdelijk doorgestuurd', 31: 'permanent doorgestuurd', 40: 'tijdelijke fout', 41: 'server niet beschikbaar',
    44: 'rustig aan', 50: 'permanente fout', 51: 'mailbox bestaat niet', 52: 'mailbox verdwenen', 53: 'domein niet bediend', 59: 'ongeldig verzoek',
    60: 'certificaat vereist', 61: 'niet geautoriseerd', 62: 'certificaat ongeldig', 63: 'certificaat klopt niet' };
  $('#btn-send').onclick = (e) => Kern.busy(e.target, async () => {
    const id = Kern.get('identity');
    if (!id) { Kern.toast('Geen identiteit', 'Maak eerst een certificaat aan.', 'err'); return Kern.show('identiteit'); }
    const to = $('#m-to').value.trim(), message = $('#m-body').value;
    const d = await Kern.api('misfin', { action: 'send', to, message, cert: id.cert, key: id.key });
    const ok = d.status === 20;
    $('#result').innerHTML = `<div class="kern-card"><span class="kern-badge ${ok ? 'kern-badge--ok' : 'kern-badge--err'}">${d.status} ${STATUS[d.status] || ''}</span>
      ${ok ? `vingerafdruk ontvanger <code>${esc(d.meta.slice(0, 23))}…</code>` : esc(d.meta)}<p class="kern-muted">${d.bytes} bytes · ${d.ms} ms</p></div>`;
    const sent = Kern.get('sent', []);
    sent.unshift({ to, message, status: d.status, ts: Date.now() });
    Kern.set('sent', sent.slice(0, 50));
    if (ok) Kern.toast('Afgeleverd', to, 'ok');
  });

  Kern.onView('verzonden', () => {
    const sent = Kern.get('sent', []);
    $('#sent').innerHTML = sent.map((m) => `<div class="kern-card"><span class="kern-badge ${m.status === 20 ? 'kern-badge--ok' : 'kern-badge--err'}">${m.status}</span>
      aan <strong>${esc(m.to)}</strong> <span class="kern-muted">· ${Kern.relTime(m.ts)}</span>${Kern.renderGemtext(m.message)}</div>`).join('')
      || '<div class="kern-card kern-muted">Nog niets verzonden.</div>';
  });
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) Kern.show(t.dataset.tab); });

  Kern.onStart((user) => {
    if (!$('#i-mailbox').value) $('#i-mailbox').value = user;
    if (!$('#i-name').value) $('#i-name').value = user;
    if (!$('#i-host').value) $('#i-host').value = location.hostname;
    if (Kern.param('url')) $('#m-to').value = Kern.param('url').replace(/^misfin:\/\//, '');
    renderIdentity();
    size();
  });
})();
