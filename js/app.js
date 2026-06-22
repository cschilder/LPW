'use strict';

// ── Hulpfuncties ──────────────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getContent(protocolId, sectionId) {
  const key = `lpw_${protocolId}_${sectionId}`;
  return localStorage.getItem(key) || PROTOCOLS[protocolId].content[sectionId] || '';
}

function saveContent(protocolId, sectionId, markdown) {
  localStorage.setItem(`lpw_${protocolId}_${sectionId}`, markdown);
}

function renderMarkdown(md) {
  if (typeof marked !== 'undefined') {
    return marked.parse(md);
  }
  // Eenvoudige fallback zonder marked.js
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

function highlightCode(container) {
  if (typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(container);
  }
}

// ── Overlay (Ubuntu Start) ────────────────────────────────────
function initOverlay() {
  const btn     = document.getElementById('ubuntu-start-btn');
  const overlay = document.getElementById('ubuntu-overlay');
  const sluit   = document.getElementById('ubuntu-overlay-close');
  const grid    = document.getElementById('overlay-grid');

  if (!btn || !overlay) return;

  // Vul het raster met protocolknoppen
  Object.values(PROTOCOLS).forEach(p => {
    const item = document.createElement('a');
    item.href = `#${p.id}`;
    item.className = 'overlay-item';
    item.innerHTML = `
      <div class="overlay-icon" style="background:${p.color}22; color:${p.color}">
        ${p.icon}
      </div>
      <span>${p.name}</span>`;
    item.addEventListener('click', () => sluitOverlay());
    grid.appendChild(item);
  });

  function openOverlay() {
    overlay.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    sluit.focus();
  }

  function sluitOverlay() {
    overlay.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    btn.focus();
  }

  btn.addEventListener('click', () => {
    overlay.classList.contains('is-open') ? sluitOverlay() : openOverlay();
  });

  sluit.addEventListener('click', sluitOverlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) sluitOverlay();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) sluitOverlay();
  });
}

// ── Navigatie (mobiel) ────────────────────────────────────────
function initNavigation() {
  const openBtn  = document.getElementById('menu-btn');
  const closeBtn = document.getElementById('menu-close-btn');
  const nav      = document.getElementById('main-nav');

  if (openBtn && nav) {
    openBtn.addEventListener('click', e => {
      e.preventDefault();
      nav.classList.toggle('is-open');
    });
  }
  if (closeBtn && nav) {
    closeBtn.addEventListener('click', e => {
      e.preventDefault();
      nav.classList.remove('is-open');
    });
  }

  // Actieve link markeren bij scrollen
  const sections = document.querySelectorAll('section[id], div[id^="section-"]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 100) current = s.id;
    });
    document.querySelectorAll('.p-navigation__link').forEach(l => {
      l.classList.toggle('is-selected', l.getAttribute('href') === `#${current}`);
    });
  }, { passive: true });
}

// ── Thema ─────────────────────────────────────────────────────
function initTheme() {
  const knop = document.getElementById('theme-toggle');
  const html  = document.documentElement;
  const opgeslagen = localStorage.getItem('lpw_theme') || 'light';

  html.setAttribute('data-theme', opgeslagen);
  if (knop) knop.textContent = opgeslagen === 'dark' ? '☀ Thema' : '🌙 Thema';

  if (knop) {
    knop.addEventListener('click', e => {
      e.preventDefault();
      const huidig = html.getAttribute('data-theme');
      const nieuw  = huidig === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', nieuw);
      localStorage.setItem('lpw_theme', nieuw);
      knop.textContent = nieuw === 'dark' ? '☀ Thema' : '🌙 Thema';
    });
  }
}

// ── Tabs ──────────────────────────────────────────────────────
function initTabs() {
  document.addEventListener('click', e => {
    const tab = e.target.closest('.p-tabs__link');
    if (!tab) return;

    const tablist  = tab.closest('.p-tabs__list');
    const panels   = tab.closest('.protocol-tabs-wrapper');
    if (!tablist || !panels) return;

    // Deactiveer alle tabs
    tablist.querySelectorAll('.p-tabs__link').forEach(t => {
      t.classList.remove('is-selected');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });

    // Activeer geklikt tabblad
    tab.classList.add('is-selected');
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');

    // Wissel panelen
    const doel = tab.dataset.panel;
    panels.querySelectorAll('.tab-panel').forEach(p => {
      p.hidden = p.dataset.panel !== doel;
    });
  });
}

// ── StackEdit editor ─────────────────────────────────────────
function bewerkSectie(protocolId, sectionId) {
  if (typeof Stackedit === 'undefined') {
    alert('StackEdit laadt nog of is niet beschikbaar. Probeer het opnieuw.');
    return;
  }

  const se      = new Stackedit();
  const huidig  = getContent(protocolId, sectionId);
  const panelId = `${protocolId}-${sectionId}-content`;
  const panel   = document.getElementById(panelId);
  let saveTimer;

  se.on('fileChange', file => {
    if (panel) {
      panel.innerHTML = file.content.html || renderMarkdown(file.content.text);
      highlightCode(panel);
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveContent(protocolId, sectionId, file.content.text);
    }, 800);
  });

  se.openFile({
    name: `${PROTOCOLS[protocolId].name} — ${capitalize(sectionId)}`,
    content: { text: huidig }
  });
}

// Globaal beschikbaar maken voor inline onclick
window.bewerkSectie = bewerkSectie;

