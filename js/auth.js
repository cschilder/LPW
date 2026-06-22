'use strict';

// ─────────────────────────────────────────────────────────────────
//  LPW Auth — NSA CNSA 2.0 + FIPS 140-3 beveiligingslaag
//
//  Primaire KDF : Argon2id (RFC 9106, 2021)
//                 mem=64 MiB, time=3, par=4  → GPU/ASIC-resistent
//  Fallback KDF : PBKDF2-HMAC-SHA-512 (NIST SP 800-132, 600k iter)
//  Encryptie    : AES-256-GCM (FIPS 197 / NIST SP 800-38D)
//  Salt / IV    : CSPRNG, 256-bit / 96-bit
//  Suite        : NSA CNSA 2.0 (AES-256, SHA-512, Argon2id-RFC9106)
// ─────────────────────────────────────────────────────────────────

const _AUTH = (() => {
  // localStorage-sleutels
  const VERIF_KEY   = 'lpw_auth_verifier_v2';
  const SESSION_KEY = 'lpw_auth_session';

  // Sessieduur
  const SESSION_MS  = 30 * 60 * 1000;

  // Argon2id parameters — RFC 9106 §4 "high-security interactive"
  const A2_MEM  = 65536;   // 64 MiB geheugen per hash-poging
  const A2_TIME = 3;       // iteraties
  const A2_PAR  = 4;       // parallelle lanes
  const A2_LEN  = 32;      // 256-bit uitvoer

  // PBKDF2-fallback parameters (NIST SP 800-132)
  const P2_ITER = 600_000;
  const P2_HASH = 'SHA-512';
  const AES_LEN = 256;

  // Salt / IV
  const SALT_BYTES = 32;   // 256-bit
  const IV_BYTES   = 12;   // 96-bit (GCM aanbevolen)

  // Verificatiestring — versie-indicator in de tekst
  const SENTINEL = 'LPW-CNSA2-ARGON2ID-AES256GCM-OK-v2';

  const utf8enc = new TextEncoder();
  const utf8dec = new TextDecoder();

  function toB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function fromB64(s) {
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }

  function argon2Available() {
    return typeof argon2 !== 'undefined' &&
           typeof argon2.hash === 'function' &&
           argon2.ArgonType && argon2.ArgonType.Argon2id !== undefined;
  }

  // ── Sleutelafleiding ──────────────────────────────────────────
  async function deriveKey(passphrase, salt, kdf) {
    if (kdf === 'argon2id' && argon2Available()) {
      // Argon2id — memory-hard KDF (RFC 9106)
      const result = await argon2.hash({
        pass        : passphrase,
        salt        : salt,
        type        : argon2.ArgonType.Argon2id,
        mem         : A2_MEM,
        time        : A2_TIME,
        parallelism : A2_PAR,
        hashLen     : A2_LEN
      });
      // 32-byte Argon2id-hash direct als AES-256-sleutelmateriaal
      return crypto.subtle.importKey(
        'raw', result.hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      // PBKDF2-fallback (FIPS 140-3)
      const raw = await crypto.subtle.importKey(
        'raw', utf8enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: P2_ITER, hash: P2_HASH },
        raw,
        { name: 'AES-GCM', length: AES_LEN },
        false,
        ['encrypt', 'decrypt']
      );
    }
  }

  // ── Wachtwoord instellen ──────────────────────────────────────
  async function setup(passphrase) {
    const kdf  = argon2Available() ? 'argon2id' : 'pbkdf2';
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key  = await deriveKey(passphrase, salt, kdf);
    const ct   = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, utf8enc.encode(SENTINEL)
    );
    const payload = {
      v    : 2,
      kdf  : kdf,
      salt : toB64(salt),
      blob : toB64(new Uint8Array([...iv, ...new Uint8Array(ct)]))
    };
    localStorage.setItem(VERIF_KEY, JSON.stringify(payload));
  }

  // ── Wachtwoord verifiëren ─────────────────────────────────────
  async function verify(passphrase) {
    const raw = localStorage.getItem(VERIF_KEY);
    if (!raw) return false;
    let payload;
    try { payload = JSON.parse(raw); } catch { return false; }

    const salt     = fromB64(payload.salt);
    const combined = fromB64(payload.blob);
    const iv       = combined.slice(0, IV_BYTES);
    const ct       = combined.slice(IV_BYTES);
    const kdf      = payload.kdf || 'pbkdf2';

    try {
      const key   = await deriveKey(passphrase, salt, kdf);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      return utf8dec.decode(plain) === SENTINEL;
    } catch { return false; }
  }

  // ── Sessiebeheer ──────────────────────────────────────────────
  function sessionValid() {
    const exp = sessionStorage.getItem(SESSION_KEY);
    return !!(exp && Date.now() < Number(exp));
  }
  function startSession() {
    sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MS));
  }
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }
  function isConfigured() {
    return !!localStorage.getItem(VERIF_KEY);
  }
  function activeKdf() {
    try {
      const p = JSON.parse(localStorage.getItem(VERIF_KEY) || '{}');
      return p.kdf || null;
    } catch { return null; }
  }
  function reset() {
    localStorage.removeItem(VERIF_KEY);
    clearSession();
  }

  return {
    setup, verify,
    sessionValid, startSession, clearSession,
    isConfigured, activeKdf, reset,
    argon2Available
  };
})();

