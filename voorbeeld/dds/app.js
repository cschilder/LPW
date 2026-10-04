// DDS-QoS-simulator + RTPS 2.5-codering van het laatste sample (gevalideerd tegen een
// afgevangen pakket van Eclipse Cyclone DDS: zelfde submessages, vlaggen en CDR-indeling).
// De matching (requested vs offered), RELIABLE-herverzending via HEARTBEAT/ACKNACK, en
// TRANSIENT_LOCAL-geschiedenis voor late joiners volgen de OMG DDS 1.4-regels.
(() => {
  const { $, esc } = Kern;
  const READERS = [
    { name: 'Dashboard', rel: 'RELIABLE', dur: 'TRANSIENT_LOCAL' },
    { name: 'Logger', rel: 'BEST_EFFORT', dur: 'VOLATILE' },
    { name: 'Alarm', rel: 'RELIABLE', dur: 'VOLATILE' },
  ];
  let writer, readers, timer = null, lastSample = null, guidPrefix;
  const writerQos = () => ({ rel: $('#w-rel').value, dur: $('#w-dur').value, depth: Math.max(1, Math.min(50, +$('#w-depth').value || 5)) });

  function reset() {
    writer = { sn: 0, history: [] };
    readers = READERS.map((r, i) => ({ ...r, id: i + 1, got: [], lost: 0, retrans: 0, late: false }));
    guidPrefix = crypto.getRandomValues(new Uint8Array(12));
    lastSample = null;
    render();
    renderRtps();
  }

  function compatible(r) {
    const w = writerQos();
    if (r.rel === 'RELIABLE' && w.rel === 'BEST_EFFORT') return 'reader eist RELIABLE, writer biedt BEST_EFFORT';
    if (r.dur === 'TRANSIENT_LOCAL' && w.dur === 'VOLATILE') return 'reader eist TRANSIENT_LOCAL, writer biedt VOLATILE';
    return '';
  }

  function publish() {
    const w = writerQos();
    const now = Date.now();
    const s = { sn: ++writer.sn, waarde: +(19 + Math.random() * 5).toFixed(1), ts: Math.floor(now / 1000), frac: Math.floor(((now % 1000) / 1000) * 2 ** 32), sensor: 'sensor_01' };
    writer.history.push(s);
    while (writer.history.length > w.depth) writer.history.shift();
    lastSample = s;
    const loss = +$('#loss').value / 100;
    Kern.log('out', `DATA sn=${s.sn}`, `writer → multicast · ${s.sensor}=${s.waarde} °C`);
    readers.forEach((r) => {
      const why = compatible(r);
      if (why) return;
      if (Math.random() < loss) {
        if (r.rel === 'RELIABLE' && w.rel === 'RELIABLE') {
          r.retrans++;
          Kern.log('err', `verlies → ${r.name}`, `sn=${s.sn} kwijt; HEARTBEAT(1..${s.sn}) → ACKNACK(mist ${s.sn}) → DATA sn=${s.sn} opnieuw`);
          r.got.push({ ...s, retrans: true });
        } else {
          r.lost++;
          Kern.log('err', `verlies → ${r.name}`, `sn=${s.sn} kwijt (BEST_EFFORT: geen herverzending)`);
        }
      } else r.got.push(s);
      if (r.got.length > 8) r.got.shift();
    });
    render();
    renderRtps();
  }

  function addLate() {
    const n = readers.length + 1;
    const r = { name: `Late joiner ${n - 3}`, rel: 'RELIABLE', dur: 'TRANSIENT_LOCAL', id: n, got: [], lost: 0, retrans: 0, late: true };
    readers.push(r);
    const why = compatible(r);
    if (!why && writerQos().dur === 'TRANSIENT_LOCAL') {
      r.got = writer.history.map((s) => ({ ...s, history: true }));
      Kern.log('in', `${r.name} ontdekt writer`, `TRANSIENT_LOCAL: ${r.got.length} historische samples (KEEP_LAST ${writerQos().depth}) direct geleverd`);
    } else Kern.log('in', `${r.name} ontdekt writer`, why || 'VOLATILE: geen geschiedenis, alleen nieuwe samples');
    render();
  }

  function render() {
    const w = writerQos();
    $('#loss-v').textContent = `${$('#loss').value}%`;
    $('#w-status').textContent = `${writer.sn} samples gepubliceerd · geschiedenis: ${writer.history.length}/${w.depth}`;
    $('#readers').innerHTML = readers.map((r) => {
      const why = compatible(r);
      return `<div class="kern-card"><h5>${esc(r.name)} <span class="kern-muted">· ${r.rel} · ${r.dur}</span></h5>
        ${why ? `<p style="margin:0"><span class="kern-badge kern-badge--err">REQUESTED_INCOMPATIBLE_QOS</span> ${esc(why)} — geen match, geen data.</p>`
        : `<p style="margin:0 0 .3rem"><span class="kern-badge kern-badge--ok">gematcht</span><span class="kern-badge">${r.got.length ? 'laatste ' + r.got.length : '0'} samples</span>
            ${r.retrans ? `<span class="kern-badge kern-badge--warn">${r.retrans}× hersteld (ACKNACK)</span>` : ''}${r.lost ? `<span class="kern-badge kern-badge--err">${r.lost} verloren</span>` : ''}</p>
           <div>${r.got.map((s) => `<span class="kern-badge" title="sn ${s.sn}" style="${s.history ? 'background:#77216F;color:#fff' : s.retrans ? 'background:#f99b11;color:#111' : ''}">#${s.sn} ${s.waarde}°</span>`).join(' ') || '<span class="kern-muted">nog niets ontvangen</span>'}</div>`}
      </div>`;
    }).join('') + '<p class="kern-muted"><span class="kern-badge" style="background:#77216F;color:#fff">paars</span> = geschiedenis voor late joiner · <span class="kern-badge" style="background:#f99b11;color:#111">oranje</span> = na verlies opnieuw verzonden</p>';
  }

  // ---------- RTPS 2.5: header + INFO_TS + DATA met CDR_LE-payload (zoals Cyclone DDS) ----------
  function renderRtps() {
    if (!lastSample) { $('#rtps-hex').textContent = 'Publiceer eerst een sample.'; $('#rtps-fields').innerHTML = ''; return; }
    const s = lastSample, b = [], le32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
    const f32 = (x) => { const v = new DataView(new ArrayBuffer(4)); v.setFloat32(0, x, true); return [...new Uint8Array(v.buffer)]; };
    const str = (t) => { const e = [...new TextEncoder().encode(t), 0]; const out = [...le32(e.length), ...e]; while (out.length % 4) out.push(0); return out; };
    const header = [0x52, 0x54, 0x50, 0x53, 2, 5, 0x01, 0x10, ...guidPrefix];
    const infoTs = [0x09, 0x01, 8, 0, ...le32(s.ts), ...le32(s.frac || 0)];   // seconden + fractie × 2^32
    const payload = [0x00, 0x01, 0x00, 0x00, ...str(s.sensor), ...f32(s.waarde), ...le32(s.ts)];
    const dataBody = [0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0x02, 0x03, ...le32(0), ...le32(s.sn), ...payload];
    const data = [0x15, 0x05, dataBody.length & 255, dataBody.length >> 8, ...dataBody];
    b.push(...header, ...infoTs, ...data);
    const hx = (a) => a.map((x) => x.toString(16).padStart(2, '0')).join(' ');
    $('#rtps-hex').textContent = b.reduce((acc, x, i) => acc + x.toString(16).padStart(2, '0') + ((i + 1) % 8 ? ' ' : '\n'), '');
    const rows = [
      ['RTPS-header (20 B)', hx(header.slice(0, 8)) + ' …', '"RTPS", protocolversie 2.5, vendorId 01 10 (Eclipse Cyclone DDS), GUID-prefix (12 B)'],
      ['INFO_TS (12 B)', hx(infoTs.slice(0, 4)) + ' …', `bron-tijdstempel ${new Date(s.ts * 1000).toLocaleTimeString('nl-NL')}`],
      ['DATA-kop', hx(data.slice(0, 4)), `submessage 0x15, vlaggen E (little-endian) + D (data), ${dataBody.length} bytes`],
      ['readerId', '00 00 00 00', 'ENTITYID_UNKNOWN (alle lezers)'],
      ['writerId', '00 00 02 03', 'gebruikersentiteit 2, kind 0x03 = writer zonder key (struct heeft geen @key)'],
      ['writerSN', hx([...le32(0), ...le32(s.sn)]), `volgnummer ${s.sn}`],
      ['Encapsulatie', '00 01 00 00', 'CDR_LE'],
      ['sensor_id (string)', hx(str(s.sensor).slice(0, 8)) + ' …', `lengte ${s.sensor.length + 1} + "${s.sensor}\\0" + padding`],
      ['waarde (float32)', hx(f32(s.waarde)), `${s.waarde}`],
      ['tijdstip (int32)', hx(le32(s.ts)), `${s.ts}`],
    ];
    $('#rtps-fields').innerHTML = rows.map(([a, h, d]) => `<tr><th>${esc(a)}</th><td><code>${esc(h)}</code><br><span class="kern-muted">${esc(d)}</span></td></tr>`).join('');
  }

  $('#btn-pub').onclick = publish;
  $('#btn-late').onclick = addLate;
  $('#btn-reset').onclick = reset;
  $('#btn-stream').onclick = () => {
    if (timer) { clearInterval(timer); timer = null; $('#btn-stream').textContent = '▶ Stroom (1/s)'; Kern.status('on', 'gepauzeerd'); return; }
    timer = setInterval(publish, 1000);
    $('#btn-stream').textContent = '⏸ Pauze';
    Kern.status('on', 'stroomt');
  };
  ['#w-rel', '#w-dur', '#w-depth', '#loss'].forEach((s) => $(s).addEventListener('input', render));
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) Kern.show(t.dataset.tab); });

  $('#py').textContent = `# dds_demo.py — Eclipse Cyclone DDS (Python)
import sys, time, random
from dataclasses import dataclass
from cyclonedds.domain import DomainParticipant
from cyclonedds.core import Qos, Policy
from cyclonedds.topic import Topic
from cyclonedds.pub import DataWriter
from cyclonedds.sub import DataReader
from cyclonedds.idl import IdlStruct
from cyclonedds.idl.types import int32, float32
from cyclonedds.util import duration

@dataclass
class Temperatuur(IdlStruct, typename="Sensor.Temperatuur"):
    sensor_id: str
    waarde: float32
    tijdstip: int32

# Let op: hoeveel geschiedenis een late joiner krijgt, bepaalt Cyclone via
# DurabilityService.history (standaard KeepLast(1)), niet via History zelf.
qos = Qos(Policy.Reliability.Reliable(max_blocking_time=duration(milliseconds=100)),
          Policy.Durability.TransientLocal,
          Policy.History.KeepLast(5),
          Policy.DurabilityService(cleanup_delay=0, history=Policy.History.KeepLast(5),
                                   max_samples=-1, max_instances=-1, max_samples_per_instance=-1))
dp = DomainParticipant(0)
topic = Topic(dp, "Sensor/Temperatuur", Temperatuur, qos=qos)

if sys.argv[1:] == ["pub"]:
    w = DataWriter(dp, topic, qos=qos)
    for i in range(1000):
        s = Temperatuur("sensor_01", round(19 + random.random() * 5, 1), int(time.time()))
        w.write(s); print("gepubliceerd", s); time.sleep(1)
else:
    r = DataReader(dp, topic, qos=qos)
    while True:
        for s in r.take(N=10):
            print(f"[{s.sensor_id}] {s.waarde:.1f} °C @ {s.tijdstip}")
        time.sleep(0.2)`;

  Kern.onStart(() => { reset(); Kern.status('on', 'simulator'); });
})();
