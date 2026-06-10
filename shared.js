const SmartKitShared = (() => {
  const DEFAULT_BRAND = {
    name: 'SmartKit',
    logo: 'SK',
    whatsapp: '5492613871088',
    heroCopy: 'Planifica campañas DOOH, selecciona ubicaciones digitales y genera una reserva comercial en minutos.'
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

  function formatMoney(value) {
    return '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
  }

  function storedPublicKits() {
    try { return JSON.parse(localStorage.getItem(PUBLIC_KITS_STORAGE_KEY) || '[]') || []; }
    catch { return []; }
  }

  function latestMediaKitId(currentId = '') {
    const kits = storedPublicKits();
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

  return {
    DEFAULT_BRAND,
    PUBLIC_KITS_STORAGE_KEY,
    applyBrandHeader,
    escapeHtml,
    formatMoney,
    latestMediaKitId,
    mediaHtml,
    safeAssetUrl,
    safeBackground,
    screenSnapshot,
    storedPublicKits,
    updateMediaKitLinks
  };
})();

window.SmartKitShared = SmartKitShared;