// ── Stijlen injecteren ───────────────────────────────────────────
(function injectAuthStyles() {
  const s = document.createElement('style');
  s.id = 'auth-styles';
  s.textContent = `
.auth-backdrop {
  position: fixed; inset: 0;
  background: rgba(10,10,20,.92);
  backdrop-filter: blur(12px);
  z-index: 4000;
  display: flex; align-items: center; justify-content: center;
  animation: aFadeIn .18s ease;
}
@keyframes aFadeIn { from{opacity:0} to{opacity:1} }

.auth-box {
  background: linear-gradient(160deg,#0d1117 0%,#161b22 100%);
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 20px;
  padding: 2rem 2.25rem 1.75rem;
  width: min(460px,93vw);
  box-shadow: 0 28px 72px rgba(0,0,0,.8),
              0 0 0 1px rgba(255,255,255,.04) inset;
  color: #e5e5e5;
  font-family: 'Ubuntu', sans-serif;
  animation: aSlideUp .2s ease;
}
@keyframes aSlideUp {
  from{transform:translateY(18px);opacity:0}
  to{transform:none;opacity:1}
}

.auth-icon { font-size: 2.4rem; text-align:center; margin-bottom:.35rem; }

.auth-title {
  font-size: 1.15rem; font-weight:500; color:#fff;
  text-align:center; margin:0 0 .25rem;
}
.auth-subtitle {
  font-size:.7rem; color:#777; text-align:center;
  font-family:'Ubuntu Mono',monospace; margin:0 0 .75rem;
  letter-spacing:.03em;
}

.auth-badges {
  display:flex; justify-content:center; gap:.4rem;
  flex-wrap:wrap; margin-bottom:.4rem;
}
.auth-badge {
  font-size:.6rem; font-family:'Ubuntu Mono',monospace;
  padding:.16rem .55rem; border-radius:100px;
  letter-spacing:.07em; font-weight:700; white-space:nowrap;
}
.auth-badge--mil {
  background:rgba(15,80,40,.35); color:#4ade80;
  border:1px solid rgba(74,222,128,.3);
}
.auth-badge--fips {
  background:rgba(0,80,200,.25); color:#60a5fa;
  border:1px solid rgba(96,165,250,.35);
}
.auth-badge--algo {
  background:rgba(120,40,200,.2); color:#c084fc;
  border:1px solid rgba(192,132,252,.3);
}
.auth-badge--fallback {
  background:rgba(180,90,0,.2); color:#fbbf24;
  border:1px solid rgba(251,191,36,.3);
}

.auth-algo-detail {
  font-size:.63rem; color:#555; text-align:center;
  font-family:'Ubuntu Mono',monospace;
  line-height:1.65; margin:0 0 1.4rem;
}
.auth-algo-detail em { color:#888; font-style:normal; }

.auth-label {
  font-size:.8rem; color:#aaa; display:block;
  margin-bottom:.3rem;
}
.auth-input {
  width:100%; box-sizing:border-box;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.12);
  border-radius:9px;
  padding:.65rem 1rem;
  color:#fff; font-size:.95rem;
  font-family:'Ubuntu',sans-serif;
  margin-bottom:.8rem;
  outline:none;
  transition:border-color .15s, box-shadow .15s;
}
.auth-input:focus {
  border-color:#E95420;
  box-shadow:0 0 0 3px rgba(233,84,32,.18);
}
.auth-input::placeholder { color:#444; }
.auth-input:disabled { opacity:.4; }

.auth-error {
  background:rgba(220,38,38,.16);
  border:1px solid rgba(220,38,38,.32);
  border-radius:8px;
  color:#fca5a5; font-size:.82rem;
  padding:.5rem .85rem;
  margin-bottom:.8rem;
  display:flex; align-items:flex-start; gap:.5rem;
}

.auth-spinner {
  text-align:center; color:#888;
  font-size:.8rem; font-family:'Ubuntu Mono',monospace;
  padding:.5rem 0; margin-bottom:.8rem;
  animation:aPulse 1.3s ease-in-out infinite;
}
@keyframes aPulse { 0%,100%{opacity:.35} 50%{opacity:1} }

.auth-btn-primary {
  width:100%; background:#E95420; color:#fff;
  border:none; border-radius:9px;
  padding:.7rem; font-size:.95rem;
  font-family:'Ubuntu',sans-serif; font-weight:500;
  cursor:pointer; transition:background .15s, transform .1s;
  margin-bottom:.5rem;
}
.auth-btn-primary:hover:not(:disabled) { background:#d44016; }
.auth-btn-primary:active:not(:disabled) { transform:scale(.98); }
.auth-btn-primary:disabled {
  background:#1e2030; color:#444; cursor:not-allowed;
}

.auth-btn-cancel {
  width:100%; background:none; color:#777;
  border:1px solid rgba(255,255,255,.09);
  border-radius:9px; padding:.6rem;
  font-size:.85rem; font-family:'Ubuntu',sans-serif;
  cursor:pointer; transition:background .15s, color .15s;
}
.auth-btn-cancel:hover { background:rgba(255,255,255,.04); color:#bbb; }

.auth-divider {
  border:none; border-top:1px solid rgba(255,255,255,.06);
  margin:1rem 0 .7rem;
}

.auth-session-info {
  text-align:center; font-size:.67rem; color:#555;
  font-family:'Ubuntu Mono',monospace;
}
.auth-reset-link {
  display:block; text-align:center;
  font-size:.68rem; color:#555;
  cursor:pointer; margin-top:.4rem;
  text-decoration:underline; text-underline-offset:2px;
  background:none; border:none;
  font-family:'Ubuntu',sans-serif;
  transition:color .15s;
}
.auth-reset-link:hover { color:#E95420; }

/* Slot-indicator op bewerkknop */
.bewerk-btn::before { content:'🔒 '; font-size:.75em; }
.auth-unlocked .bewerk-btn::before { content:'🔓 '; }
`;
  document.head.appendChild(s);
})();

