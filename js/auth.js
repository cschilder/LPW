'use strict';

// ── FIPS 140-3 cryptografische parameters ────────────────────────
// PBKDF2-HMAC-SHA-512  (NIST SP 800-132, FIPS 180-4)
// AES-256-GCM          (NIST SP 800-38D, FIPS 197)
// Salt: 256-bit CSPRNG, IV: 96-bit CSPRNG (aanbevolen voor GCM)

const _AUTH = (() => {
  const SALT_KEY     = 'lpw_auth_salt';
  const VERIF_KEY    = 'lpw_auth_verifier';
  const SESSION_KEY  = 'lpw_auth_session';
  const SESSION_MS   = 30 * 60 * 1000;   // 30 minuten sessie
  const ITERATIONS   = 600_000;           // NIST SP 800-132 §5.3
  const HASH         = 'SHA-512';         // FIPS 180-4
  const KEY_BITS     = 256;               // AES-256, FIPS 197
  const SALT_BYTES   = 32;                // 256-bit salt
  const IV_BYTES     = 12;                // 96-bit IV (GCM aanbevolen)
  const SENTINEL     = 'LPW-FIPS-AES256GCM-OK-v1';

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function toB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function fromB64(s) {
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }

  async function deriveKey(passphrase, salt) {
    const raw = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH },
      raw,
      { name: 'AES-GCM', length: KEY_BITS },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function setup(passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv   = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key  = await deriveKey(passphrase, salt);
    const ct   = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode(SENTINEL)
    );
    localStorage.setItem(SALT_KEY, toB64(salt));
    localStorage.setItem(VERIF_KEY, toB64(new Uint8Array([...iv, ...new Uint8Array(ct)])));
  }

  async function verify(passphrase) {
    const saltB64 = localStorage.getItem(SALT_KEY);
    const verifB64 = localStorage.getItem(VERIF_KEY);
    if (!saltB64 || !verifB64) return false;
    const salt     = fromB64(saltB64);
    const combined = fromB64(verifB64);
    const iv       = combined.slice(0, IV_BYTES);
    const ct       = combined.slice(IV_BYTES);
    try {
      const key   = await deriveKey(passphrase, salt);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      return dec.decode(plain) === SENTINEL;
    } catch { return false; }
  }

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
    return !!(localStorage.getItem(SALT_KEY) && localStorage.getItem(VERIF_KEY));
  }
  function reset() {
    localStorage.removeItem(SALT_KEY);
    localStorage.removeItem(VERIF_KEY);
    clearSession();
  }

  return { setup, verify, sessionValid, startSession, clearSession, isConfigured, reset };
})();

