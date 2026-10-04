// AMQP 0-9-1-client — gebruikt ../api/amqp.php
(() => {
  const { $, esc } = Kern;
  const conn = () => ({ host: $('#c-host').value.trim(), port: +$('#c-port').value, user: $('#c-user').value,
    pass: $('#c-pass').value, vhost: $('#c-vhost').value, tls: $('#c-tls').checked });
  const save = () => Kern.set('conn', conn());
  ['#c-host', '#c-port', '#c-user', '#c-pass', '#c-vhost', '#c-tls'].forEach((s) => $(s).addEventListener('change', save));
  $('#c-tls').addEventListener('change', () => { $('#c-port').value = $('#c-tls').checked ? 5671 : 5672; save(); });

  const needHost = () => {
    if (conn().host) return true;
    Kern.toast('Geen broker ingesteld', 'Vul eerst de verbinding in.', 'err');
    Kern.show('verbinding');
    return false;
  };

  $('#btn-connect').onclick = (e) => Kern.busy(e.target, async () => {
    if (!needHost()) return;
    const d = await Kern.api('amqp', { action: 'info', ...conn() });
    const s = d.server;
    $('#server').innerHTML = `<div class="kern-card"><h5><span class="kern-badge kern-badge--ok">verbonden</span> ${esc(s.product)} ${esc(s.version)}</h5>
      <table class="kern-kv"><tr><th>Protocol</th><td>AMQP ${esc(s.protocol)}-1</td></tr><tr><th>Platform</th><td>${esc(s.platform)}</td></tr>
      <tr><th>SASL</th><td>${esc(s.mechanisms)}</td></tr><tr><th>Capabilities</th><td>${s.capabilities.map((c) => `<span class="kern-badge">${esc(c)}</span>`).join(' ')}</td></tr></table></div>`;
  });

  async function publish(body) {
    return Kern.api('amqp', { action: 'publish', ...conn(), exchange: $('#p-exchange').value, exchangeType: $('#p-etype').value,
      routingKey: $('#p-key').value, queue: $('#p-queue').value, bindKey: $('#p-bind').value, body,
      contentType: /^\s*[{[]/.test(body) ? 'application/json' : 'text/plain', persistent: $('#p-persistent').checked });
  }
  function showPub(d) {
    Kern.reveal('#pub-result');
    const ok = d.confirmed && !d.returned;
    $('#pub-result').innerHTML = `<div class="kern-card"><h5><span class="kern-badge ${ok ? 'kern-badge--ok' : 'kern-badge--warn'}">${ok ? 'Basic.Ack — broker heeft het' : d.returned ? 'Basic.Return ' + esc(d.returned) : 'Nack'}</span></h5>
      <table class="kern-kv"><tr><th>Exchange → routing-key</th><td>${esc(d.published.exchange)} → ${esc(d.published.routingKey)}</td></tr>
      ${d.queue ? `<tr><th>Queue ${esc(d.queue.name)}</th><td>${d.queue.messages} wachtend vóór dit bericht · ${d.queue.consumers} consumers</td></tr>` : ''}
      <tr><th>Grootte · tijd</th><td>${d.published.bytes} bytes · ${d.ms} ms</td></tr></table>
      ${d.returned ? '<p class="kern-note">Geen queue gebonden met een passende binding-key — de broker stuurde het bericht terug (mandatory).</p>' : ''}</div>`;
  }
  $('#btn-publish').onclick = (e) => Kern.busy(e.target, async () => { if (needHost()) showPub(await publish($('#p-body').value)); });
  $('#btn-burst').onclick = (e) => Kern.busy(e.target, async () => {
    if (!needHost()) return;
    let d;
    for (let i = 0; i < 5; i++) d = await publish(JSON.stringify({ sensor: 'woonkamer', temp: +(20 + Math.random() * 3).toFixed(1), n: i + 1, ts: new Date().toISOString() }));
    showPub(d);
    Kern.toast('5 metingen gepubliceerd', `naar ${$('#p-exchange').value}`, 'ok');
  });

  $('#btn-get').onclick = (e) => Kern.busy(e.target, async () => {
    if (!needHost()) return;
    const d = await Kern.api('amqp', { action: 'get', ...conn(), queue: $('#g-queue').value, count: 5 });
    $('#messages').innerHTML = d.messages.length ? d.messages.map((m) => {
      let body = m.body;
      try { body = JSON.stringify(JSON.parse(m.body), null, 1); } catch (_) {}
      return `<div class="twt"><div class="twt__meta"><span class="twt__nick">#${m.tag}</span><span class="twt__subject">${esc(m.routingKey)}</span>
        <span class="twt__qos">${m.props.delivery_mode === 2 ? 'persistent' : 'transient'}</span><span class="twt__time">· nog ${m.remaining} in queue</span></div>
        <pre class="kern-pre" style="margin:.2rem 0 0">${esc(body)}</pre>
        <p class="kern-muted" style="margin:.3rem 0 0">${esc(m.props.content_type || '')}${m.props.timestamp ? ' · ' + new Date(m.props.timestamp * 1000).toLocaleTimeString('nl-NL') : ''} · bevestigd met Basic.Ack</p></div>`;
    }).join('') : `<div class="kern-card kern-muted">Basic.GetEmpty — de queue <code>${esc(d.queue)}</code> is leeg.</div>`;
  });

  Kern.onStart(() => {
    const c = Kern.get('conn');
    if (c) { $('#c-host').value = c.host; $('#c-port').value = c.port; $('#c-user').value = c.user; $('#c-pass').value = c.pass; $('#c-vhost').value = c.vhost; $('#c-tls').checked = c.tls; }
    if (!$('#c-host').value) Kern.show('verbinding');
  });
})();
