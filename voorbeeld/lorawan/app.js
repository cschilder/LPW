// LoRaWAN — pakketten bouwen/decoderen met echte AES/CMAC (lorawan.js) + airtime
(() => {
  const { $, esc } = Kern;
  const L = window.LoRaWAN;
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const toB64 = (u8) => btoa(String.fromCharCode(...u8));
  const sp = (h) => h.match(/../g)?.join(' ') || '';

  // TTN-stijl encoder: temp int16 (×10), vocht uint16 (×10), batterij uint8
  function encodeSensor() {
    const t = Math.round(+$('#u-temp').value * 10), h = Math.round(+$('#u-hum').value * 10), b = +$('#u-bat').value;
    $('#u-temp-v').textContent = `${(t / 10).toFixed(1)} °C`; $('#u-hum-v').textContent = `${(h / 10).toFixed(1)} %`; $('#u-bat-v').textContent = `${b} %`;
    return Uint8Array.of((t >> 8) & 255, t & 255, (h >> 8) & 255, h & 255, b);
  }

  async function build() {
    const payload = encodeSensor();
    let r;
    try {
      r = await L.buildUplink({ devAddr: $('#u-devaddr').value.trim(), fcnt: +$('#u-fcnt').value, fport: +$('#u-fport').value, payload, nwkSKey: $('#u-nwk').value, appSKey: $('#u-app').value });
    } catch (e) { $('#frame').innerHTML = `<div class="kern-card"><span class="kern-badge kern-badge--err">Fout</span> ${esc(e.message)}</div>`; return; }
    const p = r.parts, H = L.hex;
    const rows = [['MHDR', H([p.mhdr]), 'Unconfirmed Data Up (0x40)'], ['DevAddr', H(p.devAddr), 'little-endian'], ['FCtrl', H([p.fctrl]), 'ADR aan'],
      ['FCnt', H(p.fcnt), `= ${+$('#u-fcnt').value}`], ['FPort', H([p.fport]), 'applicatiepoort'], ['FRMPayload', H(p.frm), `versleuteld (klaar: ${H(payload)})`], ['MIC', H(p.mic), 'AES-CMAC, eerste 4 bytes']];
    const air = L.airtime(r.phy.length, 7), air12 = L.airtime(r.phy.length, 12);
    $('#frame').innerHTML = `<div class="kern-card"><h5>PHYPayload · ${r.phy.length} bytes</h5>
      <pre class="kern-pre">${sp(H(r.phy))}</pre><p class="kern-muted" style="margin:.3rem 0">base64: <code>${esc(toB64(r.phy))}</code></p>
      <table class="kern-kv">${rows.map(([n, h, d]) => `<tr><th>${n}</th><td><code>${sp(h)}</code><br><span class="kern-muted">${esc(d)}</span></td></tr>`).join('')}</table>
      <p class="kern-muted" style="margin-top:.4rem">Airtime ${air.ms.toFixed(1)} ms bij SF7 · ${air12.ms.toFixed(0)} ms bij SF12</p></div>`;
    Kern.log('out', `UPLINK FCnt ${+$('#u-fcnt').value}`, `${H(r.phy)}\nbase64 ${toB64(r.phy)}`);
    Kern.set('session', { devaddr: $('#u-devaddr').value, fcnt: +$('#u-fcnt').value, nwk: $('#u-nwk').value, app: $('#u-app').value });
  }
  ['#u-temp', '#u-hum', '#u-bat', '#u-devaddr', '#u-fcnt', '#u-fport', '#u-nwk', '#u-app'].forEach((s) => $(s).addEventListener('input', build));
  $('#btn-next').onclick = () => { $('#u-fcnt').value = +$('#u-fcnt').value + 1; build(); };
  $('#btn-keys').onclick = () => {
    const r = () => L.hex(crypto.getRandomValues(new Uint8Array(16))).toUpperCase();
    $('#u-nwk').value = r(); $('#u-app').value = r();
    $('#u-devaddr').value = '26' + L.hex(crypto.getRandomValues(new Uint8Array(3))).toUpperCase();
    build();
  };

  $('#btn-decode').onclick = async () => {
    const raw = $('#d-phy').value.trim();
    let phy;
    try { phy = /^[0-9a-f\s]+$/i.test(raw) ? L.unhex(raw) : fromB64(raw); } catch (_) { return Kern.toast('Ongeldige invoer', 'Gebruik hex of base64', 'err'); }
    try {
      const d = await L.decode(phy, $('#d-nwk').value, $('#d-app').value);
      const text = d.payload ? new TextDecoder().decode(L.unhex(d.payload)) : '';
      const printable = text && /^[\x20-\x7e]*$/.test(text);
      const sensor = d.payload && d.payload.length === 10 ? (() => { const b = L.unhex(d.payload); const t = ((b[0] << 8 | b[1]) << 16 >> 16) / 10; return `temp ${t} °C · vocht ${(b[2] << 8 | b[3]) / 10} % · batterij ${b[4]} %`; })() : '';
      $('#decoded').innerHTML = `<div class="kern-card"><h5>${esc(d.mtype)} <span class="kern-badge ${d.micValid ? 'kern-badge--ok' : 'kern-badge--err'}">MIC ${d.micValid ? 'geldig ✓' : 'ONGELDIG'}</span></h5>
        <table class="kern-kv"><tr><th>Richting</th><td>${esc(d.dir)}</td></tr><tr><th>DevAddr</th><td><code>${esc(d.devAddr)}</code></td></tr>
        <tr><th>FCnt · FPort</th><td>${d.fcnt} · ${d.fport ?? '—'}</td></tr><tr><th>ADR / ACK</th><td>${d.adr ? 'ja' : 'nee'} / ${d.ack ? 'ja' : 'nee'}</td></tr>
        <tr><th>MIC ontvangen</th><td><code>${esc(d.mic)}</code></td></tr><tr><th>MIC berekend</th><td><code>${esc(d.micCalculated || '—')}</code></td></tr>
        <tr><th>FRMPayload (versleuteld)</th><td><code>${esc(sp(d.frmEncrypted))}</code></td></tr>
        <tr><th>Ontsleuteld</th><td><code>${esc(sp(d.payload || ''))}</code>${printable ? `<br>als tekst: <strong>${esc(text)}</strong>` : ''}${sensor ? `<br>als sensor: <strong>${esc(sensor)}</strong>` : ''}</td></tr></table></div>`;
      Kern.log('in', 'DECODE', JSON.stringify(d));
    } catch (e) { $('#decoded').innerHTML = `<div class="kern-card"><span class="kern-badge kern-badge--err">Fout</span> ${esc(e.message)}</div>`; }
  };

  function airtimeTable() {
    const pl = 13 + (+$('#a-pl').value || 0), bw = +$('#a-bw').value;
    const rows = [7, 8, 9, 10, 11, 12].map((sf) => {
      const a = L.airtime(pl, sf, bw);
      return { sf, ms: a.ms, perHour: Math.floor(36000 / a.ms), perDay: Math.floor(30000 / a.ms) };
    });
    const max = Math.max(...rows.map((r) => r.ms));
    $('#a-table').innerHTML = `<tr><th>SF · ${pl} bytes</th><td><strong>airtime · max/uur (1%) · TTN/dag</strong></td></tr>` + rows.map((r) =>
      `<tr><th>SF${r.sf}</th><td>${r.ms.toFixed(1)} ms · ${r.perHour}× · ${r.perDay}×<div class="kern-bar"><span style="width:${(r.ms / max) * 100}%"></span></div></td></tr>`).join('');
  }
  $('#a-pl').addEventListener('input', airtimeTable);
  $('#a-bw').addEventListener('change', airtimeTable);

  Kern.onStart(() => {
    Kern.status('on', 'lokaal');
    const s = Kern.get('session');
    if (s) { $('#u-devaddr').value = s.devaddr; $('#u-fcnt').value = s.fcnt; $('#u-nwk').value = s.nwk; $('#u-app').value = s.app; }
    build();
    airtimeTable();
    $('#btn-decode').click();
  });
})();
