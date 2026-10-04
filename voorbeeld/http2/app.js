// HTTP/2 vs HTTP/1.1 — gebruikt ../api/http2.php
(() => {
  const { $, esc } = Kern;
  const MODES = { h2: { mode: 'h2', label: 'HTTP/2' }, 'h1-1': { mode: 'h1', maxConnections: 1, label: 'HTTP/1.1 · 1 verbinding' }, 'h1-6': { mode: 'h1', maxConnections: 6, label: 'HTTP/1.1 · 6 verbindingen' } };
  const runs = {};
  const urls = () => $('#h-urls').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6);

  function waterfall(d) {
    const max = Math.max(...d.results.map((r) => r.timing.total), 1);
    const pct = (v) => `${(v / max) * 100}%`;
    return `<div class="wf">${d.results.map((r) => {
      const t = r.timing, segs = [['dns', 0, t.dns], ['tcp', t.dns, t.tcp], ['tls', t.tcp, t.tls], ['wait', Math.max(t.tls, t.tcp), t.ttfb], ['recv', t.ttfb, t.total]];
      const name = new URL(r.url).pathname || '/';
      return `<div class="wf__row"><span class="wf__name" title="${esc(r.url)}">${esc(name)}</span><div class="wf__track">${
        segs.filter(([, a, b]) => b > a).map(([c, a, b]) => `<span class="wf__seg wf__seg--${c}" style="left:${pct(a)};width:${pct(b - a)}"></span>`).join('')}</div><span class="wf__ms">${r.error ? 'fout' : t.total + ' ms'}</span></div>`;
    }).join('')}<div class="wf__legend"><span><i class="wf__seg--dns"></i>DNS</span><span><i class="wf__seg--tcp"></i>TCP</span><span><i class="wf__seg--tls"></i>TLS</span><span><i class="wf__seg--wait"></i>wachten</span><span><i class="wf__seg--recv"></i>ontvangen</span></div></div>`;
  }

  function renderRun(key, d) {
    const m = MODES[key];
    const ports = [...new Set(d.results.map((r) => r.localPort))];
    return `<div class="kern-card"><h5>${esc(m.label)} <span class="kern-muted">· ${d.wall_ms} ms totaal</span></h5>
      <p style="margin:0"><span class="kern-badge ${d.connections === 1 ? 'kern-badge--ok' : 'kern-badge--warn'}">${d.connections} TCP-verbinding${d.connections === 1 ? '' : 'en'}</span>
      <span class="kern-badge">versie ${esc([...new Set(d.results.map((r) => r.version))].join(', '))}</span>
      <span class="kern-muted">lokale poorten ${esc(ports.join(', '))}</span></p>
      ${waterfall(d)}
      ${d.results.some((r) => r.error) ? `<p class="kern-note">${d.results.filter((r) => r.error).map((r) => esc(r.url + ': ' + r.error)).join('<br>')}</p>` : ''}
      <details><summary class="kern-muted">Responsheaders (1e verzoek)</summary><table class="kern-kv">${(d.results[0]?.headers || []).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></details></div>`;
  }

  function renderCompare() {
    const keys = Object.keys(runs);
    if (keys.length < 2) { $('#compare').innerHTML = ''; return; }
    const best = Math.min(...keys.map((k) => runs[k].wall_ms));
    $('#compare').innerHTML = `<div class="kern-card"><h5>Vergelijking (${urls().length} verzoeken)</h5><table class="kern-kv">
      <tr><th>Modus</th><td><strong>tijd · verbindingen</strong></td></tr>
      ${keys.map((k) => `<tr><th>${esc(MODES[k].label)}</th><td>${runs[k].wall_ms} ms · ${runs[k].connections} TCP
        <div class="kern-bar"><span style="width:${Math.min(100, (best / runs[k].wall_ms) * 100)}%"></span></div></td></tr>`).join('')}</table>
      <p class="kern-muted">HTTP/2 haalt alles tegelijk over één verbinding; HTTP/1.1 moet wachten óf extra verbindingen openen.</p></div>`;
  }

  async function run(key) {
    const d = await Kern.api('http2', { urls: urls(), ...MODES[key] });
    runs[key] = d;
    $('#runs').innerHTML = Object.keys(runs).map((k) => renderRun(k, runs[k])).join('');
    renderCompare();
  }
  document.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => Kern.busy(b, () => run(b.dataset.mode)); });
  $('#btn-all').onclick = (e) => Kern.busy(e.target, async () => { for (const k of Object.keys(MODES)) await run(k); });

  Kern.onView('browser', () => {
    const entries = [performance.getEntriesByType('navigation')[0], ...performance.getEntriesByType('resource')].filter(Boolean);
    $('#nexthop').innerHTML = entries.map((e) => `<tr><th>${esc(e.name.replace(location.origin, '') || '/')}</th><td><span class="kern-badge ${e.nextHopProtocol === 'h3' || e.nextHopProtocol === 'h2' ? 'kern-badge--ok' : ''}">${esc(e.nextHopProtocol || 'onbekend')}</span></td></tr>`).join('');
  });
  Kern.onStart(() => { if (Kern.param('urls')) $('#h-urls').value = Kern.param('urls').split(',').join('\n'); });
})();
