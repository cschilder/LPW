// MQTT-SN-sensor — gebruikt ../api/mqttsn.php (en een MQTT-SN-gateway) + lokale pakketbouwer
(() => {
  const { $, esc } = Kern;
  const conn = () => ({ host: $('#s-host').value.trim(), port: +$('#s-port').value, clientId: $('#s-client').value.trim(),
    topic: $('#s-topic').value.trim(), qos: +$('#s-qos').value });
  const save = () => Kern.set('conn', conn());

  function renderSteps(title, d) {
    Kern.reveal('#session');
    $('#session').innerHTML = `<div class="kern-card"><h5>${esc(title)} <span class="kern-muted">· ${d.ms} ms</span></h5>
      <table class="kern-kv">${d.steps.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</table>
      ${d.received ? (d.received.length ? d.received.map((r) => `<div class="twt"><div class="twt__meta"><span class="twt__subject">${esc(r.topic)}</span><span class="twt__qos">topic-ID ${r.topicId}</span></div><div class="twt__body">${esc(r.data)}</div></div>`).join('') : '<p class="kern-muted">Geen berichten binnengekomen — publiceer iets op dit topic (bijv. met de MQTT-demo).</p>') : ''}
      ${d.overhead ? `<p class="kern-note">Elk PUBLISH-pakket kost hier ${d.overhead.mqttsn} bytes kop; bij gewone MQTT was dat ${d.overhead.mqtt} bytes (lange topicnaam in elk bericht).</p>` : ''}</div>`;
  }
  const need = () => { if (conn().host) return true; Kern.toast('Geen gateway', 'Vul het adres van een MQTT-SN-gateway in.', 'err'); return false; };
  $('#btn-pub').onclick = (e) => Kern.busy(e.target, async () => {
    if (!need()) return; save();
    const messages = $('#s-msgs').value.split('\n').map((s) => s.trim()).filter(Boolean);
    renderSteps('Publiceren', await Kern.api('mqttsn', { action: 'publish', ...conn(), messages }));
  });
  $('#btn-subscr').onclick = (e) => Kern.busy(e.target, async () => {
    if (!need()) return; save();
    renderSteps('Abonneren', await Kern.api('mqttsn', { action: 'subscribe', ...conn(), wait: 4 }));
  });
  $('#btn-qosm1').onclick = (e) => Kern.busy(e.target, async () => {
    if (!need()) return; save();
    renderSteps('QoS −1', await Kern.api('mqttsn', { action: 'qosm1', ...conn(), topicId: 1, message: $('#s-msgs').value.split('\n')[0] }));
  });

  // ---------- pakketbouwer (zelfde codering als de brug en de gateway) ----------
  const T = { CONNECT: 0x04, REGISTER: 0x0a, PUBLISH: 0x0c, SUBSCRIBE: 0x12, PINGREQ: 0x16, DISCONNECT: 0x18 };
  const u16 = (n) => [(n >> 8) & 255, n & 255];
  const txt = (s) => [...new TextEncoder().encode(s)];
  function build() {
    const type = $('#b-type').value, q = +$('#b-qos').value, id = +$('#b-tid').value || 0, text = $('#b-text').value;
    let body = [], fields = [];
    const flags = (q & 3) << 5;
    if (type === 'CONNECT') { body = [0x04, 0x01, ...u16(60), ...txt(text)]; fields = [['Flags', '0x04 (clean session)'], ['Protocol-ID', '0x01'], ['Duration', '60 s'], ['Client-ID', text]]; }
    if (type === 'REGISTER') { body = [...u16(0), ...u16(id), ...txt(text)]; fields = [['Topic-ID', '0 (door gateway in te vullen)'], ['Msg-ID', id], ['Topicnaam', text]]; }
    if (type === 'PUBLISH') { body = [flags | (q === 3 ? 1 : 0), ...u16(id), ...u16(q === 1 || q === 2 ? 1 : 0), ...txt(text)]; fields = [['Flags', `0x${(flags | (q === 3 ? 1 : 0)).toString(16).padStart(2, '0')} (QoS ${q === 3 ? '−1, voorgedefinieerd' : q})`], ['Topic-ID', id], ['Msg-ID', q === 1 || q === 2 ? 1 : 0], ['Data', text]]; }
    if (type === 'SUBSCRIBE') { body = [flags, ...u16(id), ...txt(text)]; fields = [['Flags', `QoS ${q}, topicnaam`], ['Msg-ID', id], ['Topicnaam', text]]; }
    const all = [body.length + 2, T[type], ...body];
    $('#b-hex').textContent = all.map((b) => b.toString(16).padStart(2, '0')).join(' ');
    $('#b-fields').innerHTML = [['Length', `${all.length} bytes (incl. lengte en type)`], ['MsgType', `0x${T[type].toString(16).padStart(2, '0')} ${type}`], ...fields]
      .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
    if (type === 'PUBLISH') {
      const topic = $('#s-topic').value || 'lpw/sensor/temperatuur';
      const mqtt = 2 + 2 + topic.length + (q === 1 ? 2 : 0) + txt(text).length;
      $('#compare').innerHTML = `<table class="kern-kv"><tr><th>MQTT-SN PUBLISH</th><td>${all.length} bytes</td></tr><tr><th>MQTT PUBLISH ("${esc(topic)}")</th><td>${mqtt} bytes</td></tr>
        <tr><th>Besparing</th><td>${Math.round((1 - all.length / mqtt) * 100)}% per bericht</td></tr></table>`;
    } else $('#compare').innerHTML = '<p class="kern-muted">Kies PUBLISH om de grootte met MQTT te vergelijken.</p>';
  }
  ['#b-type', '#b-qos', '#b-tid', '#b-text'].forEach((s) => $(s).addEventListener('input', build));

  Kern.onStart((user) => {
    const c = Kern.get('conn');
    $('#s-client').value = c?.clientId || `sensor-${user}`;
    if (c) { $('#s-host').value = c.host; $('#s-port').value = c.port; $('#s-topic').value = c.topic; $('#s-qos').value = c.qos; }
    build();
  });
})();
