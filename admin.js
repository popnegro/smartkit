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
const DashboardApp = (() => {
  const Shared = window.SmartKitShared;
  const { formatMoney: fmt, impNum: imp, escapeHtml: h } = Shared;
  const AUTH_TOKEN_KEY = 'sk_auth_token';

  const SECTIONS = { INVENTORY: 'inventory', MEDIAKITS: 'mediakits', METRICS: 'metrics', SETTINGS: 'settings' };
  const KIT_STATUS = { DRAFT: 'Borrador', ARCHIVED: 'Archivado' };
  const SCREEN_STATUS = { ACTIVE: 'Activo', PAUSED: 'Pausado' };

  const state = {
    rows: [],
    selectedId: null,
    currentSection: 'inventory',
    kitSelected: new Set(),
    savedKits: [],
    brand: { name: 'SmartKit', logo: 'SK', terms: '', validity: '15 dias', whatsapp: '' }
  };

  // Modificado: debouncedPersist ahora solo guarda datos específicos del cliente (kits, marca).
  // El inventario (state.rows) se gestiona exclusivamente a través de la API.
  const debouncedPersist = Shared.debounce((message) => {
    const persistableState = { kits: state.savedKits, brand: state.brand };
    Shared.persistDashboardState(persistableState, message || 'Cambios guardados automáticamente');
  }, 1500);

  // Esta función debería ser tu única vía para actualizar el inventario.

  /**
   * Un fetch wrapper que añade el token de autenticación y maneja errores 401.
   */
  async function authedFetch(url, options = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      // Token inválido o expirado
      logout();
      throw new Error('Sesión expirada. Por favor, ingresa de nuevo.');
    }

    return response;
  }

  async function loadInitialData() {
    const urlParams = new URLSearchParams(window.location.search);
    const loadDefault = urlParams.get('load') === 'default';
    const savedState = Shared.loadDashboardState();

    if (savedState && savedState.rows && savedState.rows.length > 0 && !loadDefault) {
      state.rows = savedState.rows.map(row => ({
        ...row,
        status: row.status || (row.active ? SCREEN_STATUS.ACTIVE : SCREEN_STATUS.PAUSED)
      }));
      state.savedKits = savedState.kits || [];
      Object.assign(state.brand, savedState.brand || {});
      document.getElementById('data-status').textContent = 'Datos desde localStorage';
    } else {
      try {
        if (loadDefault) {
          Shared.showToast('Forzando carga desde screens.json');
          // En un escenario de API, podrías querer mantener el fallback a JSON para demos.
        }
        console.log('SmartKit Dashboard: Cargando desde la API...');
        const response = await authedFetch('/api/screens'); // Usar fetch autenticado
        if (!response.ok) throw new Error('No se pudo cargar el inventario desde la API.');
        state.rows = await response.json();
        state.rows.forEach(row => { row.status = row.active ? SCREEN_STATUS.ACTIVE : SCREEN_STATUS.PAUSED; });
        document.getElementById('data-status').textContent = 'Datos desde API';
        Shared.showToast('Datos iniciales cargados desde la API');
      } catch (error) { console.error(error); state.rows = []; }
    }
    if (state.rows.length > 0) {
      state.selectedId = state.rows[0].id;
    } else {
      state.selectedId = null;
    }
  }

  function calculateKitMetrics(screens, duration) {
    const total = screens.reduce((sum, row) => sum + row.precio * duration.mult, 0);
    const impacts = screens.reduce((sum, row) => sum + imp(row) * duration.days, 0);
    const cpm = impacts ? Math.round(total / impacts * 1000) : 0;
    return { total, impacts, cpm };
  }

  function downloadKitJson(kit) {
    const blob = new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${kit.id}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function applyBrand() {
    document.title = `${state.brand.name} - Dashboard de Gestion`;
    document.getElementById('dash-logo').textContent = state.brand.logo;
    document.getElementById('dash-brand').textContent = state.brand.name;
  }

  function updateKpis() {
    const active = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE);
    const totalImpacts = active.reduce((acc, row) => acc + imp(row), 0);
    const revenue = active.reduce((acc, row) => acc + row.precio, 0);
    const avgCpm = active.length
      ? active.reduce((acc, row) => acc + ((row.precio / (imp(row) * 7)) * 1000), 0) / active.length
      : 0;
    document.getElementById('kpi-published').textContent = `${active.length} / ${state.rows.length}`;
    document.getElementById('kpi-active').textContent = active.length;
    document.getElementById('kpi-reach').textContent = totalImpacts.toLocaleString('es-AR');
    document.getElementById('kpi-revenue').textContent = fmt(revenue);
    document.getElementById('kpi-cpm').textContent = fmt(avgCpm);
  }

  function fillFilters() {
    const zones = ['Todos', ...new Set(state.rows.map(row => row.b))];
    const types = ['Todos', ...new Set(state.rows.map(row => row.tipo))];
    const zoneOptions = zones.map(zone => `<option value="${h(zone)}">${h(zone)}</option>`).join('');
    const typeOptions = types.map(type => `<option value="${h(type)}">${h(type)}</option>`).join('');

    document.getElementById('zone-filter').innerHTML = zoneOptions;
    document.getElementById('type-filter').innerHTML = typeOptions;
    document.getElementById('kit-zone').innerHTML = zoneOptions;
    document.getElementById('kit-duration').innerHTML = Shared.DURATIONS.map(d => `<option value="${d.v}">${d.l}</option>`).join('');
  }

  function filteredRows() {
    const query = document.getElementById('search').value.trim().toLowerCase();
    const zone = document.getElementById('zone-filter').value;
    const type = document.getElementById('type-filter').value;
    return state.rows.filter(row => {
      const matchesQuery = !query || [row.n, row.dir, row.b, row.tipo].some(v => String(v).toLowerCase().includes(query));
      const matchesZone = zone === 'Todos' || row.b === zone;
      const matchesType = type === 'Todos' || row.tipo === type;
      return matchesQuery && matchesZone && matchesType;
    });
  }

  function renderTable() {
    const list = filteredRows();
    // Corregido: Si el ID seleccionado no está en la lista filtrada, seleccionar el primero de la lista.
    if (list.length && !list.some(row => row.id === state.selectedId)) {
      selectRow(list[0].id, false); // Evitar bucle de renderizado
    }
    document.getElementById('result-count').textContent = `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}`;
    document.getElementById('screen-table').innerHTML = list.map(row => `
      <tr class="${row.id === state.selectedId ? 'selected' : ''}" data-action="select" data-id="${row.id}">
        <td><div class="screen-cell"><span class="screen-icon">${h(row.e)}</span><div><strong>${h(row.n)}</strong><span>${h(row.dir)} · ${h(row.b)}</span></div></div></td>
        <td><span class="badge">${h(row.tipo)}</span></td>
        <td>${h(row.imp)}</td>
        <td><strong>${fmt(row.precio)}</strong></td>
        <td><span class="badge ${row.status === SCREEN_STATUS.ACTIVE ? 'active' : 'paused'}">${row.status}</span></td>
      </tr>`).join('');
  }

  function renderPreview(row) {
    const video = row.video ? `<video src="${Shared.safeAssetUrl(row.video)}" autoplay muted loop playsinline></video>` : '';
    document.getElementById('preview').innerHTML = `
      <div class="preview-media" style="background:${Shared.safeBackground(row.g)}">${h(row.e)}${video}</div>
      <div class="preview-body">
        <h3>${h(row.n)}</h3>
        <p>${h(row.dir)} · ${h(row.b)}</p>
        <div class="metrics-grid">
          <div class="metric"><span>Formato</span><b>${h(row.dim)}</b></div>
          <div class="metric"><span>Resolucion</span><b>${h(row.res)}</b></div>
          <div class="metric"><span>Audiencia</span><b>${h(row.aud || 'N/D')}</b></div>
          <div class="metric"><span>Impactos/dia</span><b>${h(row.imp)}</b></div>
          <div class="metric"><span>CPM</span><b>${fmt((row.precio / (imp(row) * 7)) * 1000)}</b></div>
        </div>
      </div>`;
  }

  function updateEditor(row) {
    if (!row) return;
    document.getElementById('editor-form').style.display = 'grid';
    document.getElementById('editor-empty').style.display = 'none';
    document.getElementById('editor-title').textContent = row.n;
    document.getElementById('edit-name').value = row.n;
    document.getElementById('edit-zone').value = row.b;
    document.getElementById('edit-price').value = row.precio;
    document.getElementById('edit-audience').value = row.aud || '';
    document.getElementById('edit-video').value = row.video || '';
    document.getElementById('edit-note').value = row.note || '';
    document.getElementById('edit-status').value = row.status || SCREEN_STATUS.ACTIVE;
    renderPreview(row);
  }

  function selectRow(id, doRenderTable = true) {
    const numericId = Number(id);
    const row = state.rows.find(item => item.id === numericId);
    if (!row) return;

    state.selectedId = numericId;
    updateEditor(row);
    if (doRenderTable) renderTable();
  }

  function exportCsv() {
    const header = ['id', 'nombre', 'zona', 'direccion', 'tipo', 'impactos_dia', 'precio_semana', 'estado'];
    const lines = state.rows.map(row => [row.id, row.n, row.b, row.dir, row.tipo, row.imp, row.precio, row.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'smartkit-inventario.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    Shared.showToast('CSV exportado');
  }

  function setSection(section) {
    state.currentSection = section;
    document.querySelectorAll('[data-section]').forEach(btn => btn.classList.toggle('active', btn.dataset.section === section));
    document.querySelectorAll('.section').forEach(panel => panel.hidden = panel.id !== `section-${section}`);
    const titles = {
      [SECTIONS.INVENTORY]: ['Gestion de pantallas', 'Administra inventario, disponibilidad, precios y vista comercial.'],
      [SECTIONS.MEDIAKITS]: ['Constructor de Media Kits', 'Crea, previsualiza y mantiene propuestas comerciales.'],
      [SECTIONS.METRICS]: ['Metricas comerciales', 'Analiza cobertura, mix de transito y potencial de venta por zona.'],
      [SECTIONS.SETTINGS]: ['Configuracion comercial', 'Define marca, contacto y condiciones base para tus mediakits.']
    };
    document.getElementById('page-title').textContent = titles[section];
    document.getElementById('page-copy').textContent = titles[section];
    if (section === SECTIONS.MEDIAKITS) renderKitBuilder();
    if (section === SECTIONS.METRICS) renderMetrics();
  }

  function validateKitStep(targetStep) {
    if (targetStep > 1 && !document.getElementById('kit-client').value.trim()) {
      Shared.showToast('Por favor, indica el nombre del cliente');
      document.getElementById('kit-client').focus();
      return false;
    }
    if (targetStep === 3 && state.kitSelected.size === 0) {
      Shared.showToast('Selecciona al menos una pantalla para continuar');
      return false;
    }
    return true;
  }

  function setKitStep(n) {
    document.querySelectorAll('[data-step-nav]').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.stepNav) === n);
      el.classList.toggle('completed', Number(el.dataset.stepNav) < n);
    });
    document.querySelectorAll('[data-step-panel]').forEach(el => el.classList.toggle('active', Number(el.dataset.stepPanel) === n));
  }

  function getSelectedDuration() {
    return Shared.DURATIONS.find(d => d.v === document.getElementById('kit-duration').value) || Shared.DURATIONS;
  }

  function getKitScreens() {
    return state.rows.filter(row => state.kitSelected.has(row.id) && row.status === SCREEN_STATUS.ACTIVE);
  }

  function renderKitBuilder() {
    const query = document.getElementById('kit-search')?.value.toLowerCase() || '';
    const zone = document.getElementById('kit-zone').value || 'Todos';
    const visible = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE && (zone === 'Todos' || row.b === zone) &&
      (!query || row.n.toLowerCase().includes(query) || row.dir.toLowerCase().includes(query)));
    document.getElementById('kit-screen-list').innerHTML = visible.map(row => `
      <label class="kit-screen">
        <input type="checkbox" data-kit-screen="${row.id}" ${state.kitSelected.has(row.id) ? 'checked' : ''}>
        <span class="screen-icon">${h(row.e)}</span>
        <span><strong>${h(row.n)}</strong><span>${h(row.b)} · ${h(row.imp)} imp/dia · ${fmt(row.precio)}/sem</span></span>
        <span class="badge">${h(row.tipo)}</span>
      </label>`).join('');
    renderKitPreview();
  }

  function renderKitPreview() {
    const duration = getSelectedDuration();
    const screens = getKitScreens();
    const client = document.getElementById('kit-client').value.trim() || 'Cliente sin nombre';
    const { total, impacts, cpm } = calculateKitMetrics(screens, duration);
    const terms = document.getElementById('settings-terms').value.trim();

    document.getElementById('kit-selected-count').textContent = `${screens.length} ${screens.length === 1 ? 'seleccionada' : 'seleccionadas'}`;
    document.getElementById('kit-state').textContent = screens.length ? 'Borrador listo' : KIT_STATUS.DRAFT;

    const metricsHtml = `
      <div class="kpi"><b>${screens.length}</b><span>Pantallas</span></div>
      <div class="kpi"><b>${Math.round(impacts / 1000).toLocaleString('es-AR')}k</b><span>Impactos</span></div>
      <div class="kpi"><b>${fmt(total)}</b><span>Inversión</span></div>
      <div class="kpi"><b>${fmt(cpm)}</b><span>CPM</span></div>`;

    document.getElementById('kit-final-metrics').innerHTML = metricsHtml;
    document.getElementById('kit-preview').innerHTML = `
      <div class="kit-doc-hero"><span class="eyebrow" style="color:#bae6fd">Propuesta</span><h2>${h(client)}</h2><p>${h(duration.l)}</p></div>
      <div class="kit-doc-body"><div class="kit-summary">${metricsHtml}</div>
      <div class="kit-list">${screens.map(row => `<div class="kit-row"><span><strong>${h(row.n)}</strong><br><small>${h(row.b)}</small></span><strong>${fmt(row.precio * duration.mult)}</strong></div>`).join('')}</div>
      ${terms ? `<div class="kit-terms"><strong>Condiciones:</strong><br>${h(terms)}</div>` : ''}
      </div>`;
  }

  async function saveKit() {
    const screens = getKitScreens();
    if (!screens.length) {
      Shared.showToast('Selecciona al menos una pantalla');
      return;
    }
    const duration = getSelectedDuration();
    const { total, impacts } = calculateKitMetrics(screens, duration);
    const quote = { screens, duration, total, impacts };
    const kit = await Shared.buildMediaKit(quote, state.brand, window.CONFIG || {}, KIT_STATUS.DRAFT);

    if (!kit) {
      Shared.showToast('Error al generar el media kit');
      return;
    }

    kit.client = document.getElementById('kit-client').value.trim() || 'Cliente sin nombre';
    kit.contact = document.getElementById('kit-contact').value.trim() || 'Contacto a confirmar';
    kit.archived = false;
    state.savedKits = [kit, ...state.savedKits.filter(k => k.id !== kit.id)];
    setKitStep(1);
    debouncedPersist('Media kit guardado');
  }

  /**
   * Carga un media kit existente en el constructor para su edición.
   * @param {string} kitId El ID del kit a editar.
   */
  function editKit(kitId) {
    const kit = state.savedKits.find(k => k.id === kitId);
    if (!kit) {
      Shared.showToast('No se encontró el media kit para editar.');
      return;
    }

    setSection(SECTIONS.MEDIAKITS);
    document.getElementById('kit-client').value = kit.client || '';
    document.getElementById('kit-contact').value = kit.contact || '';
    document.getElementById('kit-duration').value = kit.durationValue || '1s';
    state.kitSelected = new Set(kit.screenIds || []);
    renderKitBuilder();
    setKitStep(2); // Llevar al usuario directamente a la selección de pantallas
  }

  function renderKitHistory() {
    const activeKits = state.savedKits.filter(kit => !kit.archived);
    const archivedKits = state.savedKits.filter(kit => kit.archived);

    const renderKitRow = (kit, isArchived = false) => `
      <div class="kit-row">
        <span><strong>${h(kit.client)}</strong><br><small>${Number(kit.screens) || 0} pantallas · ${h(isArchived ? KIT_STATUS.ARCHIVED : (kit.status || KIT_STATUS.DRAFT))}</small></span>
        <span class="kit-actions">
          <strong>${fmt(kit.total)}</strong>
          <a class="kit-link" href="${Shared.getMediaKitUrl(kit.id)}" target="_blank" rel="noopener">Ver público</a>
          ${!isArchived ? `
          <button class="icon-btn" type="button" data-action="edit-kit" data-id="${h(kit.id)}">Editar</button>
            <button class="icon-btn" type="button" data-action="copy-kit" data-id="${h(kit.id)}">Copiar</button>
            <button class="icon-btn" type="button" data-action="download-kit" data-id="${h(kit.id)}">JSON</button>
            <button class="icon-btn" type="button" data-action="duplicate-kit" data-id="${h(kit.id)}">Duplicar</button>
            <button class="icon-btn pause" type="button" data-action="archive-kit" data-id="${h(kit.id)}">Archivar</button>
          ` : `<button class="icon-btn" type="button" data-action="restore-kit" data-id="${h(kit.id)}">Restaurar</button>`}
        </span>
      </div>`;

    document.getElementById('kit-history').innerHTML = activeKits.map(k => renderKitRow(k, false)).join('') || '<div class="kit-row"><span>No hay kits guardados.</span></div>';
    const archiveWrap = document.getElementById('kit-archive-wrap');
    archiveWrap.hidden = archivedKits.length === 0;
    archiveWrap.open = archivedKits.length > 0;
    document.getElementById('kit-archive-count').textContent = archivedKits.length;
    document.getElementById('kit-archive').innerHTML = archivedKits.map(k => renderKitRow(k, true)).join('');
    const active = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE);
    const totalReach = active.reduce((acc, row) => acc + imp(row), 0);
    const byZone = active.reduce((acc, row) => { acc[row.b] = (acc[row.b] || 0) + imp(row); return acc; }, {});
    const byType = active.reduce((acc, row) => { acc[row.tipo] = (acc[row.tipo] || 0) + 1; return acc; }, {});
    const colors = ['#0ea5e9', '#2dd4bf', '#a78bfa', '#e879f9', '#fb923c', '#fb7185'];

    const renderChart = (containerId, data, total, useGradient = false) => {
      const max = Math.max(...Object.values(data), 1);
      document.getElementById(containerId).innerHTML = Object.entries(data).sort((a, b) => b - a).map(([label, value], i) => {
        const width = (value / max * 100).toFixed(1);
        const percentage = ((value / (total || 1)) * 100).toFixed(1);
        const bg = useGradient ? `linear-gradient(90deg, ${colors[i % colors.length]}90, ${colors[i % colors.length]})` : colors[i % colors.length];
        return `
          <div class="chart-row">
            <div class="chart-meta"><strong>${label}</strong><span><b>${value.toLocaleString('es-AR')}</b> <small class="muted">(${percentage}%)</small></span></div>
            <div class="bar"><div class="bar-fill" style="width:${width}%; background:${bg}"></div></div>
          </div>`;
      }).join('');
    };

    renderChart('zone-chart', byZone, totalReach, true);
    renderChart('type-chart', byType, active.length);
  }

  function bindEvents() {
    document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', () => setSection(btn.dataset.section)));

    ['search', 'zone-filter', 'type-filter'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderTable);
    });

    ['kit-client', 'kit-contact', 'settings-terms'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderKitPreview);
    });

    ['kit-duration', 'kit-zone'].forEach(id => {
      document.getElementById(id).addEventListener('change', renderKitBuilder);
    });
    document.getElementById('kit-search').addEventListener('input', renderKitBuilder);

    document.addEventListener('click', event => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      const step = target.dataset.step;

      const actions = {
        'select': () => selectRow(id),
        'copy-kit': () => { const kit = state.savedKits.find(k => k.id === id); if (kit) navigator.clipboard?.writeText(new URL(Shared.getMediaKitUrl(kit.id), location.href).href).then(() => Shared.showToast('Link copiado')).catch(() => Shared.showToast('No se pudo copiar')); },
        'download-kit': () => {
          const kit = state.savedKits.find(k => k.id === id);
          if (kit) { downloadKitJson(kit); Shared.showToast('JSON descargado'); }
        },
        'duplicate-kit': () => {
          const kit = state.savedKits.find(k => k.id === id);
          if (kit) {
            const copy = { ...kit, id: `kit-copy-${Date.now()}`, status: KIT_STATUS.DRAFT, createdAt: new Date().toISOString() };
            state.savedKits = [copy, ...state.savedKits];
            renderKitHistory();
            debouncedPersist('Media kit duplicado');
          }
        },
        'archive-kit': () => {
          state.savedKits = state.savedKits.map(k => k.id === id ? { ...k, archived: true, archivedAt: new Date().toISOString() } : k);
          renderKitHistory();
          debouncedPersist('Media kit archivado');
        },
        'restore-kit': () => {
          state.savedKits = state.savedKits.map(k => k.id === id ? { ...k, archived: false, restoredAt: new Date().toISOString() } : k);
          renderKitHistory();
          debouncedPersist('Media kit restaurado');
        },
        'edit-kit': () => editKit(id)
      };
      if (action === 'set-kit-step') setKitStep(Number(step));
      if (actions[action]) actionsaction;
    });

    document.addEventListener('change', event => {
      const target = event.target.closest('[data-kit-screen]');
      if (!target) return;
      const id = Number(target.dataset.kitScreen);
      if (target.checked) state.kitSelected.add(id);
      else state.kitSelected.delete(id);
      renderKitPreview();
    });

    document.getElementById('editor-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const row = state.rows.find(item => item.id === state.selectedId);
      if (!row) return;

      // Prepara el objeto con los datos actualizados del formulario
      const updatedRowData = {
        ...row, // Mantiene los campos no editables
        n: document.getElementById('edit-name').value.trim() || row.n,
        b: document.getElementById('edit-zone').value.trim() || row.b,
        aud: document.getElementById('edit-audience').value.trim(),
        precio: Number(document.getElementById('edit-price').value) || row.precio,
        note: document.getElementById('edit-note').value.trim(),
        status: document.getElementById('edit-status').value
      };

      // Actualiza el estado local inmediatamente para una UI fluida (Optimistic Update)
      Object.assign(row, updatedRowData);

      document.getElementById('last-action').textContent = `Actualizada #${row.id}`;
      updateKpis();
      fillFilters();
      selectRow(row.id);
      renderKitBuilder();
      
      // Envía la actualización a la API como única fuente de verdad.
      // La función updateScreenAPI ya debería existir en tu código.
      await updateScreenAPI(updatedRowData);
    });

    document.getElementById('export-btn').addEventListener('click', exportCsv);
    document.getElementById('kit-save-btn').addEventListener('click', saveKit);

    document.getElementById('settings-save').addEventListener('click', () => {
      state.brand.name = document.getElementById('settings-brand').value.trim() || state.brand.name;
      state.brand.logo = document.getElementById('settings-logo').value.trim() || state.brand.logo;
      state.brand.whatsapp = document.getElementById('settings-whatsapp').value.trim() || state.brand.whatsapp;
      state.brand.terms = document.getElementById('settings-terms').value.trim();
      state.brand.validity = document.getElementById('settings-validity').value;
      applyBrand();
      renderKitPreview();
      debouncedPersist('Configuración guardada');
    });

    document.getElementById('reset-data-btn').addEventListener('click', () => {
      if (window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
        Shared.clearAllData();
      }
    });
  }
  
  function bindStepperEvents() {
    document.getElementById('btn-to-step-2').addEventListener('click', () => {
      if (validateKitStep(2)) setKitStep(2);
    });
    document.getElementById('btn-to-step-3').addEventListener('click', () => {
      if (validateKitStep(3)) setKitStep(3);
    });
  }

  async function init() {
    // --- Login Eliminado ---
    // Se asume una sesión iniciada. Se crea un token simulado si no existe
    // para asegurar que las llamadas a la API (authedFetch) funcionen.
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      console.warn('Login omitido: Creando token de sesión simulado.');
      const fakeToken = `dev-token.${btoa(JSON.stringify({ userId: 'dev-user', role: 'admin' }))}.dev-signature`;
      localStorage.setItem(AUTH_TOKEN_KEY, fakeToken);
    }

    document.getElementById('app').style.display = 'grid';
    document.body.style.visibility = 'visible';
    await loadInitialData();
    applyBrand();
    fillFilters();
    updateKpis();
    bindEvents();
    bindStepperEvents();

    document.getElementById('settings-brand').value = state.brand.name;
    document.getElementById('settings-logo').value = state.brand.logo;
    document.getElementById('settings-whatsapp').value = state.brand.whatsapp || '';
    document.getElementById('settings-terms').value = state.brand.terms || '';
    document.getElementById('settings-validity').value = state.brand.validity || '15 dias';

    renderKitHistory();
    renderKitBuilder();
    selectRow(state.selectedId);
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', DashboardApp.init);