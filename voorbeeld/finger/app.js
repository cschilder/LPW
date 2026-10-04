// Finger-client — gebruikt ../api/finger.php
(() => {
  const { $, esc } = Kern;
  const PUBLIC = [
    ['', 'happynetbox.com', 'Happy Net Box — finger-hosting met .plan'],
    ['', 'plan.cat', 'plan.cat — moderne .plan-community'],
    ['', 'graph.no', 'graph.no — weerbericht via finger (bijv. oslo@graph.no)'],
    ['', 'tilde.team', 'tilde.team'],
  ];

  async function finger(user, host, verbose = $('#f-verbose').checked) {
    $('#f-user').value = user;
    $('#f-host').value = host;
    $('#result').innerHTML = '<div class="kern-card kern-muted">Bezig…</div>';
    let d;
    try { d = await Kern.api('finger', { user, host, verbose }); }
    catch (e) { $('#result').innerHTML = `<div class="kern-card"><span class="kern-badge kern-badge--err">Fout</span> ${esc(e.message)}</div>`; return; }
    Kern.reveal('#result');
    const recent = [d.query, ...Kern.get('recent', []).filter((q) => q !== d.query)].slice(0, 12);
    Kern.set('recent', recent);
    $('#result').innerHTML = `
      <div class="kern-card">
        <h5>${esc(d.query)} <span class="kern-muted">· ${d.conn.bytes} bytes · ${d.ms} ms</span></h5>
        ${d.fields.length ? `<table class="kern-kv">${d.fields.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
        ${d.plan ? `<h5 style="margin-top:.7rem">📋 .plan</h5><pre class="kern-pre">${esc(d.plan)}</pre>` : ''}
      </div>
      <div class="kern-card"><h5>Ruw antwoord</h5><pre class="kern-pre">${esc(d.text)}</pre></div>`;
  }

  $('#btn-finger').onclick = (e) => Kern.busy(e.target, () => finger($('#f-user').value.trim(), $('#f-host').value.trim()));
  $('#f-user').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-finger').click(); });

  function renderRecent() {
    $('#recent').innerHTML = Kern.get('recent', []).map((q) => `<li><a data-q="${esc(q)}">${esc(q)}</a></li>`).join('')
      || '<li class="kern-muted">Nog niets opgevraagd.</li>';
  }
  Kern.onView('recent', renderRecent);
  $('#public').innerHTML = PUBLIC.map(([u, h, t]) => `<li><a data-q="${esc(u + '@' + h)}">${esc(t)}</a><br><span class="kern-muted">finger @${esc(h)}</span></li>`).join('');
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (!q) return;
    const [user, host] = q.dataset.q.split('@');
    Kern.show('opvragen');
    finger(user, host);
  });

  Kern.onStart(() => {
    const p = Kern.param('url');      // finger://user@host of finger://host/user
    if (p) {
      const m = p.replace(/^finger:\/\//, '').match(/^(?:([^@/]*)@)?([^/]+)(?:\/(.*))?$/);
      if (m) finger(m[1] || m[3] || '', m[2], false);
    }
  });
})();