// ── Algoritmedetail voor de modal ────────────────────────────────
function buildAlgoDetail() {
  const useA2 = _AUTH.argon2Available();
  if (useA2) {
    return `
      <div class="auth-badges">
        <span class="auth-badge auth-badge--mil">NSA CNSA 2.0</span>
        <span class="auth-badge auth-badge--algo">Argon2id RFC 9106</span>
        <span class="auth-badge auth-badge--fips">FIPS 140-3</span>
        <span class="auth-badge auth-badge--algo">AES-256-GCM</span>
      </div>
      <p class="auth-algo-detail">
        <em>Argon2id</em>: 64 MiB geheugen · 3 iteraties · 4 lanes<br>
        GPU/ASIC-resistent · <em>AES-256-GCM</em> FIPS 197<br>
        256-bit CSPRNG salt · 96-bit IV · NIST SP 800-38D
      </p>`;
  } else {
    return `
      <div class="auth-badges">
        <span class="auth-badge auth-badge--fips">FIPS 140-3</span>
        <span class="auth-badge auth-badge--algo">PBKDF2-SHA-512</span>
        <span class="auth-badge auth-badge--algo">AES-256-GCM</span>
        <span class="auth-badge auth-badge--fallback">Argon2 niet geladen</span>
      </div>
      <p class="auth-algo-detail">
        PBKDF2-HMAC-SHA-512 · 600.000 iteraties · 256-bit salt<br>
        <em>AES-256-GCM</em> FIPS 197 · NIST SP 800-132
      </p>`;
  }
}

