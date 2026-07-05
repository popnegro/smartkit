const SmartKitShared = (() => {
  // ==========================================================================
  // 1. Constants & Configuration
  // ==========================================================================

  const DURATIONS = [
    {v:'1s', l:'1 semana', mult:1, days:7},
    {v:'2s', l:'2 semanas', mult:1.8, days:14},
    {v:'1m', l:'1 mes', mult:3.2, days:30},
    {v:'3m', l:'3 meses', mult:8, days:90}
  ];
  const DASHBOARD_STORAGE_KEY = 'smartkit-dashboard-state'; // Usado en dashboard.js
  const PUBLIC_KITS_STORAGE_KEY = 'smartkit-public-kits';

  const DEFAULT_BRAND = {
    name: 'SmartKit',
    logo: 'SK',
    whatsapp: '',
    heroCopy: 'Planifica campañas DOOH, selecciona ubicaciones digitales y genera una reserva comercial en minutos.',
    terms: 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas. Valores expresados en ARS.',
    validity: '15 días'
  };

  const TIPO_COL={
    Peatonal:'#0891b2',
    Vehicular:'#b45309',
    Mixto:'#4f46e5',
    Indoor: '#16a34a'
  };

  // ==========================================================================
  // 2. Core Utility Functions
  // ==========================================================================

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function impNum(screen) {
    return parseInt(String(screen.imp || screen || '0').replace(/\./g, ''), 10) || 0;
  }

  function formatMoney(value) {
    return '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
  }

  function kitSlug(value){
    return String(value || 'media-kit').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function safeAssetUrl(value) {
    const url = String(value || '');
    return /^(assets\/|\.\/assets\/|https:\/\/)/.test(url) ? url : '';
  }

  function safeBackground(value) {
    const bg = String(value || '');
    return bg.startsWith('linear-gradient(') ? bg : '';
  }

  // ==========================================================================
  // 3. Business Logic: Media Kits
  // ==========================================================================

  function screenSnapshot(screen, duration = { mult: 1 }) {
    return {
      id: screen.id,
      name: screen.n,
      zone: screen.b,
      address: screen.dir,
      type: screen.tipo,
      format: screen.dim,
      resolution: screen.res,
      impactsDay: screen.imp,
      priceWeek: screen.precio,
      subtotal: Math.round(screen.precio * duration.mult),
      video: screen.video || '',
      gradient: screen.g || '',
      initials: screen.e || ''
    };
  }

  /**
   * Recursively sorts object keys to create a canonical string representation
   * for consistent hashing, excluding the digitalSignature field itself.
   */
  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
      return Object.keys(value).sort().reduce((acc, key) => {
        if (key !== 'digitalSignature') acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
    }
    return value;
  }

  // --- Cryptography Helpers for Digital Signature ---

  async function sha256Hex(message) {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return '';
    const data = new TextEncoder().encode(message);
    const digest = await subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function hmacHex(message, secret) {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return '';
    const key = await subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await subtle.sign('HMAC', key, new TextEncoder().encode(message));
    return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function signMediaKit(kit, options = {}) {
    if (!globalThis.crypto?.subtle) return null;
    const signer = options.signer || window.CONFIG?.signature?.signer || kit.brand?.name || DEFAULT_BRAND.name;
    const payload = JSON.stringify(canonicalize(kit));
    const secret = options.secret || signer;
    return {
      algorithm: 'HMAC-SHA-256',
      signer,
      hash: await sha256Hex(payload),
      value: await hmacHex(payload, secret),
      signedAt: new Date().toISOString()
    };
  }

  async function verifyMediaKitSignature(kit, options = {}) {
    const signature = kit?.digitalSignature;
    if (!signature?.value || !globalThis.crypto?.subtle) return { state: 'unsigned' };
    const signer = signature.signer || options.signer || window.CONFIG?.signature?.signer || kit.brand?.name || DEFAULT_BRAND.name;
    const payload = JSON.stringify(canonicalize(kit));
    const secret = options.secret || signer;
    const hash = await sha256Hex(payload);
    const value = await hmacHex(payload, secret);
    return {
      ...signature,
      signer,
      hash,
      state: hash === signature.hash && value === signature.value ? 'valid' : 'invalid'
    };
  }

  async function buildMediaKit(quote, brand, config, status = 'Borrador') {
    if (!quote || !quote.screens.length) return null;

    const createdAt = new Date();
    const validityDays = parseInt(brand.validity) || 15;
    const validUntil = new Date(createdAt);
    validUntil.setDate(validUntil.getDate() + validityDays);
    const signatureConfig = config.signature || {};

    const client = `Propuesta ${brand.name}`;
    const kit = {
      id: `kit-${kitSlug(client)}-${createdAt.getTime()}`,
      client,
      contact: 'Equipo comercial',
      duration: quote.duration.l,
      durationValue: quote.duration.v,
      days: quote.duration.days,
      screenIds: quote.screens.map(s => s.id),
      screenSnapshots: quote.screens.map(s => screenSnapshot(s, quote.duration)),
      screens: quote.screens.length,
      total: quote.total,
      impacts: quote.impacts,
      cpm: quote.impacts ? Math.round(quote.total / quote.impacts * 1000) : 0,
      status,
      createdAt: createdAt.toISOString(),
      validUntil: validUntil.toISOString().slice(0, 10),
      terms: brand.terms || DEFAULT_BRAND.terms,
      validity: brand.validity || DEFAULT_BRAND.validity,
      brand: { name: brand.name, logo: brand.logo, whatsapp: brand.whatsapp }
    };

    kit.digitalSignature = await signMediaKit(kit, {
      signer: signatureConfig.signer || brand.name,
      secret: signatureConfig.secret || ''
    });
    return kit;
  }

  // ==========================================================================
  // 4. UI & DOM Helpers
  // ==========================================================================

  function showToast(message) {
    const toast = document.getElementById('toast') || document.createElement('div');
    if (!toast.id) { toast.id = 'toast'; document.body.appendChild(toast); }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function applyBrandHeader(brand = DEFAULT_BRAND) {
    const logo = document.getElementById('brand-logo');
    const name = document.getElementById('brand-name');
    if (logo) logo.textContent = brand.logo || DEFAULT_BRAND.logo;
    if (name) name.textContent = brand.name || DEFAULT_BRAND.name;
  }

  function mediaHtml(screen, className = 'media', options = {}) {
    const h = escapeHtml;
    const videoUrl = safeAssetUrl(screen.video);
    const background = safeBackground(screen.gradient || screen.g) || 'linear-gradient(135deg,#075985,#0f766e)';
    const initials = screen.initials || screen.e || '';
    const label = screen.name || screen.n || 'pantalla';
    const video = videoUrl
      ? `<video src="${h(videoUrl)}" autoplay muted loop playsinline preload="${options.preload || 'metadata'}" aria-label="Video de ${h(label)}" onerror="this.hidden=true"></video>`
      : '';
    return `<div class="${h(className)} video-head" style="background:${h(background)}"><span class="media-fallback" aria-hidden="true">${h(initials)}</span>${video}</div>`;
  }

  async function renderMediaKitPage(kit) {
    const app = document.getElementById('app');
    if (!app) return;

    const h = escapeHtml;
    const fmt = formatMoney;
    const brand = kit.brand || DEFAULT_BRAND;
    const signature = await verifyMediaKitSignature(kit, window.CONFIG?.signature);

    document.title = `${brand.name} - Propuesta para ${kit.client}`;
    applyBrandHeader(brand);

    const signatureStates = {
      valid: { text: 'Propuesta Verificada', class: 'badge-success' },
      invalid: { text: 'Propuesta Alterada', class: 'badge-danger' },
      unsigned: { text: 'Propuesta no firmada', class: 'badge-warning' }
    };
    const sigState = signatureStates[signature.state] || signatureStates.unsigned;

    app.innerHTML = `
      <div class="mk-header">
        <div>
          <span class="eyebrow">Propuesta comercial para</span>
          <h1>${h(kit.client)}</h1>
          <p class="muted">
            Válida hasta el ${h(kit.validUntil)} · 
            <span class="badge ${sigState.class}">${sigState.text}</span>
          </p>
        </div>
        <div class="mk-actions">
          <button class="btn" onclick="window.print()">Guardar PDF</button>
          <a href="https://wa.me/${h(brand.whatsapp || '')}" class="btn primary" target="_blank" rel="noopener">Contactar por WhatsApp</a>
        </div>
      </div>

      <div class="mk-kpis">
        <div class="kpi"><b>${kit.screens}</b><span>Pantallas</span></div>
        <div class="kpi"><b>${Math.round(kit.impacts / 1000).toLocaleString('es-AR')}k</b><span>Impactos</span></div>
        <div class="kpi"><b>${fmt(kit.total)}</b><span>Inversión (${h(kit.duration)})</span></div>
        <div class="kpi"><b>${fmt(kit.cpm)}</b><span>CPM Promedio</span></div>
      </div>

      <div class="mk-grid">
        <div class="mk-screen-list">
          ${kit.screenSnapshots.map(s => `
            <div class="mk-screen-card">
              ${mediaHtml(s, 'mk-screen-media', { preload: 'none' })}
              <div class="mk-screen-body">
                <h3>${h(s.name)}</h3>
                <p class="muted">${h(s.address)} · ${h(s.zone)}</p>
                <div class="mk-screen-tags">
                  <span class="badge">${h(s.type)}</span>
                  <span class="badge">${h(s.format)}</span>
                  <span class="badge">${h(s.resolution)}</span>
                </div>
                <div class="mk-screen-price">
                  <span>Subtotal (${h(kit.duration)})</span>
                  <strong>${fmt(s.subtotal)}</strong>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <aside class="mk-sidebar">
          <div class="panel">
            <div class="panel-head"><h3>Condiciones</h3></div>
            <div class="panel-pad muted small">${h(kit.terms).replace(/\n/g, '<br>')}</div>
          </div>
        </aside>
      </div>`;
  }

  // ==========================================================================
  // 5. Data & State Management
  // ==========================================================================

  async function clearAllData() {
    // 1. Eliminar LocalStorage relacionado con la app
    localStorage.removeItem(PUBLIC_KITS_STORAGE_KEY);
    localStorage.removeItem('smartkit-dashboard-state');
    localStorage.removeItem('sk_auth_token');
    localStorage.removeItem('sk_v1_dashboard-state'); // Prefijo usado en versiones demo
    localStorage.removeItem('sk_v1_public-kits');

    // 2. Eliminar Cache API (Service Worker / Fetch Cache)
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    console.log('Caché y datos locales eliminados correctamente.');
    location.reload(); // Recargar para limpiar estados en memoria
  }

  function loadDashboardState() {
    try {
      const stateJSON = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!stateJSON) return null;

      const savedState = JSON.parse(stateJSON);
      if (savedState && savedState.rows && Array.isArray(savedState.rows)) {
        return savedState;
      }
    } catch (err) {
      console.error('Fallo al cargar datos locales:', err);
      showToast('Error al leer datos locales, se usará la configuración por defecto.');
    }
    // Si no hay estado guardado o está corrupto, se devuelve null.
    return null;
  }

  function persistDashboardState(state, toastMessage) {
    try {
      if (!state || !Array.isArray(state.rows)) {
        throw new Error("El estado a persistir es inválido.");
      }
      const stateToSave = {
        ...state,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(stateToSave));
      if (toastMessage) showToast(toastMessage);
    } catch (err) {
      console.error('Error al guardar en localStorage:', err);
      showToast('Error al guardar cambios. El almacenamiento puede estar lleno o deshabilitado.');
    }
  }

  function storedPublicKits() {
    try { return JSON.parse(localStorage.getItem(PUBLIC_KITS_STORAGE_KEY) || '[]') || []; }
    catch { return []; }
  }

  function getMediaKitUrl(kitId) {
    // Use root-relative path to avoid issues in nested routes.
    return `/mediakit.html?id=${encodeURIComponent(kitId)}`;
  }

  function latestMediaKitId(currentId = '') {
    const kits = storedPublicKits().filter(kit => !kit.archived);
    return currentId || kits[0]?.id || '';
  }

  function updateMediaKitLinks(id = latestMediaKitId()) {
    const href = id ? getMediaKitUrl(id) : './mediakit.html';
    document.querySelectorAll('[data-mediakit-link]').forEach(link => {
      link.setAttribute('href', href);
    });
  }

  // ==========================================================================
  // 6. Public API
  // ==========================================================================

  return {
    DEFAULT_BRAND,
    DURATIONS,
    PUBLIC_KITS_STORAGE_KEY,
    TIPO_COL,
    applyBrandHeader,
    buildMediaKit,
    clearAllData,
    debounce,
    escapeHtml,
    getMediaKitUrl,
    formatMoney,
    impNum,
    kitSlug,
    latestMediaKitId,
    loadDashboardState,
    mediaHtml,
    renderMediaKitPage,
    persistDashboardState,
    safeAssetUrl,
    safeBackground,
    screenSnapshot,
    showToast,
    signMediaKit,
    storedPublicKits,
    updateMediaKitLinks,
    verifyMediaKitSignature,
  };
})();

window.SmartKitShared = SmartKitShared;
// /nav.js

/**
 * Genera y gestiona un menú de navegación compartido para todas las páginas públicas.
 * Se inyecta en el elemento <header> de la página.
 */
const createSharedNav = () => {
  const header = document.querySelector('header.top');
  if (!header) {
    console.error('No se encontró el elemento <header> para inyectar la navegación.');
    return;
  }

  // Determina la página actual para marcar el enlace como activo.
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const navHTML = `
    <div class="brand">
      <div class="logo" id="brand-logo">SK</div>
      <strong id="brand-name">SmartKit</strong>
    </div>
    <nav class="nav">
      <a href="index.html" class="${currentPage === 'index.html' ? 'on' : ''}">Brochure</a>
      <a href="map.html" class="${currentPage === 'map.html' ? 'on' : ''}">Mapa</a>
      <a href="mediakit.html" id="nav-kit" class="${currentPage.startsWith('mediakit.html') ? 'on' : ''}">Media Kit</a>
      <a href="dashboard.html" class="cta">Dashboard</a>
    </nav>
  `;

  header.innerHTML = navHTML;

  // Lógica para actualizar la marca (logo y nombre) si está disponible en el estado compartido.
  // Esto asegura que la personalización del dashboard se refleje en todas partes.
  if (window.SmartKitShared && window.SmartKitShared.loadBrand) {
    window.SmartKitShared.loadBrand();
  }
};

// Ejecutar la creación del menú cuando el DOM esté listo.
document.addEventListener('DOMContentLoaded', createSharedNav);
// /footer.js

/**
 * Genera y gestiona un pie de página compartido para las páginas públicas.
 * Se inyecta en el elemento <footer> de la página.
 */
const createSharedFooter = () => {
  const footer = document.querySelector('footer.site-footer');
  if (!footer) {
    // No hacer nada si la página no tiene un elemento de pie de página.
    return;
  }

  const year = new Date().getFullYear();
  // Usar el nombre de la marca desde el estado compartido si está disponible, si no, un valor por defecto.
  const brandName = window.SmartKitShared?.DEFAULT_BRAND?.name || 'SmartKit';

  const footerHTML = `
    <div class="wrap">
      <p>&copy; ${year} ${brandName}. Todos los derechos reservados.</p>
      <p>Una solución para gestión de circuitos DOOH.</p>
    </div>
  `;

  footer.innerHTML = footerHTML;
};

document.addEventListener('DOMContentLoaded', createSharedFooter);
const BrochureApp = (() => {
  const Shared = window.SmartKitShared;
  const { formatMoney: fmt, impNum, escapeHtml: h } = Shared;

  const ICONS = {
    WHATSAPP: '<svg slot="icon" class="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5a8.5 8.5 0 0 0-7.23 12.97L4 20l3.62-.74A8.5 8.5 0 1 0 12 3.5Zm0 1.8a6.7 6.7 0 0 1 5.72 10.18 6.7 6.7 0 0 1-9.45 2.12l-.3-.2-1.62.33.35-1.56-.22-.32A6.7 6.7 0 0 1 12 5.3Zm-2.44 3.5c-.2 0-.5.08-.77.37-.27.3-.9.88-.9 2.1 0 1.23.92 2.42 1.05 2.59.13.17 1.78 2.84 4.42 3.76 2.2.77 2.65.42 3.12-.03.38-.36.6-1.02.66-1.28.07-.27.04-.48-.15-.58l-1.78-.85c-.2-.1-.44-.05-.57.14l-.5.64c-.13.17-.32.2-.52.1-.42-.18-1.17-.51-1.92-1.18-.7-.62-1.18-1.4-1.32-1.63-.13-.23-.02-.39.1-.52l.37-.43c.12-.14.18-.3.27-.48.09-.18.04-.34-.03-.48l-.82-1.83c-.12-.27-.3-.4-.5-.4Z"/></svg>',
    PLUS: '<svg slot="icon" class="whatsapp-icon plus-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>',
    DOCUMENT: '<svg slot="icon" class="whatsapp-icon plus-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Z"/></svg>'
  };

  const state = {
    sourceScreens: [],
    activeScreens: [],
    brand: { ...Shared.DEFAULT_BRAND },
    map: null,
    activeZone: 'Todos',
    activeSort: 'recommended',
    markers: {},
    selectedScreens: [],
    quoteDuration: '1s',
    activeScreenId: null,
    mobileQuoteOpen: false,
    mobileNavOpen: false,
    mobileFiltersOpen: false,
    lastScreenTrigger: null,
    lastQuoteTrigger: null,
    lastFilterTrigger: null,
    zones: ['Todos'],
    activeMetrics: { totalReach: 0 }
  };

function whatsappButtonContent(label, icon = ICONS.WHATSAPP) {
  return `${icon}<span>${h(label)}</span>`;
}

function screenCpm(s){
  return Math.round((s.precio/(impNum(s)*7))*1000);
}

function screenAvailability(s){
  if(impNum(s)>=70000)return {label:'Alta demanda',tone:'warning'};
  if(s.precio<=60000)return {label:'Disponible',tone:'success'};
  return {label:'Consultar',tone:'neutral'};
}

function screenUseCase(s){
  if(s.tipo==='Peatonal')return 'Ideal para cercanía, retail y activaciones urbanas';
  if(s.tipo==='Vehicular')return 'Ideal para cobertura, recordación y accesos rápidos';
  return 'Ideal para campañas masivas y audiencias mixtas';
}

function setView(v, fitMap=true){
  if(!document.getElementById('view-'+v))v='brochure';
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('on'));
  document.getElementById('view-'+v).classList.add('on');
  document.querySelectorAll('.view').forEach(x=>x.setAttribute('aria-hidden',x.id!==`view-${v}`?'true':'false'));
  document.getElementById('btn-map').classList.toggle('on',v==='map');
  document.getElementById('btn-brochure').classList.toggle('on',v==='brochure');
  document.querySelectorAll('.mobile-nav-destination').forEach(btn=>{
    const active=btn.dataset.view===v;
    btn.classList.toggle('on',active);
    if(active)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
  document.querySelectorAll('.nav button').forEach(btn=>btn.removeAttribute('aria-current'));
  document.getElementById('btn-'+v)?.setAttribute('aria-current','page');
  const mobileToggle=document.getElementById('mobile-quote-toggle');
  setMobileNav(false);
  setMobileFilters(false);
  if (v !== 'brochure') setMobileQuote(false);
  if(mobileToggle)mobileToggle.hidden=false;
  const filterToggle=document.getElementById('mobile-filter-toggle');
  if(filterToggle)filterToggle.hidden=v!=='brochure';
  const actionNav=document.getElementById('mobile-action-nav');
  if(actionNav)actionNav.hidden=false;
  if(v==='map'&&map)setTimeout(()=>{map.invalidateSize();if(fitMap)fitMapToActiveZone();},80);
}

function setZone(zone){
  state.activeZone = zone;
  renderBrochure();
  updateMapMarkers();
}

function setSort(sort){
  state.activeSort = sort;
  renderBrochure();
}

function setMobileQuote(open){
  if (open) state.lastQuoteTrigger = document.activeElement;
  state.mobileQuoteOpen = open;
  const panel=document.getElementById('quote-panel');
  const toggle=document.getElementById('mobile-quote-toggle');
  if (open) setMobileFilters(false);
  panel?.classList.toggle('mobile-open', open);
  toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.getElementById('mobile-quote-cart')?.classList.toggle('is-suppressed', open);
  if (open) setView('brochure', false);
  if (open && panel) requestAnimationFrame(() => panel.focus({ preventScroll: true }));
  if (!open && state.lastQuoteTrigger instanceof HTMLElement) state.lastQuoteTrigger.focus({ preventScroll: true });
}

function setMobileNav(open){
  state.mobileNavOpen = open;
  const header=document.querySelector('.top');
  const toggle=document.getElementById('menu-toggle');
  header?.classList.toggle('menu-open', open);
  toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setMobileFilters(open){
  if (open) state.lastFilterTrigger = document.activeElement;
  state.mobileFiltersOpen = open;
  const panel=document.getElementById('zone-filters');
  const toggle=document.getElementById('mobile-filter-toggle');
  if(open)setMobileQuote(false);
  if(panel)panel.classList.toggle('filters-open',open);
  if(toggle)toggle.setAttribute('aria-expanded',open?'true':'false');
  if(open&&panel)requestAnimationFrame(()=>panel.querySelector('select,button')?.focus({preventScroll:true}));
  if(!open&&lastFilterTrigger instanceof HTMLElement)lastFilterTrigger.focus({preventScroll:true});
}

function showFeedback(message){
  const feedback=document.getElementById('mobile-feedback');
  if(!feedback)return;
  feedback.classList.remove('is-success');
  feedback.textContent=message;
  feedback.classList.add('show');
  clearTimeout(showFeedback.timer);
  showFeedback.timer=setTimeout(()=>feedback.classList.remove('show'),1400);
}

function showGeneratedFeedback(kit){
  const feedback=document.getElementById('mobile-feedback');
  if(!feedback)return;
  feedback.innerHTML=`<strong>Media kit generado</strong><span>${h(kit.screens)} pantallas · ${fmt(kit.total)}</span>`;
  feedback.classList.add('show','is-success');
  clearTimeout(showFeedback.timer);
  showFeedback.timer=setTimeout(()=>feedback.classList.remove('show','is-success'),2200);
}

function sortedScreens(list){
  const typeRank={Peatonal:0,Mixto:1,Vehicular:2};
  const recommendedScore = s => (state.selectedScreens.includes(s.id) ? 100000000 : 0) + (impNum(s) * 10) - s.precio;
  return [...list].sort((a,b)=>{
    if (state.activeSort === 'impact') return impNum(b) - impNum(a);
    if (state.activeSort === 'price') return a.precio - b.precio;
    if (state.activeSort === 'type') return (typeRank[a.tipo] ?? 9) - (typeRank[b.tipo] ?? 9) || impNum(b) - impNum(a);
    return recommendedScore(b)-recommendedScore(a);
  });
}

function isRecommended(s){
  const byScore = sortedScreens(state.activeScreens).slice(0, 3).some(x => x.id === s.id);
  return state.activeSort === 'recommended' && byScore;
}

function loadLazyVideos(root=document){
  const videos=[...root.querySelectorAll('video[data-src]')];
  if(!videos.length)return;
  const load=video=>{
    if(video.src)return;
    video.src=video.dataset.src;
    video.removeAttribute('data-src');
    video.load();
    if(!prefersReducedMotion())video.play().catch(()=>{});
  };
  if(!('IntersectionObserver' in window)){
    videos.slice(0,4).forEach(load);
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        load(entry.target);
        observer.unobserve(entry.target);
      }
    });
  },{rootMargin:'220px'});
  videos.forEach(video=>observer.observe(video));
}

function screenVideoHtml(s, eager=false){
  const videoUrl=Shared.safeAssetUrl(s.video);
  if(!videoUrl)return `<span>${h(s.e)}</span>`;
  const sourceAttr=eager&&!prefersReducedMotion()
    ? `src="${h(videoUrl)}"`
    : `data-src="${h(videoUrl)}"`;
  const autoplay=prefersReducedMotion()?'':'autoplay';
  const preload=eager&&!prefersReducedMotion()?'metadata':'none';
  return `
    <span class="media-fallback" aria-hidden="true">${h(s.e)}</span>
    <video ${sourceAttr} ${autoplay} muted loop playsinline preload="${preload}" aria-label="Video de ${h(s.n)}" onerror="this.hidden=true"></video>`;
}

function markerHtml(s){
  return `<div class="marker ${impNum(s) >= 50000 ? 'hot' : ''}" style="color:${Shared.TIPO_COL[s.tipo]}">${s.e}</div>`;
}

function screenHead(s, className, overlay='', eager=className==='media'){
  const background=Shared.safeBackground(s.g);
  return `<div class="${className} video-head" style="background:${background}">${screenVideoHtml(s, eager)}${overlay}</div>`;
}

function renderBrochureCard(s, eagerVideo=false){
  const selected=state.selectedScreens.includes(s.id);
  const recommended=isRecommended(s);
  const availability=screenAvailability(s);
  const badgeText=selected?'Seleccionada':recommended?'Recomendada':h(s.tipo);
  const badgeClass=selected?'badge-selected':recommended?'badge-recommended':'';
  return `
    <article class="card video-card ${selected?'selected':''}">
      ${screenHead(s, 'thumb', `<span class="badge media-badge ${badgeClass}" style="background:${Shared.TIPO_COL[s.tipo]}22;color:${Shared.TIPO_COL[s.tipo]}">${badgeText}</span>`, eagerVideo)}
      <div class="card-body">
        <div class="row card-head">
          <span class="muted small card-zone">${h(s.b)}</span>
        </div>
        <h3 class="card-title">${h(s.n)}</h3>
        <p class="muted small card-address">${h(s.dir)}</p>
        <p class="card-use-case">${h(screenUseCase(s))}</p>
        <div class="product-tags card-product-tags">
          <span class="product-tag availability-${availability.tone}">${h(availability.label)}</span>
          <span class="product-tag">CPM ${fmt(screenCpm(s))}</span>
        </div>
        <p class="muted small card-spec">${h(s.dim)} · ${h(s.res)} · ${h(s.imp)} imp/día</p>
        <div class="price card-price">${fmt(s.precio)}<span class="muted small"> / semana</span></div>
        <div class="card-actions button-group" role="group" aria-label="Acciones para ${h(s.n)}">
          <button class="btn primary quote-add ${selected?'selected':''}" aria-pressed="${selected?'true':'false'}" aria-label="${selected?'Quitar':'Agregar'} ${h(s.n)} del plan" data-action="toggle-quote" data-screen-id="${s.id}">${selected?'Agregado':'Agregar'}</button>
          <button class="btn map-btn" data-action="show-map" data-screen-id="${s.id}">Ubicar</button>
        </div>
      </div>
    </article>`;
}

function durationOptions(){
  return Shared.DURATIONS.map(d => `<option value="${d.v}" ${d.v === state.quoteDuration ? 'selected' : ''}>${h(d.l)}</option>`).join('');
}

function renderScreenCard(s){
  const selected = state.selectedScreens.includes(s.id);
  const availability=screenAvailability(s);
  const d=selectedDuration();
  const q=quoteTotals();
  const subtotal=s.precio*d.mult;
  const previewScreens=selected?q.screens:[...q.screens,s];
  const previewTotal=previewScreens.reduce((acc,screen)=>acc+(screen.precio*d.mult),0);
  const previewImpacts=previewScreens.reduce((acc,screen)=>acc+(impNum(screen)*d.days),0);
  const selectedList=previewScreens.length?previewScreens.map(screen=>`
    <div class="quote-item">
      <div><strong>${h(screen.n)}</strong><div class="muted small">${h(screen.b)} · ${fmt(screen.precio)}/semana${!state.selectedScreens.includes(screen.id) ? ' · se suma al reservar' : ''}</div></div>
      ${state.selectedScreens.includes(screen.id) ? `<button type="button" aria-label="Quitar ${h(screen.n)}" data-action="toggle-quote" data-screen-id="${screen.id}">×</button>` : ''}
    </div>`).join(''):'<div class="quote-empty">Agrega pantallas desde el brochure para armar tu plan.</div>';
  return `
    ${screenHead(s,'media',`<span class="badge media-badge" style="background:${Shared.TIPO_COL[s.tipo]}22;color:${Shared.TIPO_COL[s.tipo]}">${h(s.tipo)}</span>`)}
      <button type="button" class="close" aria-label="Cerrar ficha" data-action="close-screen">×</button>
    <div class="content screen-card">
      <h2>${h(s.n)}</h2>
      <p class="muted">${h(s.dir)} · ${h(s.b)}</p>
      <div class="product-tags">
        <span class="product-tag availability-${availability.tone}">${h(availability.label)}</span>
        <span class="product-tag">CPM ${fmt(screenCpm(s))}</span>
      </div>
      <p class="screen-fit">${h(screenUseCase(s))}</p>
      <div class="grid2">
        <div class="metric"><span class="muted small">Formato</span><b>${h(s.dim)}</b></div>
        <div class="metric"><span class="muted small">Resolución</span><b>${h(s.res)}</b></div>
        <div class="metric"><span class="muted small">Audiencia</span><b>${h(s.aud || 'General')}</b></div>
        <div class="metric"><span class="muted small">Impactos/día</span><b>${h(s.imp)}</b></div>
        <div class="metric"><span class="muted small">Precio base</span><b>${fmt(s.precio)}</b></div>
      </div>
      <div class="inline-quote">
        <div class="quote-field control-panel">
          <label for="screen-duration-select">Duración</label>
          <div class="select-shell duration-select-shell">
            <select id="screen-duration-select" data-screen-duration-select data-screen-id="${s.id}">${durationOptions()}</select>
          </div>
        </div>
        <div class="quote-total">
          <div class="quote-meta"><span>Subtotal pantalla</span><strong>${fmt(subtotal)}</strong></div>
          <div class="quote-meta"><span>${selected?'Pantallas seleccionadas':'Pantallas al reservar'}</span><strong>${previewScreens.length}</strong></div>
          <div class="quote-meta"><span>Impactos estimados</span><strong>${Math.round(previewImpacts).toLocaleString('es-AR')}</strong></div>
          <div>
            <span class="muted small">${selected?'Total estimado':'Total al reservar'}</span>
            <div class="price">${fmt(previewTotal)}</div>
          </div>
        </div>
        <details class="map-extra">
          <summary>Plan seleccionado</summary>
          <div class="quote-list">${selectedList}</div>
        </details>
        <div class="quote-actions">
          <button class="btn primary quote-btn quote-mediakit reserve-btn" data-action="generate-mediakit" data-screen-id="${s.id}">${whatsappButtonContent('Generar Propuesta', ICONS.DOCUMENT)}</button>
          <button class="btn success quote-btn quote-whatsapp reserve-btn" data-action="toggle-quote" data-screen-id="${s.id}">${whatsappButtonContent(selected ? 'Quitar del plan' : 'Agregar al plan', ICONS.PLUS)}</button>
        </div>
      </div>
    </div>`;
}

function initMap(){
  state.map = L.map('map', { center: [-32.9, -68.83], zoom: 11, zoomControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'© OSM © CartoDB',subdomains:'abcd'}).addTo(state.map);
  L.control.zoom({ position: 'bottomright' }).addTo(state.map);
  state.activeScreens.forEach(s => {
    state.markers[s.id] = L.marker([s.lat, s.lng], {
      icon:L.divIcon({className:'',iconSize:[30,30],iconAnchor:[15,15],html:markerHtml(s)}),
      keyboard:true,
      title:s.n,
      alt:`Pantalla ${s.n}, ${s.b}`
    }).addTo(state.map).on('click', event => openScreen(s.id, event.originalEvent?.target));
    const setMarkerAccessibility=()=>{
      const element = state.markers[s.id].getElement();
      if(!element)return;
      element.setAttribute('role','button');
      element.setAttribute('aria-label',`Ver detalle de ${s.n}, ${s.b}`);
    };
    setMarkerAccessibility();
    state.markers[s.id].on('add', setMarkerAccessibility);
  });
  updateMapMarkers();
}

function openScreen(id, trigger=document.activeElement){
  const s = state.activeScreens.find(x => x.id === id);
  if(!s)return;
  if (trigger instanceof HTMLElement) state.lastScreenTrigger = trigger;
  state.activeScreenId = id;
  document.getElementById('screen-panel').className='side on';
  document.getElementById('screen-panel').innerHTML=renderScreenCard(s);
  loadLazyVideos(document.getElementById('screen-panel'));
  requestAnimationFrame(()=>document.querySelector('#screen-panel .close')?.focus({preventScroll:true}));
}

function closeScreen(){
  state.activeScreenId = null;
  document.getElementById('screen-panel').className='side';
  document.getElementById('screen-panel').innerHTML='';
  if (state.lastScreenTrigger instanceof HTMLElement) state.lastScreenTrigger.focus({ preventScroll: true });
}

function renderBrochure(){
  const minPrice = state.activeScreens.reduce((min, s) => Math.min(min, s.precio), Infinity);
  document.getElementById('hero-stats').innerHTML=`
    <div class="stat"><b>${state.activeScreens.length}</b><span>Pantallas activas</span></div>
    <div class="stat"><b>${Math.round(state.activeMetrics.totalReach / 1000)}k</b><span>Impactos/día</span></div>
    <div class="stat"><b>${Number.isFinite(minPrice) ? fmt(minPrice) : '$0'}</b><span>Desde / semana</span></div>
    <div class="stat"><b>${state.zones.length - 1}</b><span>Zonas</span></div>`;

  document.getElementById('zone-filters').innerHTML = state.zones.map(z =>
    `<button class="chip ${z === state.activeZone ? 'on' : ''}" data-action="set-zone" data-zone="${h(z)}">${h(z)}</button>`
  ).join('');

  const sortOptions = [
    { key: 'recommended', label: 'Recomendadas' }, { key: 'impact', label: 'Mayor impacto' },
    { key: 'price', label: 'Menor precio' }, { key: 'type', label: 'Tipo de tránsito' }
  ];
  document.getElementById('sort-filters').innerHTML = sortOptions.map(opt =>
    `<button class="chip ${opt.key === state.activeSort ? 'on' : ''}" data-action="set-sort" data-sort="${h(opt.key)}">${h(opt.label)}</button>`
  ).join('');

  const list = sortedScreens(state.activeZone === 'Todos' ? state.activeScreens : state.activeScreens.filter(s => s.b === state.activeZone));
  const catalogCount=document.getElementById('catalog-count');
  if (catalogCount) catalogCount.textContent = `${list.length} ${list.length === 1 ? 'pantalla' : 'pantallas'}${state.activeZone === 'Todos' ? '' : ' · ' + state.activeZone}`;
  const activeChip=document.getElementById('active-filter-chip');
  if(activeChip){
    const hasFilter = state.activeZone !== 'Todos' || state.activeSort !== 'recommended';
    activeChip.hidden=!hasFilter;
    activeChip.innerHTML=hasFilter?`
      <span>${h(state.activeZone)} · ${h(({ recommended: 'Recomendadas', impact: 'Mayor impacto', price: 'Menor precio', type: 'Tipo de tránsito' })[state.activeSort] || state.activeSort)}</span>
      <button type="button" data-action="clear-filters">Limpiar</button>`:'';
  }
  document.getElementById('cards').innerHTML=list.length
    ? list.map((s,index)=>renderBrochureCard(s,index<4)).join('')
    : `<div class="empty-state">No hay pantallas activas en ${state.activeZone}.<br><button type="button" data-action="set-zone" data-zone="Todos">Ver todas</button></div>`;
  updateMapMarkers();
  renderQuote();
  loadLazyVideos(document.getElementById('cards'));
}

function mapScreens(){
  return state.activeZone === 'Todos' ? state.activeScreens : state.activeScreens.filter(s => s.b === state.activeZone);
}

function updateMapMarkers(){
  if (!state.map) return;
  const visibleIds=new Set(mapScreens().map(s=>s.id));
  state.activeScreens.forEach(s => {
    const marker = state.markers[s.id];
    if(!marker)return;
    if(visibleIds.has(s.id)){
      if (!state.map.hasLayer(marker)) marker.addTo(state.map);
    } else if (state.map.hasLayer(marker)) {
      state.map.removeLayer(marker);
    }
  });
  if (state.activeScreenId && !visibleIds.has(state.activeScreenId)) closeScreen();
}

function fitMapToActiveZone(){
  const list=mapScreens();
  if (!state.map || !list.length) return;
  if(list.length===1){
    state.map.flyTo([list[0].lat, list[0].lng], 14);
    return;
  }
  const bounds=L.latLngBounds(list.map(s=>[s.lat,s.lng]));
  state.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
}

function selectedDuration(){
  return Shared.DURATIONS.find(d => d.v === state.quoteDuration) || Shared.DURATIONS[0];
}

function quoteScreens(){
  return state.selectedScreens.map(id => state.activeScreens.find(s => s.id === id)).filter(Boolean);
}

function quoteTotals(){
  const d=selectedDuration();
  const screens=quoteScreens();
  return {
    duration:d,
    screens,
    total:screens.reduce((acc,s)=>acc+(s.precio*d.mult),0),
    impacts:screens.reduce((acc,s)=>acc+(impNum(s)*d.days),0)
  };
}

function renderQuote(){
  const q=quoteTotals();
  const durationHtml=durationOptions();
  const listHtml=q.screens.length?q.screens.map(s=>`
    <div class="quote-item">
      <div><strong>${h(s.n)}</strong><div class="muted small">${h(s.b)} · ${fmt(s.precio)}/semana</div></div>
      <button type="button" aria-label="Quitar ${h(s.n)}" data-action="toggle-quote" data-screen-id="${s.id}">×</button>
    </div>`).join(''):'';
  [
    {prefix:'',duration:'duration-select'}
  ].forEach(panel=>{
    const durationSelect=document.getElementById(panel.duration);
    const list=document.getElementById(`${panel.prefix}quote-list`);
    const count=document.getElementById(`${panel.prefix}quote-count`);
    const impacts=document.getElementById(`${panel.prefix}quote-impacts`);
    const total=document.getElementById(`${panel.prefix}quote-total`);
    const whatsapp=document.getElementById(`${panel.prefix}quote-whatsapp`);
    const mediakit=document.getElementById(`${panel.prefix}quote-mediakit`);
    const summaryCount=document.getElementById(`${panel.prefix}quote-summary-count`);
    const status=document.getElementById(`${panel.prefix}quote-status`);
    const hint=document.getElementById(`${panel.prefix}quote-action-hint`);
    const quotePanel=whatsapp?.closest('.quote-panel');
    const hasScreens=q.screens.length>0;
    if(durationSelect)durationSelect.innerHTML=durationHtml;
    if(mediakit){
      mediakit.disabled=!hasScreens;
      mediakit.classList.toggle('is-empty', !hasScreens);
    }
    if(status)status.textContent=hasScreens?'Listo':'Vacío';
    if(hint)hint.textContent=hasScreens?'Genera una propuesta con snapshot, inversión, impactos y condiciones; luego puedes guardarla como PDF o contactar por WhatsApp.':'Agrega una pantalla al cotizador para generar una propuesta compartible.';
    if(list)list.innerHTML=listHtml || '<div class="quote-empty">Agrega pantallas desde el brochure para armar tu plan.</div>';
    if(list)list.classList.toggle('is-empty',!hasScreens);
    if(count)count.textContent=q.screens.length;
    if(impacts)impacts.textContent=Math.round(q.impacts).toLocaleString('es-AR');
    if(total)total.textContent=fmt(q.total);
    if(whatsapp){
      whatsapp.disabled=!hasScreens;
      whatsapp.classList.toggle('is-empty',!hasScreens);
      whatsapp.innerHTML=whatsappButtonContent('Contactar');
    }
    if(quotePanel)quotePanel.classList.toggle('has-selection',hasScreens);
    if(summaryCount)summaryCount.textContent=hasScreens?`${q.screens.length} ${q.screens.length===1?'pantalla':'pantallas'} · ${Math.round(q.impacts/1000).toLocaleString('es-AR')}k impactos · ${fmt(q.total)}`:'0 pantallas · Sin plan armado';
  });
}

function handleFocusTrap(event) {
  if (event.key !== 'Tab') return;

  const container = document.getElementById('mediakit-offcanvas');
  const focusableElements = Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) { // Shift + Tab
    if (document.activeElement === firstElement) {
      lastElement.focus();
      event.preventDefault();
    }
  } else { // Tab
    if (document.activeElement === lastElement) {
      firstElement.focus();
      event.preventDefault();
    }
  }
}

function setOffcanvas(open) {
  const container = document.getElementById('mediakit-offcanvas');
  if (!container) return;

  document.body.classList.toggle('offcanvas-open', open);
  container.setAttribute('aria-hidden', !open);

  if (open) {
    container.querySelector('button.close')?.focus();
    container.addEventListener('keydown', handleFocusTrap);
  } else {
    const trigger = document.querySelector('[data-action="generate-mediakit"]:not([disabled])');
    trigger?.focus();
    container.removeEventListener('keydown', handleFocusTrap);
  }
}

async function generateMediaKit(id=null){
  if (id) ensureQuoteScreen(id);
  const kit=await Shared.buildMediaKit(quoteTotals(), BRAND, window.CONFIG || {}, 'Borrador');
  if(!kit)return;

  // Mejora: Enviar el kit a la API para persistencia remota.
  try {
    const response = await fetch('/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kit)
    });
    if (!response.ok) throw new Error('No se pudo guardar el media kit en el servidor.');
    console.log('Media kit guardado en la API con éxito.');
  } catch (error) {
    console.error(error);
    // Opcional: Guardar en localStorage como fallback si la API falla.
    Shared.showToast('Error al guardar la propuesta, se guardó localmente.', 'error');
  }

  showGeneratedFeedback(kit);

  const offcanvas = document.getElementById('mediakit-offcanvas');
  const iframe = offcanvas?.querySelector('iframe');
  if (iframe) {
    iframe.src = Shared.getMediaKitUrl(kit.id);
    setOffcanvas(true);
  } else {
    // Fallback para navegadores o contextos donde el offcanvas no esté disponible
    window.open(Shared.getMediaKitUrl(kit.id), '_blank', 'noopener');
  }
}

function toggleQuoteScreen(id){
  const wasSelected = state.selectedScreens.includes(id);
  state.selectedScreens = wasSelected ? state.selectedScreens.filter(x => x !== id) : [...state.selectedScreens, id];
  const screen = state.activeScreens.find(s => s.id === id);
  renderBrochure();
  renderQuote();
  if (state.activeScreenId) openScreen(state.activeScreenId);
  if (screen) showFeedback(wasSelected ? 'Quitado del cotizador' : 'Agregado al cotizador');
}

function ensureQuoteScreen(id){
  if (id && !state.selectedScreens.includes(id)) {
    state.selectedScreens = [...state.selectedScreens, id];
    renderBrochure();
    renderQuote();
    if (state.activeScreenId) openScreen(state.activeScreenId);
  }
}

function requestWhatsappQuote(id=null, trigger=null){
  ensureQuoteScreen(id);
  const q=quoteTotals();
  const whatsappTarget=trigger&&!trigger.disabled?trigger:document.querySelector('[data-action="whatsapp-quote"]:not([disabled])');
  const previousHtml=whatsappTarget?.innerHTML;
  const normalizedPhone = String(state.brand.whatsapp || '').replace(/\D/g, '');
  if(whatsappTarget)whatsappTarget.innerHTML=whatsappButtonContent('Abriendo WhatsApp...');
  
  let msg;
  if (q.screens.length > 0) {
    const screenLines=q.screens.map(s=>`- ${s.n} (${s.b}) - ${fmt(s.precio)}/semana - CPM ${fmt(screenCpm(s))}`).join('\n');
    msg=`Hola, quiero consultar por esta campaña de ${BRAND.name}:

Pantallas seleccionadas (${q.screens.length}):
${screenLines}

Duración: ${q.duration.l}
Impactos estimados: ${Math.round(q.impacts).toLocaleString('es-AR')}
Inversión estimada: ${fmt(q.total)}`;
  } else {
    msg = `Hola, quiero hacer una consulta sobre las campañas de publicidad en ${BRAND.name}.`;
  }
  if(normalizedPhone)window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
  if(whatsappTarget&&previousHtml)setTimeout(()=>{whatsappTarget.innerHTML=previousHtml;},1600);
}

function showOnMap(id, trigger=document.activeElement){
  const s = state.activeScreens.find(x => x.id === id);
  if(!s)return;
  setView('map', false);
  setTimeout(() => state.map.flyTo([s.lat, s.lng], 14), 90);
  openScreen(id, trigger);
}

function applyBrand(){
  document.title = state.brand.name + ' - Brochure y Mapa';
  Shared.applyBrandHeader(state.brand);
  document.getElementById('hero-title').textContent = state.brand.name;
  document.getElementById('hero-copy').textContent = state.brand.heroCopy;
}

function bindEvents(){
  document.addEventListener('click',event=>{
    const viewButton=event.target.closest('[data-view]');
    if(viewButton&&viewButton instanceof HTMLButtonElement){
      setView(viewButton.dataset.view);
      return;
    }
    const actionTarget=event.target.closest('[data-action]');
    if(!actionTarget){
      if (state.mobileNavOpen && !event.target.closest('.top')) setMobileNav(false);
      if (state.mobileFiltersOpen && !event.target.closest('#zone-filters')) setMobileFilters(false);
      return;
    }
    const id=Number(actionTarget.dataset.screenId);
    const action=actionTarget.dataset.action;
    if(action==='generate-mediakit')generateMediaKit(id);
    if(action==='whatsapp-quote')requestWhatsappQuote(id, actionTarget);
    if(action==='toggle-quote')toggleQuoteScreen(id);
    if(action==='show-map')showOnMap(id, actionTarget);
    if(action==='close-screen')closeScreen();
    if(action==='set-zone')setZone(actionTarget.dataset.zone);
    if(action==='set-sort')setSort(actionTarget.dataset.sort);
    if(action==='clear-filters'){
      state.activeZone = 'Todos';
      state.activeSort = 'recommended';
      document.querySelectorAll('[data-sort-select] option[value="recommended"]').forEach(o => o.selected = true);
      setMobileFilters(false);
      renderBrochure();
      updateMapMarkers();
    }
    if (action === 'toggle-mobile-quote') setMobileQuote(!state.mobileQuoteOpen);
    if (action === 'toggle-nav') setMobileNav(!state.mobileNavOpen);
    if (action === 'toggle-filters') setMobileFilters(!state.mobileFiltersOpen);
    if(action==='close-offcanvas')setOffcanvas(false);
  });

  document.addEventListener('change',event=>{
    if(event.target.matches('[data-duration-select]')){
      state.quoteDuration = event.target.value;
      renderQuote();
      renderBrochure();
      return;
    }
    if(event.target.matches('[data-sort-select]')){
      setSort(event.target.value);
      setMobileFilters(false);
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if (state.mobileFiltersOpen) {
      event.preventDefault();
      setMobileFilters(false);
      return;
    }
    if (state.mobileQuoteOpen) {
      event.preventDefault();
      setMobileQuote(false);
      return;
    }
    if (state.activeScreenId) {
      event.preventDefault();
      closeScreen();
    }
    const offcanvas = document.getElementById('mediakit-offcanvas');
    if (offcanvas && offcanvas.getAttribute('aria-hidden') === 'false') {
      event.preventDefault();
      setOffcanvas(false);
    }
  });
}

  async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const loadDefault = urlParams.get('load') === 'default';
  const savedState = Shared.loadDashboardState();

  if (savedState && savedState.rows?.length && !loadDefault) {
      console.log(`SmartKit: Cargando ${savedState.rows.length} pantallas desde localStorage.`);
      state.sourceScreens = savedState.rows;
    if (savedState.brand) Object.assign(state.brand, savedState.brand);
  } else {
    // Modificado: Cargar desde la API externa en lugar de screens.json.
    try {
      console.log('SmartKit: Cargando desde la API de inventario...');
      // La URL del endpoint de tu API. Puede estar en una variable de configuración.
      const response = await fetch('/api/screens'); 
      if (!response.ok) throw new Error('No se pudo cargar el inventario desde la API.');
      state.sourceScreens = await response.json();
    } catch (error) {
      console.error('Error al cargar datos de pantallas:', error);
      // Mejora: Mostrar un error en la UI si la carga falla.
      document.getElementById('cards').innerHTML = `<div class="empty-state">Error al cargar el inventario. Por favor, intenta recargar la página.</div>`;
      state.sourceScreens = [];
    }
  }

    // Corregido: Unificar el criterio para pantallas activas.
    // Prioriza el campo `status` del dashboard, y si no existe, usa el `active` del JSON.
    state.activeScreens = state.sourceScreens.filter(s =>
      s.status ? s.status === 'Activo' : (s.active !== false)
    );
    state.zones = ['Todos', ...new Set(state.activeScreens.map(s => s.b))];
    state.activeMetrics.totalReach = state.activeScreens.reduce((acc, s) => acc + impNum(s), 0);

  applyBrand();
  Shared.updateMediaKitLinks();
  renderBrochure(); // Mover renderBrochure() antes de initMap()
  bindEvents();
  initMap();
    setView('brochure', false);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', BrochureApp.init);
/* ══════════════════════════════════════
   MAP APP
══════════════════════════════════════ */
(function(){
'use strict';

// ── Keys ──
const K_STATE = 'sk_v1_dashboard-state';
const K_KITS  = 'sk_v1_public-kits';
const K_CFG   = 'sk_v1_config';

// ── State ──
let screens = [];
let markers = {};        // id → L.circleMarker
let activeFilter = 'Todos';
let activeScreen = null;
let quote = new Map();   // id → screen
let lMap = null;
let searchQ = '';

// ── Helpers ──
const $ = id => document.getElementById(id);
const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
const fmtImp = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const badgeClass = {Peatonal:'bd-p', Vehicular:'bd-v', Mixto:'bd-m'};
const dotColor   = {Peatonal:'#0369a1', Vehicular:'#0f766e', Mixto:'#7c3aed'};

let toastTmr;
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTmr); toastTmr=setTimeout(()=>t.classList.remove('show'),2200); }

// ── Boot ──
function boot(){
  loadConfig();
  loadScreens();
  initMap();
  setupSearch();
  setupChips();
  setupPanel();
  setupQuotePill();
  updateQuotePill();
}

function loadConfig(){
  let cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem(K_CFG)||'{}'); }catch(_){}
  if(cfg.logo) $('brand-logo').textContent = cfg.logo;
  if(cfg.brand) $('brand-name').textContent = cfg.brand;

  // Update nav-kit link to point to latest kit if exists
  let kits = {};
  try{ kits = JSON.parse(localStorage.getItem(K_KITS)||'{}'); }catch(_){}
  const latest = Object.values(kits).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];
  if(latest) $('nav-kit').href = `mediakit.html?id=${encodeURIComponent(latest.id)}`;
}

function loadScreens(){
  let overlay = {};
  try{ overlay = JSON.parse(localStorage.getItem(K_STATE)||'{}'); }catch(_){}
  screens = (window.BASE_SCREENS || [])
    .map(s => ({...s, ...(overlay[s.id]||{})}))
    .filter(s => s.status === 'Activo' && s.lat && s.lng);
  updateCounts();
}

// ── Map ──
function initMap(){
  lMap = L.map('map', {zoomControl:false, attributionControl:false}).setView([-32.903,-68.839], 12);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(lMap);

  L.control.zoom({position:'bottomleft'}).addTo(lMap);
  L.control.attribution({prefix:'© CartoDB · © OpenStreetMap'}).addTo(lMap);

  screens.forEach(s => addMarker(s));
  applyFilters();

  // Close panel when clicking map
  lMap.on('click', () => closePanel());
}

function markerRadius(s){ return Math.max(8, Math.min(18, Math.round(s.impactos/2000))); }

function addMarker(s){
  const col = dotColor[s.tipo] || '#64748b';
  const r = markerRadius(s);
  const m = L.circleMarker([s.lat, s.lng], {
    radius: r,
    fillColor: col,
    color: '#fff',
    weight: 2,
    fillOpacity: .88,
    className: 'sc-marker'
  }).addTo(lMap);

  m.bindTooltip(`<strong>${s.nombre}</strong><br>${s.zona} · ${fmtImp(s.impactos)} imp/día`, {
    direction:'top', offset:[0,-r], className:'', sticky:false
  });

  m.on('click', e => { L.DomEvent.stopPropagation(e); openPanel(s); });
  markers[s.id] = m;
}

function applyFilters(){
  let visible = screens.filter(s => {
    const matchTipo = activeFilter === 'Todos' || s.tipo === activeFilter;
    const matchQ = !searchQ || s.nombre.toLowerCase().includes(searchQ) || s.zona.toLowerCase().includes(searchQ);
    return matchTipo && matchQ;
  });

  // Show/hide markers
  screens.forEach(s => {
    const m = markers[s.id]; if(!m) return;
    const show = visible.some(v => v.id === s.id);
    const inQ = quote.has(s.id);
    if(show){ m.setStyle({opacity:1, fillOpacity: inQ ? 1 : .88, weight: inQ ? 3 : 2, color: inQ ? '#fbbf24' : '#fff'}); }
    else    { m.setStyle({opacity:.15, fillOpacity:.1}); }
  });

  const c = $('map-counter');
  if(c) c.textContent = `${visible.length} pantalla${visible.length!==1?'s':''} visibles`;
}

// ── Panel ──
function openPanel(s){
  activeScreen = s;
  $('sc-title').textContent = s.nombre;

  // Hero
  const hero = $('sc-hero');
  hero.style.background = `linear-gradient(135deg, ${dotColor[s.tipo]||'var(--pdk)'}, var(--teal))`;
  hero.innerHTML = s.video
    ? `<video src="${esc(s.video)}" autoplay muted loop playsinline></video>${esc((s.nombre||'').substring(0,2).toUpperCase())}`
    : esc((s.nombre||'').substring(0,2).toUpperCase());

  // Body
  const inQ = quote.has(s.id);
  $('sc-body').innerHTML = `
    <div class="sc-zone-row">
      <span class="badge ${badgeClass[s.tipo]||''}">${esc(s.tipo)}</span>
      <span style="color:var(--mu);font-size:12px">${esc(s.zona)}</span>
      <span class="badge ${s.status==='Activo'?'bd-ok':'bd-mu'}">${esc(s.status)}</span>
    </div>
    <div class="sc-stats">
      <div class="sc-stat"><span>Impactos/día</span><strong>${fmtImp(s.impactos)}</strong></div>
      <div class="sc-stat"><span>Precio/semana</span><strong>${fmt(s.precio)}</strong></div>
      <div class="sc-stat"><span>CPM estimado</span><strong>${fmt(Math.round(s.precio/s.impactos*1000/7))}</strong></div>
      <div class="sc-stat"><span>Zona</span><strong>${esc(s.zona)}</strong></div>
    </div>
    ${s.nota ? `<div class="sc-note">${esc(s.nota)}</div>` : ''}
    <button class="btn-add${inQ?' in':''}" id="panel-add-btn">
      ${inQ ? '✓ En cotizador · Quitar' : '+ Agregar al cotizador'}
    </button>`;

  $('panel-add-btn').addEventListener('click', () => toggleQuote(s));
  $('sc-panel').classList.add('open');

  // Highlight marker
  applyFilters();
}

function closePanel(){
  $('sc-panel').classList.remove('open');
  activeScreen = null;
}

// ── Quote ──
function toggleQuote(s){
  if(quote.has(s.id)){
    quote.delete(s.id);
    toast(`${s.nombre} quitada del cotizador`);
  } else {
    quote.set(s.id, s);
    toast(`✓ ${s.nombre} agregada al cotizador`);
  }
  updateQuotePill();
  applyFilters();
  // Refresh panel button if open
  if(activeScreen && activeScreen.id === s.id) openPanel(s);
}

function updateQuotePill(){
  const n = quote.size;
  const items = [...quote.values()];
  const total = items.reduce((a,s)=>a+s.precio*4,0); // default 4 semanas

  $('q-dot').textContent = n;
  $('quote-pill').classList.toggle('has-items', n > 0);

  if(n === 0){
    $('q-label').textContent = 'Cotizador vacío';
    $('q-sublabel').textContent = 'Agregá pantallas desde el mapa';
    $('q-actions').style.display = 'none';
  } else {
    $('q-label').textContent = `${n} pantalla${n!==1?'s':''} · ${fmt(total)}/mes`;
    $('q-sublabel').textContent = `${fmtImp(items.reduce((a,s)=>a+s.impactos,0))} imp/día`;
    $('q-actions').style.display = 'flex';
  }
}

function setupQuotePill(){
  $('q-clear').addEventListener('click', () => {
    if(!confirm('¿Limpiar el cotizador?')) return;
    quote.clear();
    updateQuotePill();
    applyFilters();
    toast('Cotizador vaciado');
  });

  $('q-go').addEventListener('click', () => {
    // Persist quote to localStorage as a draft kit then navigate
    const items = [...quote.values()];
    if(!items.length) return;
    const weeks = 4;
    const id = 'kit-draft-' + Date.now().toString(36);
    const now = new Date();
    const kit = {
      id, client:'', contact:'',
      createdAt: now.toISOString(),
      validUntil: new Date(now.getTime()+15*86400000).toISOString(),
      brand:'SmartKit', weeks, weekLabel:'4 semanas',
      screens: items.map(s=>({...s, precioCampana:s.precio*weeks})),
      totals:{
        screens:items.length,
        impactsPerDay:items.reduce((a,s)=>a+s.impactos,0),
        impactsTotal:items.reduce((a,s)=>a+s.impactos,0)*weeks*7,
        investment:items.reduce((a,s)=>a+s.precio*weeks,0)
      },
      terms:'Inicio de campaña sujeto a disponibilidad. Valores en ARS.'
    };
    let all={};
    try{all=JSON.parse(localStorage.getItem(K_KITS)||'{}');}catch(_){}
    all[id]=kit; localStorage.setItem(K_KITS,JSON.stringify(all));
    window.location.href=`mediakit.html?id=${encodeURIComponent(id)}`;
  });
}

// ── Search ──
function setupSearch(){
  $('search').addEventListener('input', e => {
    searchQ = e.target.value.toLowerCase().trim();
    applyFilters();
  });
}

// ── Chips ──
function setupChips(){
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      activeFilter = c.dataset.tipo;
      document.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      applyFilters();
    });
  });
}

// ── Counts ──
function updateCounts(){
  const tipos = ['Peatonal','Vehicular','Mixto'];
  $('cnt-all').textContent = screens.length;
  tipos.forEach(t => {
    const el = document.querySelector(`.chip[data-tipo="${t}"] .chip-count`);
    if(el) el.textContent = screens.filter(s=>s.tipo===t).length;
  });
}

// ── Panel close ──
function setupPanel(){
  $('sc-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if(e.key==='Escape') closePanel(); });
}

// ── Init ──
document.readyState==='loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();

})();
document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const h = SmartKitShared.escapeHtml;
  
  const params = new URLSearchParams(location.search);
  const kitId = params.get('id');
  let kit = null;

  if (kitId) {
    try {
      // Prioridad 1: Cargar desde la API.
      const response = await fetch(`/api/kits/${encodeURIComponent(kitId)}`);
      if (!response.ok) throw new Error('Kit no encontrado en la API.');
      kit = await response.json();
    } catch (error) {
      // Prioridad 2: Fallback a localStorage (útil para borradores o modo offline).
      console.warn('Kit no encontrado en API, buscando en localStorage...', error);
      const dashboardState = window.SmartKitShared.loadDashboardState();
      kit = dashboardState.kits?.find(k => k.id === kitId);
    }
  }

  if (kit) {
    await SmartKitShared.renderMediaKitPage(kit, window.CONFIG || {});
    if (kit.id && !kit.id.startsWith('kit-draft-') && !kit.id.startsWith('demo-')) {
      notifyAdminOfView(kit.id, kit.client);
    }
  } else {
    renderEmptyState(kitId, app);
  }

  /**
   * Llama a un endpoint de la API para notificar que un media kit ha sido visto.
   * Solo se ejecuta una vez por sesión del navegador para evitar spam.
   * @param {string} kitId - El ID del media kit.
   * @param {string} clientName - El nombre del cliente para incluir en la notificación.
   */
  async function notifyAdminOfView(kitId, clientName) {
    const notificationKey = `sk_notified_view_${kitId}`;
    if (sessionStorage.getItem(notificationKey)) {
      console.log('Notificación para este kit ya fue enviada en esta sesión.');
      return;
    }

    try {
      const response = await fetch('/api/notify-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitId, clientName }),
      });
      if (response.ok) {
        sessionStorage.setItem(notificationKey, 'true');
      }
    } catch (error) {
      console.error('Error al intentar notificar la vista del media kit:', error);
    }
  }

  function renderEmptyState(id, container) {
    SmartKitShared.applyBrandHeader();
    document.title += ' - Propuesta no encontrada';
    app.innerHTML = `
      <div class="mk-empty">
        <h1>Propuesta no encontrada</h1>
        <p>No se pudo encontrar el media kit con el ID "${h(id || 'ninguno')}".</p>
        <p class="muted">Si el enlace es correcto, es posible que la propuesta haya sido archivada o eliminada. Por favor, contacta a tu ejecutivo comercial.</p>
        <div style="margin-top: 24px;"><a href="./index.html" class="btn primary">Volver al cotizador</a></div>
      </div>
    `;
  }
});