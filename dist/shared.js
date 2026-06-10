const SmartKitShared = (() => {
  const DEFAULT_BRAND = {
    name: 'SmartKit DOOH',
    logo: 'SK',
    whatsapp: '5492613871088',
    heroCopy: 'Selecciona pantallas, estima impactos y genera propuestas DOOH listas para enviar al cliente.'
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

  function signaturePayload(kit) {
    const {
      digitalSignature,
      signature,
      status,
      ...payload
    } = kit || {};
    return payload;
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
  }

  function toHex(buffer) {
    return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return toHex(digest);
  }

  async function signMediaKit(kit, options = {}) {
    const payload = stableStringify(signaturePayload(kit));
    const hash = await sha256Hex(payload);
    const secret = String(options.secret || '');
    if (!secret) return { algorithm: 'SHA-256', hash, signed: false };
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return {
      algorithm: 'HMAC-SHA-256',
      signer: options.signer || 'SmartKit',
      hash,
      value: toHex(signature),
      signedAt: new Date().toISOString()
    };
  }

  async function verifyMediaKitSignature(kit, options = {}) {
    const expected = await signMediaKit(kit, options);
    const current = kit?.digitalSignature;
    if (!current?.value) return { state: 'unsigned', ...expected };
    const valid = current.algorithm === expected.algorithm && current.hash === expected.hash && current.value === expected.value;
    return {
      state: valid ? 'valid' : 'invalid',
      algorithm: current.algorithm || expected.algorithm,
      signer: current.signer || expected.signer,
      hash: expected.hash,
      value: current.value,
      signedAt: current.signedAt || '',
      expectedValue: expected.value
    };
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
    sha256Hex,
    signMediaKit,
    screenSnapshot,
    signaturePayload,
    storedPublicKits,
    verifyMediaKitSignature,
    updateMediaKitLinks
  };
})();

window.SmartKitShared = SmartKitShared;