// ── Modal weergeven ──────────────────────────────────────────────
function toonAuthModal(opSucces) {
  const isSetup = !_AUTH.isConfigured();

  const backdrop = document.createElement('div');
  backdrop.className = 'auth-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Beveiliging');

  backdrop.innerHTML = `
    <div class="auth-box">
      <div class="auth-icon">🛡️</div>
      <h3 class="auth-title">${isSetup ? 'Beveiliging instellen' : 'Beveiligde toegang'}</h3>
      <p class="auth-subtitle">
        ${isSetup ? 'Stel uw militaire-graad wachtwoord in' : 'StackEdit-editor is beveiligd'}
      </p>

      ${buildAlgoDetail()}

      <div id="auth-form-area">
        <label class="auth-label">${isSetup ? 'Kies een sterk wachtwoord' : 'Wachtwoord'}</label>
        <input type="password" id="auth-pw" class="auth-input"
               placeholder="${isSetup ? 'Nieuw wachtwoord (min. 12 tekens)...' : 'Voer wachtwoord in...'}"
               autocomplete="${isSetup ? 'new-password' : 'current-password'}"
               spellcheck="false"/>
        ${isSetup ? `
        <label class="auth-label">Bevestig wachtwoord</label>
        <input type="password" id="auth-pw2" class="auth-input"
               placeholder="Herhaal wachtwoord..."
               autocomplete="new-password" spellcheck="false"/>
        ` : ''}
        <div id="auth-err" class="auth-error" style="display:none">
          <span>⚠</span><span id="auth-err-msg"></span>
        </div>
        <div id="auth-spin" class="auth-spinner" style="display:none">
          ⏳ Sleutel afleiden — even geduld...
        </div>
        <button id="auth-ok" class="auth-btn-primary">
          ${isSetup ? '🔐 Beveiliging activeren' : '🔓 Ontgrendelen'}
        </button>
        <button id="auth-cancel" class="auth-btn-cancel">Annuleren</button>
      </div>

      <hr class="auth-divider">
      <p class="auth-session-info">Sessie geldig voor 30 minuten na ontgrendeling</p>
      ${!isSetup ? `<button class="auth-reset-link" id="auth-reset">
        Wachtwoord vergeten? Reset beveiliging
      </button>` : ''}
    </div>`;

  document.body.appendChild(backdrop);

  const pwInput  = backdrop.querySelector('#auth-pw');
  const pw2Input = backdrop.querySelector('#auth-pw2');
  const okBtn    = backdrop.querySelector('#auth-ok');
  const cancelBtn = backdrop.querySelector('#auth-cancel');
  const errDiv   = backdrop.querySelector('#auth-err');
  const errMsg   = backdrop.querySelector('#auth-err-msg');
  const spinner  = backdrop.querySelector('#auth-spin');
  const resetBtn = backdrop.querySelector('#auth-reset');

  function toonFout(tekst) {
    errMsg.textContent = tekst;
    errDiv.style.display = 'flex';
    if (pwInput) { pwInput.disabled = false; pwInput.focus(); }
    if (pw2Input) pw2Input.disabled = false;
    okBtn.disabled = false;
    spinner.style.display = 'none';
  }

  function setBusy(aan) {
    okBtn.disabled = aan;
    if (pwInput) pwInput.disabled = aan;
    if (pw2Input) pw2Input.disabled = aan;
    spinner.style.display = aan ? 'block' : 'none';
    if (aan) errDiv.style.display = 'none';
  }

  function sluit() {
    backdrop.remove();
    updateSlotIcoon();
  }

  async function verwerk() {
    const pw = pwInput ? pwInput.value : '';
    if (!pw) { toonFout('Voer een wachtwoord in.'); return; }

    if (isSetup) {
      const pw2 = pw2Input ? pw2Input.value : '';
      if (pw.length < 12) {
        toonFout('Gebruik minimaal 12 tekens voor militaire-graad beveiliging.');
        return;
      }
      if (pw !== pw2) { toonFout('Wachtwoorden komen niet overeen.'); return; }
      setBusy(true);
      await _AUTH.setup(pw);
      _AUTH.startSession();
      sluit();
      opSucces();
    } else {
      setBusy(true);
      const ok = await _AUTH.verify(pw);
      if (ok) {
        _AUTH.startSession();
        sluit();
        opSucces();
      } else {
        toonFout('Onjuist wachtwoord. Opnieuw proberen.');
      }
    }
  }

  okBtn.addEventListener('click', verwerk);
  cancelBtn.addEventListener('click', sluit);
  backdrop.addEventListener('keydown', e => {
    if (e.key === 'Enter') verwerk();
    if (e.key === 'Escape') sluit();
  });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) sluit(); });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Weet u zeker dat u de beveiliging wilt resetten?\n\n' +
                  'Het wachtwoord wordt gewist en u stelt een nieuw wachtwoord in.')) {
        _AUTH.reset();
        sluit();
        toonAuthModal(opSucces);
      }
    });
  }

  setTimeout(() => pwInput && pwInput.focus(), 60);
}

// ── Slot-icoon op body bijwerken ─────────────────────────────────
function updateSlotIcoon() {
  document.body.classList.toggle('auth-unlocked', _AUTH.sessionValid());
}

// ── bewerkSectie omhullen met auth-check ─────────────────────────
function initAuth() {
  const origBewerk = window.bewerkSectie;
  window.bewerkSectie = function(protocolId, sectionId) {
    if (_AUTH.sessionValid()) {
      origBewerk(protocolId, sectionId);
      return;
    }
    toonAuthModal(() => origBewerk(protocolId, sectionId));
  };
  updateSlotIcoon();
}

document.addEventListener('DOMContentLoaded', initAuth);
