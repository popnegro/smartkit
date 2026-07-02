const SmartKitShared = (() => {
  const DURATIONS = [
    {v:'1s', l:'1 semana', mult:1, days:7},
    {v:'15d', l:'15 días', mult:2, days:15},
    {v:'1m', l:'1 mes', mult:4, days:30}
  ];
  const DASHBOARD_STORAGE_KEY = 'smartkit-dashboard-state';

  const DEFAULT_BRAND = {
    name: 'SmartKit',
    logo: 'SK',
    whatsapp: '5492613871088',
    heroCopy: 'Planifica campañas DOOH, selecciona ubicaciones digitales y genera una reserva comercial en minutos.',
    terms: 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas. Valores expresados en ARS.',
    validity: '15 días'
  };
  const PUBLIC_KITS_STORAGE_KEY = 'smartkit-public-kits';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function getMediaKitUrl(kitId) {
    const basePath = window.CONFIG?.basePath || '';
    const relativePath = basePath ? `${basePath}/mediakit.html` : './mediakit.html';
    return `${relativePath}?id=${encodeURIComponent(kitId)}`;
  }

  function showToast(message) {
    const toast = document.getElementById('toast') || document.createElement('div');
    if (!toast.id) { toast.id = 'toast'; document.body.appendChild(toast); }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
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
    return parseInt(String(screen.imp || '0').replace(/\./g, ''), 10) || 0;
  }

  function formatMoney(value) {
    return '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
  }

  function applyBrandHeader(brand = DEFAULT_BRAND) {
    const logo = document.getElementById('brand-logo');
    const name = document.getElementById('brand-name');
    if (logo) logo.textContent = brand.logo || DEFAULT_BRAND.logo;
    if (name) name.textContent = brand.name || DEFAULT_BRAND.name;
  }

  function safeAssetUrl(value) {
    const url = String(value || '');
    return /^(assets\/|\.\/assets\/|https:\/\/)/.test(url) ? url : '';
  }

  function safeBackground(value) {
    const bg = String(value || '');
    return bg.startsWith('linear-gradient(') ? bg : '';
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
      impactsDay: screen.imp,
      priceWeek: screen.precio,
      subtotal: Math.round(screen.precio * duration.mult),
      video: screen.video || '',
      gradient: screen.g || '',
      initials: screen.e || ''
    };
  }

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
    const signer = options.signer || kit.brand?.name || DEFAULT_BRAND.name;
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
    const signer = signature.signer || options.signer || kit.brand?.name || DEFAULT_BRAND.name;
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

  return {
    DEFAULT_BRAND,
    DURATIONS,
    DASHBOARD_STORAGE_KEY,
    PUBLIC_KITS_STORAGE_KEY,
    applyBrandHeader,
    escapeHtml,
    debounce,
    getMediaKitUrl,
    formatMoney,
    impNum,
    mediaHtml,
    safeAssetUrl,
    safeBackground,
    screenSnapshot,
    showToast,
    signMediaKit,
    verifyMediaKitSignature,
    clearAllData
  };
})();

window.SmartKitShared = SmartKitShared;
