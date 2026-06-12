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
    const apiEndpoint = (window.APP_CONFIG?.api?.screensUrl) || 'https://api.ejemplo.com/v1/screens';
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

  function formatMoney(value) {
    return '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
  }

  async function isAuthenticated() {
    const storage = getAuthStorage();
    if (storage.getItem(AUTH_SESSION_KEY) === 'true') return true;
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
    const masterKey = window.APP_CONFIG?.adminKey || 'admin2026';
    if (devMode && !password) {
      storage.setItem(AUTH_SESSION_KEY, 'true');
      return true;
    }
    if (password === masterKey) {
      storage.setItem(AUTH_SESSION_KEY, 'true');
      return true;
    }
    const client = getSupabase();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return !!data.session;
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

  async function signMediaKit(kit, options = {}) {
    // Simulación de firma digital (Placeholder para evitar errores en app.js)
    return {
      state: 'valid',
      signer: options.signer || 'SmartKit System',
      algorithm: 'HS256-Simulated',
      signedAt: new Date().toISOString(),
      hash: btoa(JSON.stringify(kit.id)).slice(0, 32),
      value: 'sim-sig-' + Math.random().toString(36).slice(2)
    };
  }

  async function verifyMediaKitSignature(kit) {
    // Verificación simulada para mediakit.js
    return kit.digitalSignature || { state: 'unsigned' };
  }

  return {
    DEFAULT_BRAND,
    PUBLIC_KITS_STORAGE_KEY,
    applyBrandHeader,
    isAuthenticated,
    login,
    logout,
    isExpired,
    fetchScreens,
    escapeHtml,
    formatMoney,
    markerHtml,
    latestMediaKitId,
    signMediaKit,
    verifyMediaKitSignature,
    safeAssetUrl,
    safeBackground,
    screenSnapshot,
    storedPublicKits,
    updateMediaKitLinks
  };
})();

window.SmartKitShared = SmartKitShared;