// ── Modal stijlen injecteren ─────────────────────────────────────
(function injectStyles() {
  const el = document.createElement('style');
  el.id = 'auth-styles';
  el.textContent = `
.auth-backdrop {
  position: fixed; inset: 0;
  background: rgba(44,0,30,.88);
  backdrop-filter: blur(10px);
  z-index: 4000;
  display: flex; align-items: center; justify-content: center;
  animation: auth-fade-in .2s ease;
}
@keyframes auth-fade-in { from { opacity:0; } to { opacity:1; } }

.auth-box {
  background: #141420;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px;
  padding: 2rem 2.25rem 1.75rem;
  width: min(440px, 92vw);
  box-shadow: 0 24px 64px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset;
  color: #e5e5e5;
  font-family: 'Ubuntu', sans-serif;
  animation: auth-slide-up .22s ease;
}
@keyframes auth-slide-up { from { transform:translateY(16px); opacity:0; } to { transform:none; opacity:1; } }

.auth-icon { font-size: 2.6rem; text-align: center; margin-bottom: .4rem; }

.auth-title {
  font-size: 1.15rem; font-weight: 500; color: #fff;
  text-align: center; margin: 0 0 .3rem;
}

.auth-subtitle {
  font-size: .7rem; color: #888; text-align: center;
  font-family: 'Ubuntu Mono', monospace; margin: 0 0 .6rem;
  letter-spacing: .03em;
}

.auth-fips-row {
  display: flex; justify-content: center; gap: .5rem;
  flex-wrap: wrap; margin-bottom: .3rem;
}
.auth-badge {
  display: inline-block;
  font-size: .62rem; font-family: 'Ubuntu Mono', monospace;
  padding: .18rem .55rem; border-radius: 100px;
  letter-spacing: .06em; font-weight: 700;
}
.auth-badge--fips {
  background: rgba(0,102,204,.2); color: #60a5fa;
  border: 1px solid rgba(96,165,250,.35);
}
.auth-badge--algo {
  background: rgba(5,150,105,.15); color: #34d399;
  border: 1px solid rgba(52,211,153,.3);
}

.auth-algo-detail {
  font-size: .63rem; color: #666; text-align: center;
  font-family: 'Ubuntu Mono', monospace;
  line-height: 1.6; margin: 0 0 1.4rem;
}

.auth-label {
  font-size: .8rem; color: #aaa; display: block;
  margin-bottom: .35rem;
}

.auth-input {
  width: 100%; box-sizing: border-box;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 9px;
  padding: .65rem 1rem;
  color: #fff; font-size: .95rem;
  font-family: 'Ubuntu', sans-serif;
  margin-bottom: .85rem;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.auth-input:focus {
  border-color: #E95420;
  box-shadow: 0 0 0 3px rgba(233,84,32,.18);
}
.auth-input::placeholder { color: #555; }

.auth-error {
  background: rgba(220,38,38,.18);
  border: 1px solid rgba(220,38,38,.35);
  border-radius: 8px;
  color: #fca5a5; font-size: .82rem;
  padding: .55rem .85rem;
  margin-bottom: .85rem;
  display: flex; align-items: center; gap: .5rem;
}

.auth-spinner {
  text-align: center; color: #888;
  font-size: .82rem; font-family: 'Ubuntu Mono', monospace;
  margin-bottom: .85rem; padding: .5rem 0;
  animation: auth-pulse 1.4s ease-in-out infinite;
}
@keyframes auth-pulse { 0%,100%{ opacity:.45; } 50%{ opacity:1; } }

.auth-btn-primary {
  width: 100%; background: #E95420; color: #fff;
  border: none; border-radius: 9px;
  padding: .7rem; font-size: .95rem;
  font-family: 'Ubuntu', sans-serif; font-weight: 500;
  cursor: pointer; transition: background .15s, transform .1s;
  margin-bottom: .5rem;
}
.auth-btn-primary:hover:not(:disabled) { background: #d44016; }
.auth-btn-primary:active:not(:disabled) { transform: scale(.98); }
.auth-btn-primary:disabled { background: #3a3a3a; color: #666; cursor: not-allowed; }

.auth-btn-cancel {
  width: 100%; background: none; color: #888;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 9px; padding: .6rem;
  font-size: .85rem; font-family: 'Ubuntu', sans-serif;
  cursor: pointer; transition: background .15s, color .15s;
}
.auth-btn-cancel:hover { background: rgba(255,255,255,.05); color: #ccc; }

.auth-divider {
  border: none; border-top: 1px solid rgba(255,255,255,.07);
  margin: 1rem 0 .75rem;
}

.auth-session-info {
  text-align: center; font-size: .68rem; color: #555;
  font-family: 'Ubuntu Mono', monospace;
}

.auth-reset-link {
  display: block; text-align: center;
  font-size: .7rem; color: #555;
  cursor: pointer; margin-top: .4rem;
  text-decoration: underline; text-underline-offset: 2px;
  background: none; border: none; font-family: 'Ubuntu', sans-serif;
}
.auth-reset-link:hover { color: #E95420; }

/* Slot-indicator op bewerk-knoppen */
.bewerk-btn::before {
  content: '🔒 ';
  font-size: .75em;
}
.auth-unlocked .bewerk-btn::before {
  content: '🔓 ';
}
`;
  document.head.appendChild(el);
})();

