// LwM2M-apparaat — gebruikt ../api/lwm2m.php (register / update / deregister via CoAP)
(() => {
  const { $, esc } = Kern;
  const OBJECTS = [
    ['1/0', 'LwM2M Server (1)'], ['3/0', 'Device (3)'], ['4/0', 'Connectivity (4)'],
    ['3303/0', 'Temperatuur (3303)'], ['3304/0', 'Luchtvochtigheid (3304)'], ['3311/0', 'Lamp (3311)'],
  ];
  $('#l-objects').innerHTML = OBJECTS.map(([id, name], i) =>
    `<label class="kern-muted" style="flex:0 0 auto;display:flex;gap:.3rem;align-items:center"><input type="checkbox" value="${id}" ${i < 2 || id === '3303/0' ? 'checked' : ''}> ${esc(name)}</label>`).join('');

  let reg = null;     // { location, endpoint, server, lifetime, at }
  const server = () => ({ host: $('#l-host').value.trim(), port: +$('#l-port').value || 5683 });

  function renderState() {
    $('#btn-lw-update').disabled = $('#btn-lw-deregister').disabled = !reg;
    $('#state').innerHTML = reg ? `<div class="kern-card"><span class="kern-badge kern-badge--ok">geregistreerd</span>
        <strong>${esc(reg.endpoint)}</strong> bij ${esc(reg.server)}<br>
        <span class="kern-muted">locatie <code>${esc(reg.location)}</code> · lifetime ${reg.lifetime}s · verloopt ${new Date(reg.at + reg.lifetime * 1000).toLocaleTimeString('nl-NL')}</span></div>`
      : '<div class="kern-card"><span class="kern-badge kern-badge--warn">niet geregistreerd</span></div>';
  }
  function showResult(d, label) {
    const r = d.response;
    Kern.reveal('#state');
    $('#result').innerHTML = `<div class="kern-card"><h5>${esc(label)} → <span class="kern-badge ${r.code.startsWith('2') ? 'kern-badge--ok' : 'kern-badge--err'}">${esc(r.code)} ${esc(r.codeName)}</span></h5>
      ${d.payload ? `<p class="kern-muted">Link-format payload:</p><pre class="kern-pre">${esc(d.payload)}</pre>` : ''}
      <p class="kern-muted">${r.packets} datagram(men) · ${d.ms} ms · zie het Logboek voor de ruwe CoAP-berichten</p></div>`;
  }

  $('#btn-lw-register').onclick = (e) => Kern.busy(e.target, async () => {
    const objects = [...document.querySelectorAll('#l-objects input:checked')].map((i) => i.value);
    const d = await Kern.api('lwm2m', { action: 'register', ...server(), endpoint: $('#l-ep').value.trim(), lifetime: +$('#l-lt').value, objects });
    showResult(d, 'Register');
    if (d.response.code === '2.01') {
      reg = { location: d.location, endpoint: d.endpoint, server: `${server().host}:${server().port}`, lifetime: d.lifetime, at: Date.now() };
      Kern.set('reg', reg);
      Kern.toast('Geregistreerd', `${d.endpoint} → ${d.location}`, 'ok');
    }
    renderState();
  });
  $('#btn-lw-update').onclick = (e) => Kern.busy(e.target, async () => {
    const d = await Kern.api('lwm2m', { action: 'update', ...server(), location: reg.location });
    showResult(d, 'Update');
    if (d.response.code === '2.04') { reg.at = Date.now(); Kern.set('reg', reg); }
    renderState();
  });
  $('#btn-lw-deregister').onclick = (e) => Kern.busy(e.target, async () => {
    const d = await Kern.api('lwm2m', { action: 'deregister', ...server(), location: reg.location });
    showResult(d, 'Deregister');
    reg = null;
    Kern.set('reg', null);
    renderState();
  });

  // Objectmodel + SenML-JSON (zoals een apparaat een Read-antwoord zou coderen)
  function renderModel() {
    const t = +$('#o-temp').value;
    $('#o-temp-v').textContent = `${t.toFixed(1)} °C`;
    const ep = $('#l-ep').value || 'lpw-demo';
    const model = {
      '3/0': [[0, 'Manufacturer', 'LPW Demo'], [1, 'Model Number', 'Browser-apparaat'], [2, 'Serial Number', ep], [3, 'Firmware Version', '1.2.2'], [9, 'Battery Level', 87], [13, 'Current Time', Math.floor(Date.now() / 1000)]],
      '3303/0': [[5700, 'Sensor Value', +t.toFixed(1)], [5701, 'Sensor Units', 'Cel'], [5601, 'Min Measured', -2.5], [5602, 'Max Measured', 31.2]],
    };
    $('#model').innerHTML = Object.entries(model).map(([o, res]) => `<div class="kern-card"><h5>/${o} — ${o.startsWith('3/') ? 'Device' : 'Temperature'}</h5>
      <table class="kern-kv">${res.map(([id, n, v]) => `<tr><th>/${o}/${id} ${esc(n)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>`).join('');
    const senml = [{ bn: '/3303/0/', n: '5700', v: +t.toFixed(1) }, { n: '5701', vs: 'Cel' }, { n: '5601', v: -2.5 }, { n: '5602', v: 31.2 }];
    $('#senml').textContent = `Content-Format: 110 (application/senml+json)\n\n${JSON.stringify(senml, null, 2)}`;
  }
  $('#o-temp').addEventListener('input', renderModel);

  Kern.onStart((user) => {
    if (!$('#l-ep').value) $('#l-ep').value = `lpw-${user}-${Math.random().toString(16).slice(2, 6)}`;
    reg = Kern.get('reg', null);
    renderState();
    renderModel();
  });
})();