// ── Protocol-overzichtkaarten ─────────────────────────────────
function bouwProtocolGrid() {
  const grid = document.getElementById('protocol-grid');
  if (!grid) return;

  Object.values(PROTOCOLS).forEach(p => {
    const kaart = document.createElement('div');
    kaart.className = 'protocol-card';
    kaart.innerHTML = `
      <a href="#${p.id}" class="protocol-card__link" aria-label="Ga naar ${p.name}">
        <div class="protocol-card__icon" style="background:${p.color}18; border-color:${p.color}30">
          ${p.icon}
        </div>
        <div class="protocol-card__body">
          <h3 class="protocol-card__name" style="color:${p.color}">${p.name}</h3>
          <p class="protocol-card__full">${p.fullName}</p>
          <p class="protocol-card__desc">${p.shortDesc}</p>
          <div class="protocol-card__tags">
            ${p.tags.map(t => `<span class="protocol-tag">${t}</span>`).join('')}
          </div>
        </div>
      </a>`;
    grid.appendChild(kaart);
  });
}

// ── Vergelijkingstabel ────────────────────────────────────────
function bouwVergelijkingstabel() {
  const tbody = document.getElementById('comparison-tbody');
  if (!tbody) return;

  Object.values(PROTOCOLS).forEach(p => {
    const rij = document.createElement('tr');
    rij.innerHTML = `
      <td><a href="#${p.id}" style="color:${p.color}; font-weight:600">${p.name}</a></td>
      <td>${p.transport}</td>
      <td><code>${p.port}</code></td>
      <td>${p.model}</td>
      <td>${p.qos}</td>
      <td>${p.security}</td>
      <td>${p.idealFor}</td>`;
    tbody.appendChild(rij);
  });
}

// ── Protocoldetailsecties opbouwen ────────────────────────────
const SECTIES = ['beschrijving', 'werking', 'toepassingen', 'opties', 'voorbeeld'];
const SECTIE_LABELS = {
  beschrijving: 'Beschrijving',
  werking:      'Werking',
  toepassingen: 'Toepassingen',
  opties:       'Opties',
  voorbeeld:    'Voorbeeld'
};

function bouwProtocolSecties() {
  const container = document.getElementById('protocol-sections');
  if (!container) return;

  Object.values(PROTOCOLS).forEach((p, index) => {
    const section = document.createElement('section');
    section.id = p.id;
    section.className = `p-strip protocol-section ${index % 2 === 0 ? 'p-strip--light' : ''}`;
    section.setAttribute('aria-label', p.name);

    // Tab-knoppen HTML
    const tabKnoppen = SECTIES.map((s, i) => `
      <li class="p-tabs__item" role="presentation">
        <button
          class="p-tabs__link${i === 0 ? ' is-selected' : ''}"
          role="tab"
          aria-selected="${i === 0}"
          aria-controls="${p.id}-${s}"
          tabindex="${i === 0 ? '0' : '-1'}"
          data-panel="${s}"
        >${SECTIE_LABELS[s]}</button>
      </li>`).join('');

    // Tabpanelen HTML
    const tabPanelen = SECTIES.map((s, i) => {
      const inhoud = renderMarkdown(getContent(p.id, s));
      return `
        <div
          id="${p.id}-${s}"
          class="tab-panel"
          role="tabpanel"
          data-panel="${s}"
          ${i !== 0 ? 'hidden' : ''}
        >
          <div class="tab-panel__actions">
            <button
              class="p-button--link bewerk-btn"
              onclick="bewerkSectie('${p.id}', '${s}')"
              aria-label="Bewerk ${SECTIE_LABELS[s]} in StackEdit"
            >✏ Bewerken met StackEdit</button>
          </div>
          <div class="markdown-content" id="${p.id}-${s}-content">
            ${inhoud}
          </div>
        </div>`;
    }).join('');

    section.innerHTML = `
      <div class="u-fixed-width">
        <div class="protocol-header">
          <div class="protocol-header__icon" style="background:${p.color}15; border:2px solid ${p.color}25">
            ${p.icon}
          </div>
          <div class="protocol-header__info">
            <h2 class="p-heading--2" style="color:${p.color}; margin-bottom:.25rem">${p.name}</h2>
            <p class="protocol-header__full">${p.fullName}</p>
            <div class="protocol-meta">
              <span class="meta-item">📡 ${p.transport}</span>
              <span class="meta-item">🔌 Poort: ${p.port}</span>
              <span class="meta-item">📋 ${p.standard}</span>
            </div>
            <div class="protocol-card__tags" style="margin-top:.5rem">
              ${p.tags.map(t => `<span class="protocol-tag" style="border-color:${p.color}60; color:${p.color}">${t}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="protocol-tabs-wrapper">
          <div class="p-tabs">
            <ul class="p-tabs__list" role="tablist" aria-label="${p.name} secties">
              ${tabKnoppen}
            </ul>
          </div>
          ${tabPanelen}
        </div>
      </div>`;

    container.appendChild(section);

    // Prism.js syntax highlighting toepassen na invoegen
    requestAnimationFrame(() => highlightCode(section));
  });
}

// ── Smooth scroll ─────────────────────────────────────────────
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const doel = document.querySelector(link.getAttribute('href'));
    if (doel) {
      e.preventDefault();
      doel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', link.getAttribute('href'));
    }
  });
}

// ── Initialisatie ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bouwProtocolGrid();
  bouwVergelijkingstabel();
  bouwProtocolSecties();
  initOverlay();
  initNavigation();
  initTheme();
  initTabs();
  initSmoothScroll();
});