// ── Modal weergeven ─────────────────────────────────────────────
function toonAuthModal(opSucces) {
  const setup  = !_AUTH.isConfigured();
  const backdrop = document.createElement('div');
  backdrop.className = 'auth-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Beveiliging');

  backdrop.innerHTML = `
    <div class="auth-box">
      <div class="auth-icon">🔐</div>
      <h3 class="auth-title">${setup ? 'Stel beveiliging in' : 'Beveiliging vereist'}</h3>
      <p class="auth-subtitle">StackEdit-editor is beveiligd</p>

      <div class="auth-fips-row">
        <span class="auth-badge auth-badge--fips">FIPS 140-3</span>
        <span class="auth-badge auth-badge--algo">AES-256-GCM</span>
        <span class="auth-badge auth-badge--algo">PBKDF2-SHA-512</span>
      </div>
      <p class="auth-algo-detail">
        600.000 iteraties · 256-bit salt · 96-bit IV<br>
        NIST SP 800-132 · SP 800-38D · FIPS 197
      </p>

      <div id="auth-form-area">
        ${setup ? '<label class="auth-label">Kies een wachtwoord</label>' : '<label class="auth-label">Wachtwoord</label>'}
        <input type="password" id="auth-pw" class="auth-input"
               placeholder="${setup ? 'Nieuw wachtwoord...' : 'Voer wachtwoord in...'}"
               autocomplete="${setup ? 'new-password' : 'current-password'}"
               spellcheck="false"/>
        ${setup ? `<label class="auth-label">Bevestig wachtwoord</label>
        <input type="password" id="auth-pw2" class="auth-input"
               placeholder="Herhaal wachtwoord..." autocomplete="new-password" spellcheck="false"/>` : ''}
        <div id="auth-err" class="auth-error" style="display:none">
          <span>⚠</span><span id="auth-err-msg"></span>
        </div>
        <div id="auth-spin" class="auth-spinner" style="display:none">
          ⏳ Sleutel afleiden (PBKDF2 × 600.000)…
        </div>
        <button id="auth-ok" class="auth-btn-primary">
          ${setup ? 'Wachtwoord instellen' : 'Ontgrendelen'}
        </button>
        <button id="auth-cancel" class="auth-btn-cancel">Annuleren</button>
      </div>

      <hr class="auth-divider">
      <p class="auth-session-info">Sessie geldig voor 30 minuten na ontgrendeling</p>
      ${!setup ? `<button class="auth-reset-link" id="auth-reset">
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
    pwInput.focus();
  }

  function setBusy(ja) {
    okBtn.disabled = ja;
    if (pwInput) pwInput.disabled = ja;
    if (pw2Input) pw2Input.disabled = ja;
    spinner.style.display = ja ? 'block' : 'none';
    errDiv.style.display = 'none';
  }

  function sluit() {
    backdrop.remove();
    updateSlotIcoon();
  }

  async function verwerk() {
    const pw = pwInput.value;
    if (!pw) { toonFout('Voer een wachtwoord in.'); return; }

    if (setup) {
      const pw2 = pw2Input.value;
      if (pw !== pw2) { toonFout('Wachtwoorden komen niet overeen.'); return; }
      if (pw.length < 8) { toonFout('Gebruik minimaal 8 tekens.'); return; }
      setBusy(true);
      await _AUTH.setup(pw);
      _AUTH.startSession();
      sluit();
      opSucces();
    } else {
      setBusy(true);
      const ok = await _AUTH.verify(pw);
      setBusy(false);
      if (ok) {
        _AUTH.startSession();
        sluit();
        opSucces();
      } else {
        toonFout('Onjuist wachtwoord. Probeer opnieuw.');
      }
    }
  }

  okBtn.addEventListener('click', verwerk);
  cancelBtn.addEventListener('click', sluit);

  backdrop.addEventListener('keydown', e => {
    if (e.key === 'Enter') verwerk();
    if (e.key === 'Escape') sluit();
  });

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) sluit();
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Weet u zeker dat u de beveiliging wilt resetten?\n\n' +
                  'Het huidige wachtwoord wordt gewist en u moet een nieuw wachtwoord instellen.')) {
        _AUTH.reset();
        sluit();
        toonAuthModal(opSucces);
      }
    });
  }

  // Focus eerste invoerveld
  setTimeout(() => pwInput && pwInput.focus(), 60);
}

// ── Slot-icoon op de body bijwerken ──────────────────────────────
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
