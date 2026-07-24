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
    whatsapp: '5492613871088', // Número de WhatsApp unificado por defecto
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

  async function loadInventory() {
    try {
      const response = await fetch('/screens.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const baseScreens = await response.json();

      // Cargar el estado del dashboard desde localStorage para aplicar overrides.
      const dashboardState = loadDashboardState();
      if (dashboardState && dashboardState.rows && dashboardState.rows.length > 0) {
        const overrides = new Map(dashboardState.rows.map(row => [row.id, row]));
        // Mapear sobre el inventario base y aplicar los cambios.
        // Esto preserva el orden de screens.json pero actualiza los datos.
        return baseScreens.map(screen => ({
          ...screen,
          ...(overrides.get(screen.id) || {})
        }));
      }

      // Si no hay estado en el dashboard, devolver el inventario base.
      return baseScreens;

    } catch (error) {
      console.error('Error al cargar el inventario:', error);
      throw new Error('No se pudo cargar el inventario de pantallas.');
    }
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
    loadInventory,
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
