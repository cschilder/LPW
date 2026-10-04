// LoRaWAN 1.0.x — pakketopbouw, versleuteling, MIC en airtime. Werkt in browser én Node (WebCrypto).
//   PHYPayload = MHDR | MACPayload | MIC
//   MACPayload = FHDR (DevAddr | FCtrl | FCnt | FOpts) | FPort | FRMPayload
// Versleuteling: AES-128 in "CTR-achtige" modus met A_i-blokken (spec §4.3.3).
// MIC: eerste 4 bytes van AES-CMAC(NwkSKey, B0 | msg) (spec §4.4, RFC 4493).
(function (root) {
  'use strict';
  const subtle = (root.crypto || globalThis.crypto).subtle;

  const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
  const unhex = (h) => Uint8Array.from(String(h).replace(/[^0-9a-f]/gi, '').match(/../g) || [], (x) => parseInt(x, 16));
  const le = (n, len) => Uint8Array.from({ length: len }, (_, i) => (n >>> (8 * i)) & 0xff);
  const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; a.forEach((x) => { o.set(x, i); i += x.length; }); return o; };

  // AES-128 op één blok (ECB) via AES-CBC met IV = 0: het eerste uitvoerblok is precies AES(K, blok).
  async function aesBlock(key, block) {
    const k = await subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['encrypt']);
    return new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, k, block)).slice(0, 16);
  }

  // AES-CMAC (RFC 4493)
  async function cmac(key, msg) {
    const shift = (b) => { const o = new Uint8Array(16); for (let i = 0; i < 16; i++) o[i] = ((b[i] << 1) | (i < 15 ? b[i + 1] >> 7 : 0)) & 0xff; if (b[0] & 0x80) o[15] ^= 0x87; return o; };
    const L = await aesBlock(key, new Uint8Array(16));
    const K1 = shift(L), K2 = shift(K1);
    const n = Math.max(1, Math.ceil(msg.length / 16));
    const complete = msg.length > 0 && msg.length % 16 === 0;
    const last = new Uint8Array(16);
    const tail = msg.slice((n - 1) * 16);
    if (complete) tail.forEach((b, i) => { last[i] = b ^ K1[i]; });
    else { last.set(tail); last[tail.length] = 0x80; last.forEach((b, i) => { last[i] = b ^ K2[i]; }); }
    let x = new Uint8Array(16);
    for (let i = 0; i < n - 1; i++) x = await aesBlock(key, x.map((b, j) => b ^ msg[i * 16 + j]));
    return aesBlock(key, x.map((b, j) => b ^ last[j]));
  }

  // FRMPayload versleutelen/ontsleutelen (symmetrisch). dir: 0 = uplink, 1 = downlink
  async function cryptPayload(key, payload, devAddr, fcnt, dir = 0) {
    const out = new Uint8Array(payload.length);
    for (let i = 0; i * 16 < payload.length; i++) {
      const A = cat(Uint8Array.of(0x01, 0, 0, 0, 0, dir), le(devAddr, 4), le(fcnt, 4), Uint8Array.of(0, i + 1));
      const S = await aesBlock(key, A);
      for (let j = 0; j < 16 && i * 16 + j < payload.length; j++) out[i * 16 + j] = payload[i * 16 + j] ^ S[j];
    }
    return out;
  }

  async function mic(nwkSKey, msg, devAddr, fcnt, dir = 0) {
    const B0 = cat(Uint8Array.of(0x49, 0, 0, 0, 0, dir), le(devAddr, 4), le(fcnt, 4), Uint8Array.of(0, msg.length));
    return (await cmac(nwkSKey, cat(B0, msg))).slice(0, 4);
  }

  // Uplink bouwen. devAddr als hex-string (big-endian zoals in TTN getoond), sleutels als hex.
  async function buildUplink({ devAddr, fcnt, fport = 1, payload, nwkSKey, appSKey, confirmed = false, adr = true }) {
    const da = parseInt(devAddr, 16) >>> 0;
    const mhdr = confirmed ? 0x80 : 0x40;
    const fctrl = adr ? 0x80 : 0x00;
    const key = fport === 0 ? unhex(nwkSKey) : unhex(appSKey);
    const enc = await cryptPayload(key, payload, da, fcnt);
    const msg = cat(Uint8Array.of(mhdr), le(da, 4), Uint8Array.of(fctrl), le(fcnt & 0xffff, 2), Uint8Array.of(fport), enc);
    const m = await mic(unhex(nwkSKey), msg, da, fcnt);
    return { phy: cat(msg, m), parts: { mhdr, devAddr: le(da, 4), fctrl, fcnt: le(fcnt & 0xffff, 2), fport, frm: enc, mic: m } };
  }

  // PHYPayload ontleden, MIC controleren en FRMPayload ontsleutelen.
  async function decode(phy, nwkSKey, appSKey, fcntHigh = 0) {
    if (phy.length < 12) throw new Error('Te kort voor een LoRaWAN-dataframe');
    const mhdr = phy[0], mtype = mhdr >> 5;
    const types = ['Join Request', 'Join Accept', 'Unconfirmed Data Up', 'Unconfirmed Data Down', 'Confirmed Data Up', 'Confirmed Data Down', 'RFU', 'Proprietary'];
    if (![2, 3, 4, 5].includes(mtype)) return { mtype: types[mtype] };
    const dir = mtype === 3 || mtype === 5 ? 1 : 0;
    const da = (phy[1] | (phy[2] << 8) | (phy[3] << 16) | (phy[4] << 24)) >>> 0;
    const fctrl = phy[5], foptsLen = fctrl & 0x0f;
    const fcnt = (phy[6] | (phy[7] << 8)) + (fcntHigh << 16);
    const fopts = phy.slice(8, 8 + foptsLen);
    const hasPort = phy.length > 8 + foptsLen + 4;
    const fport = hasPort ? phy[8 + foptsLen] : null;
    const frm = hasPort ? phy.slice(9 + foptsLen, phy.length - 4) : new Uint8Array(0);
    const micGot = phy.slice(phy.length - 4);
    const res = { mtype: types[mtype], dir: dir ? 'downlink' : 'uplink', devAddr: da.toString(16).padStart(8, '0'),
      adr: !!(fctrl & 0x80), ack: !!(fctrl & 0x20), fcnt, fport, fopts: hex(fopts), frmEncrypted: hex(frm), mic: hex(micGot) };
    if (nwkSKey) {
      const calc = await mic(unhex(nwkSKey), phy.slice(0, phy.length - 4), da, fcnt, dir);
      res.micCalculated = hex(calc);
      res.micValid = hex(calc) === hex(micGot);
    }
    if (frm.length && (fport === 0 ? nwkSKey : appSKey)) res.payload = hex(await cryptPayload(unhex(fport === 0 ? nwkSKey : appSKey), frm, da, fcnt, dir));
    return res;
  }

  // Time on Air (Semtech AN1200.13). bw in kHz, cr 1..4 (= 4/5..4/8)
  function airtime(pl, sf, bw = 125, cr = 1, preamble = 8, crc = true, explicit = true) {
    const de = sf >= 11 && bw === 125 ? 1 : 0;
    const tsym = (2 ** sf) / (bw * 1000) * 1000;   // ms
    const tPre = (preamble + 4.25) * tsym;
    const n = 8 + Math.max(Math.ceil((8 * pl - 4 * sf + 28 + 16 * (crc ? 1 : 0) - 20 * (explicit ? 0 : 1)) / (4 * (sf - 2 * de))) * (cr + 4), 0);
    return { ms: tPre + n * tsym, symbols: n, tsym };
  }

  const api = { hex, unhex, aesBlock, cmac, cryptPayload, mic, buildUplink, decode, airtime };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LoRaWAN = api;
})(typeof window !== 'undefined' ? window : globalThis);
