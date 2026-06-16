const SmartKitShared = (() => {
  const DEFAULT_BRAND = {
    name: 'SmartKit',
    logo: 'SK',
    whatsapp: '5492613871088',
    heroCopy: 'Planifica campañas DOOH, selecciona ubicaciones digitales y genera una reserva comercial en minutos.'
  };

  // Namespacing para evitar colisiones en localhost con otras aplicaciones
  const STORAGE_PREFIX = 'sk_v1_'; 
  const PUBLIC_KITS_STORAGE_KEY = `${STORAGE_PREFIX}public-kits`;
  const DASHBOARD_STORAGE_KEY = `${STORAGE_PREFIX}dashboard-state`;
  const AUTH_SESSION_KEY = `${STORAGE_PREFIX}admin-session`;

  const TIPO_COL = {
    Peatonal: '#0891b2',
    Vehicular: '#b45309',
    Mixto: '#4f46e5'
  };

  // Placeholder para fechas reservadas. En producción, esto vendría de una API.
  const RESERVED_DATES = [
    "2024-08-01", // Fecha específica
    "2024-08-10 to 2024-08-15", // Rango de fechas
    "2024-09-01",
    "2024-09-05 to 2024-09-07"
  ];

  // Mapeo de estados para UI de Dashboard
  const STATUS_THEMES = {
    'Activo': { bg: '#dcfce7', text: '#166534', icon: 'check_circle' },
    'Pausado': { bg: '#f1f5f9', text: '#475569', icon: 'pause_circle' },
    'Mantenimiento': { bg: '#fef9c3', text: '#854d0e', icon: 'build' }
  };

  // Helper para detectar si el usuario prefiere movimiento reducido
  const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Helper para detectar entornos locales o de staging (Developer Experience)
  const isDev = () => 
    window.APP_CONFIG?.isStaging || 
    ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(location.hostname) ||
    location.hostname.endsWith('.local') ||
    location.protocol === 'file:';

  // DX: En localhost/staging usamos localStorage para persistir la sesión al refrescar el navegador.
  const getAuthStorage = () => 
    isDev() 
    ? localStorage : sessionStorage;

  let supabase = null;
  function getSupabase() {
    if (supabase) return supabase;
    const conf = window.APP_CONFIG?.supabase;
    
    // Si la URL es la de ejemplo o no está definida, no inicializamos el cliente
    const isPlaceholder = !conf?.url || conf.url.includes('tu-proyecto');
    if (!isPlaceholder && conf?.anonKey && window.supabase) {
      supabase = window.supabase.createClient(conf.url, conf.anonKey);
    }
    return supabase;
  }

  async function fetchScreens(options = {}) {
    const apiEndpoint = window.APP_CONFIG?.api?.screensUrl || 
      (isDev() ? '/api/screens' : 'https://api.smartkit.io/v1/screens');

    const cacheName = 'smartkit-inventory-v1';
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const force = options.forceRefresh === true;

    // 1. En el Dashboard, si forzamos o no hay soporte de caché, fetch directo
    if (!('caches' in window) || isDashboard || force) {
      const fetchOptions = force ? { cache: 'no-store' } : {};
      return fetch(apiEndpoint, fetchOptions).then(async r => {
        if (r.ok && 'caches' in window) {
          const cache = await caches.open(cacheName);
          await cache.put(apiEndpoint, r.clone());
        }
        return r.json();
      }).catch(() => typeof SCREENS !== 'undefined' ? SCREENS : []);
    }
    
    try {
      const cache = await caches.open(cacheName);
      const cachedResponse = await cache.match(apiEndpoint);

      // 3. Si existe en caché, devolverlo inmediatamente (Instant Load)
      if (cachedResponse) {
        const cachedData = await cachedResponse.json();
        console.log('Shared: Cargando inventario desde caché...');

        // Revalidación en segundo plano
        fetch(apiEndpoint).then(async (networkResponse) => {
          if (networkResponse.ok) {
            const freshData = await networkResponse.clone().json();
            
            // Comparación de integridad para detectar cambios
            if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
              await cache.put(apiEndpoint, networkResponse);
              console.log('Shared: Detectada nueva versión del inventario.');
              window.dispatchEvent(new CustomEvent('smartkit:inventory-updated', { 
                detail: { screens: freshData } 
              }));
            }
          }
        }).catch(err => console.warn('Shared: Error en revalidación:', err));

        return cachedData;
      }

      // 4. Si no hay caché, esperar a la red (Primera visita)
      const networkResponse = await fetch(apiEndpoint);
      if (networkResponse.ok) {
        await cache.put(apiEndpoint, networkResponse.clone());
        return await networkResponse.json();
      }
      throw new Error('Red no disponible');
    } catch (error) {
      console.error('Error cargando inventario:', error);
      return typeof SCREENS !== 'undefined' ? SCREENS : []; // Fallback al archivo local si existe
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  // Nueva utilidad para Toasts mejorados
  function notify(message, type = 'success') {
    const event = new CustomEvent('smartkit:notify', { 
      detail: { message, type, id: Date.now() } 
    });
    window.dispatchEvent(event);
  }

  function formatMoney(value) {
    return '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
  }

  async function isAuthenticated() {
    const storage = getAuthStorage();
    // Verificamos si existe un token JWT o una sesión de desarrollo activa
    if (storage.getItem(AUTH_SESSION_KEY)) return true;
    const client = getSupabase();
    if (client) {
      try {
        const { data: { session } } = await client.auth.getSession();
        return !!session;
      } catch (e) { return false; }
    }
    return false;
  }

  async function login(email, password) {
    const storage = getAuthStorage();
    const devMode = isDev();

    // 1. Intento de autenticación mediante el Servidor Express (JWT)
    const apiBase = window.APP_CONFIG?.api?.baseUrl || '';

    try {
      const response = await fetch(`${apiBase}/api/auth/login`.replace('//', '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const { token } = await response.json();
        if (token) {
          storage.setItem(AUTH_SESSION_KEY, token);
          return true;
        }
      }
    } catch (e) {
      // DX: Solo loguear en desarrollo para no ensuciar la consola de producción
      if (devMode) console.warn('Auth API no disponible, probando fallbacks...');
    }

    // 2. Fallback: Autenticación con Supabase (si está configurado)
    const client = getSupabase();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (!error && data.session) return true;
    }

    // 3. Fallback: Master Key (Solo para entornos de desarrollo/staging)
    const masterKey = window.APP_CONFIG?.adminKey || 'admin2026';
    if (devMode && (password === masterKey || (!password && !email))) {
      storage.setItem(AUTH_SESSION_KEY, 'dev-session-active');
      return true;
    }

    return false;
  }

  async function logout() {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    location.href = './index.html';
  }

  function storedPublicKits() {
    try { return JSON.parse(localStorage.getItem(PUBLIC_KITS_STORAGE_KEY) || '[]') || []; }
    catch { return []; }
  }

  function latestMediaKitId(currentId = '') {
    const kits = storedPublicKits().filter(kit => !kit.archived);
    return currentId || kits[0]?.id || '';
  }

  function updateMediaKitLinks(id = latestMediaKitId()) {
    const href = id ? `./mediakit.html?id=${encodeURIComponent(id)}` : './mediakit.html';
    document.querySelectorAll('[data-mediakit-link]').forEach(link => {
      link.setAttribute('href', href);
    });
  }

  function applyBrandHeader(brand = DEFAULT_BRAND) {
    const logo = document.getElementById('brand-logo');
    const name = document.getElementById('brand-name');
    const dashLogo = document.getElementById('dash-logo');
    const dashBrand = document.getElementById('dash-brand');
    if (logo) logo.textContent = brand.logo || DEFAULT_BRAND.logo;
    if (name) name.textContent = brand.name || DEFAULT_BRAND.name;
    if (dashLogo) dashLogo.textContent = brand.logo || DEFAULT_BRAND.logo;
    if (dashBrand) dashBrand.textContent = brand.name || DEFAULT_BRAND.name;
    if (brand.theme) {
      const root = document.documentElement;
      if (brand.theme.primary) root.style.setProperty('--brand-primary', brand.theme.primary);
      if (brand.theme.primaryStrong) root.style.setProperty('--brand-primary-strong', brand.theme.primaryStrong);
    }
    if (brand.name) document.title = document.title.replace('SmartKit', brand.name);
  }

  function safeAssetUrl(value) {
    const url = String(value || '');
    return /^(assets\/|\.\/assets\/|https:\/\/)/.test(url) ? url : '';
  }

  function isExpired(isoDate) {
    if (!isoDate) return false;
    const limit = new Date(isoDate);
    limit.setHours(23, 59, 59, 999);
    return new Date() > limit;
  }

  function safeBackground(value) {
    const bg = String(value || '');
    return bg.startsWith('linear-gradient(') ? bg : '';
  }

  function markerHtml(s) {
    return `<div class="marker" style="color:${TIPO_COL[s.type] || '#334155'}; border-color: currentColor;">${s.initials || '•'}</div>`;
  }

  // Helper para videos, usado en brochure y mediakit
  function screenVideoHtml(s, eager = false) {
    const videoUrl = safeAssetUrl(s.video);
    if (!videoUrl) return `<span>${escapeHtml(s.e)}</span>`;
    const sourceAttr = eager && !prefersReducedMotion() ? `src="${escapeHtml(videoUrl)}"` : `data-src="${escapeHtml(videoUrl)}"`;
    const autoplay = prefersReducedMotion() ? '' : 'autoplay';
    const preload = eager ? 'metadata' : 'none';
    return `<span class="media-fallback" aria-hidden="true">${escapeHtml(s.e)}</span><video ${sourceAttr} ${autoplay} muted loop playsinline preload="${preload}" aria-label="Video de ${escapeHtml(s.n)}" onerror="this.hidden=true"></video>`;
  }

  // Carga videos de forma lazy
  function loadLazyVideos(root = document) {
    const videos = [...root.querySelectorAll('video[data-src]')];
    if (!videos.length) return;
    const load = video => {
      if (video.src) return;
      video.src = video.dataset.src;
      video.removeAttribute('data-src');
      video.load();
      if (!prefersReducedMotion()) video.play().catch(() => {});
    };
    if (!('IntersectionObserver' in window)) { videos.slice(0, 4).forEach(load); return; }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { load(entry.target); observer.unobserve(entry.target); } });
    }, { rootMargin: '220px' });
    videos.forEach(video => observer.observe(video));
  }
  function screenSnapshot(screen, duration = { mult: 1 }) {
    return {
      id: screen.id,
      name: screen.n,
      zone: screen.b,
      address: screen.dir,
      type: screen.tipo,
      format: screen.dim,
      resolution: screen.res,
      lat: screen.lat,
      lng: screen.lng,
      impactsDay: screen.imp,
      priceWeek: screen.precio,
      subtotal: Math.round(screen.precio * duration.mult),
      video: screen.video || '',
      gradient: screen.g || '',
      initials: screen.e || ''
    };
  }

  /**
   * Genera una representación canónica del objeto (ordenando llaves)
   * para que el hash sea idéntico al generado por el backend.
   */
  function canonicalKit(kit) {
    const { digitalSignature, ...payload } = kit;
    return JSON.stringify(payload, Object.keys(payload).sort());
  }

  // Reference to the API client, will be available after api-client.js loads
  let SmartKitApi = null;
  // Function to get the API client, ensuring it's loaded
  function getSmartKitApi() {
    if (!SmartKitApi && window.SmartKitApi) {
      SmartKitApi = window.SmartKitApi;
    }
    return SmartKitApi;
  }
  async function signMediaKit(kit, options = {}) {
    const api = getSmartKitApi();
    if (api) {
      try {
        // Send the kit payload to the backend for signing
        const signature = await api.signMediaKit(kit);
        return signature;
      } catch (e) {
        console.error('Error al firmar Media Kit con el backend:', e);
        notify('Error al firmar Media Kit (backend no disponible)', 'error');
      }
    }
    // Fallback if API is not available or fails: return an unsigned state
    return { state: 'unsigned', signer: 'Client-side (untrusted)', algorithm: 'None', signedAt: new Date().toISOString(), hash: '', isTrusted: false, value: '' };
  }

  async function verifyMediaKitSignature(kit, options = {}) {
    if (!kit.digitalSignature) return { state: 'unsigned' };
    
    const api = getSmartKitApi();
    if (api) {
      try {
        // Send the kit payload and its existing signature to the backend for verification
        const verificationResult = await api.verifyMediaKitSignature(kit, kit.digitalSignature);
        return verificationResult;
      } catch (e) {
        console.error('Error al verificar firma con el backend:', e);
        notify('Error al verificar firma (backend no disponible)', 'error');
      }
    }

    // Fallback if API is not available or fails: assume unsigned
    return { ...kit.digitalSignature, state: 'unsigned', isTrusted: false };
  }

  function getReservedDates() {
    return RESERVED_DATES;
  }

  // Helper para generar el HTML del head de una card/preview con video
  function mediaHtml(s, className, overlay = '', eager = className === 'media') {
    const background = safeBackground(s.g);
    return `<div class="${className} video-head" style="background:${background}">${screenVideoHtml(s, eager)}${overlay}</div>`;
  }

  return {
    DEFAULT_BRAND,
    PUBLIC_KITS_STORAGE_KEY,
    DASHBOARD_STORAGE_KEY,
    STATUS_THEMES,
    applyBrandHeader,
    isAuthenticated,
    login,
    logout,
    isExpired,
    fetchScreens,
    escapeHtml,
    notify,
    formatMoney,
    markerHtml,
    latestMediaKitId,
    signMediaKit,
    verifyMediaKitSignature,
    safeAssetUrl,
    safeBackground,
    screenSnapshot,
    storedPublicKits,
    updateMediaKitLinks,
    getReservedDates // Exponemos la función
  };
})();

window.SmartKitShared = SmartKitShared;