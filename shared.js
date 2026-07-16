/* ══════════════════════════════════════════════════════════════
   SmartKit Shared Logic
   Única fuente de verdad para datos, estado y funciones de UI.
═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const h = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-AR');
  const impNum = s => typeof s.imp === 'string' ? Number(s.imp.replace(/\./g, '')) : (s.imp || 0);

  const DEFAULT_BRAND = Object.freeze({
    name: 'SmartKit',
    logo: 'SK',
    whatsapp: '5492616000000',
    heroCopy: 'Planificá campañas DOOH, seleccioná ubicaciones digitales y generá una propuesta comercial en minutos.',
    terms: 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas creativas. Valores expresados en ARS. Propuesta válida por 15 días.',
    validity: '15 dias'
  });

  const DURATIONS = [
    { v: '1s', l: '1 semana', mult: 1, days: 7 },
    { v: '2s', l: '2 semanas', mult: 2, days: 14 },
    { v: '1m', l: '1 mes (4 sem)', mult: 4, days: 28 },
    { v: '2m', l: '2 meses (8 sem)', mult: 8, days: 56 },
    { v: '1t', l: '1 trimestre (12 sem)', mult: 12, days: 84 },
  ];

  const TIPO_COL = { Peatonal: '#0369a1', Vehicular: '#0f766e', Mixto: '#7c3aed', Indoor: '#166534' };

  const safeAssetUrl = (path) => {
    if (!path || typeof path !== 'string') return '';
    // Previene XSS y asegura que la URL sea relativa al proyecto.
    return path.startsWith('./assets/') ? path : '';
  };

  const safeBackground = (grad) => {
    if (!grad || typeof grad !== 'string' || !grad.startsWith('linear-gradient')) return 'var(--pri-dk)';
    return grad;
  };

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const showToast = (message, type = 'info') => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 2800);
  };

  const loadDashboardState = () => {
    try {
      const stateJSON = localStorage.getItem('smartkit-dashboard-state');
      return stateJSON ? JSON.parse(stateJSON) : null;
    } catch (e) {
      console.error("Error al cargar el estado del dashboard:", e);
      return null;
    }
  };

  const persistDashboardState = (state, message) => {
    try {
      localStorage.setItem('smartkit-dashboard-state', JSON.stringify(state));
      if (message) showToast(message, 'ok');
    } catch (e) {
      console.error("Error al guardar el estado del dashboard:", e);
      showToast('Error al guardar cambios', 'err');
    }
  };

  const loadInventory = async () => {
    const savedState = loadDashboardState();
    if (savedState && savedState.rows && savedState.rows.length > 0) {
      console.log('Inventario cargado desde localStorage.');
      return savedState.rows;
    }
    console.log('Cargando inventario desde el archivo de datos.');
    // Los datos ahora están hardcodeados aquí para ser la única fuente de verdad.
    const BASE_SCREENS = [
        {"id":1,"lat":-32.8931,"lng":-68.8449,"n":"Peatonal Sarmiento","b":"Microcentro","dir":"Peatonal Sarmiento 150","dim":"8x4 m","res":"Full HD","imp":"52.000","precio":95000,"tipo":"Peatonal","e":"PS","g":"linear-gradient(135deg,#075985,#0f766e)","video":"./assets/videos/peatonal-sarmiento.mp4","aud":"Turistas","active":true},
        {"id":2,"lat":-32.8890,"lng":-68.8442,"n":"San Martin & Belgrano","b":"Microcentro","dir":"Av. San Martin 600","dim":"6x3 m","res":"Full HD","imp":"38.000","precio":80000,"tipo":"Vehicular","e":"SB","g":"linear-gradient(135deg,#0f766e,#14532d)","video":"./assets/videos/sarmiento-y-belgrano.mp4","aud":"Conductores","active":true},
        {"id":3,"lat":-32.8908,"lng":-68.8388,"n":"Plaza Independencia","b":"Microcentro","dir":"Plaza Independencia Este","dim":"10x5 m","res":"4K UHD","imp":"68.000","precio":140000,"tipo":"Mixto","e":"PI","g":"linear-gradient(135deg,#0369a1,#4f46e5)","video":"./assets/videos/plaza-independencia.mp4","aud":"Familias","active":true},
        {"id":4,"lat":-32.8866,"lng":-68.8328,"n":"Terminal de Omnibus","b":"Microcentro","dir":"Av. G. Videla s/n","dim":"5x2.5 m","res":"Full HD","imp":"29.000","precio":65000,"tipo":"Peatonal","e":"TO","g":"linear-gradient(135deg,#164e63,#0f766e)","video":"./assets/videos/chacras.mp4","active":true},
        {"id":5,"lat":-32.8831,"lng":-68.8358,"n":"Av. Las Heras & Espana","b":"Microcentro","dir":"Av. Las Heras 800","dim":"6x3 m","res":"Full HD","imp":"33.000","precio":72000,"tipo":"Vehicular","e":"LH","g":"linear-gradient(135deg,#92400e,#075985)","video":"./assets/videos/maipu.mp4","active":true},
        {"id":6,"lat":-32.8950,"lng":-68.8410,"n":"Av. Colon & Catamarca","b":"Microcentro","dir":"Av. Colon 1200","dim":"4x2 m","res":"HD Ready","imp":"21.000","precio":55000,"tipo":"Vehicular","e":"CC","g":"linear-gradient(135deg,#075985,#334155)","video":"./assets/videos/palmares.mp4","active":true},
        {"id":7,"lat":-32.8532,"lng":-68.8344,"n":"Palmares Open Mall","b":"Las Heras","dir":"Acceso Norte km 8","dim":"12x6 m","res":"4K UHD","imp":"75.000","precio":165000,"tipo":"Mixto","e":"PO","g":"linear-gradient(135deg,#0f766e,#0369a1)","video":"./assets/videos/palmares.mp4","active":true},
        {"id":8,"lat":-32.8590,"lng":-68.8390,"n":"Las Heras Centro","b":"Las Heras","dir":"Av. Mitre 400","dim":"5x2.5 m","res":"Full HD","imp":"18.000","precio":48000,"tipo":"Peatonal","e":"LH","g":"linear-gradient(135deg,#075985,#0f766e)","video":"./assets/videos/peatonal-sarmiento.mp4","active":false,"aud":"Compradores"},
        {"id":9,"lat":-32.8650,"lng":-68.8310,"n":"Av. Viamonte Norte","b":"Las Heras","dir":"Av. Viamonte 2000","dim":"6x3 m","res":"Full HD","imp":"24.000","precio":58000,"tipo":"Vehicular","e":"VN","g":"linear-gradient(135deg,#92400e,#164e63)","video":"./assets/videos/plaza-independencia.mp4","active":false,"aud":"Conductores"},
        {"id":10,"lat":-32.9183,"lng":-68.8397,"n":"Godoy Cruz Centro","b":"Godoy Cruz","dir":"Av. San Martin 3500","dim":"6x3 m","res":"Full HD","imp":"31.000","precio":70000,"tipo":"Vehicular","e":"GC","g":"linear-gradient(135deg,#075985,#0f766e)","video":"./assets/videos/sarmiento-y-belgrano.mp4","active":true},
        {"id":11,"lat":-32.9092,"lng":-68.8411,"n":"Estadio Malvinas Argentinas","b":"Godoy Cruz","dir":"Irigoyen 8151","dim":"8x4 m","res":"Full HD","imp":"44.000","precio":92000,"tipo":"Mixto","e":"EM","g":"linear-gradient(135deg,#4f46e5,#075985)","video":"./assets/videos/palmares.mp4","active":false,"aud":"Eventos"},
        {"id":12,"lat":-32.9150,"lng":-68.8450,"n":"Boulogne Sur Mer","b":"Godoy Cruz","dir":"Av. Boulogne Sur Mer 1500","dim":"4x2 m","res":"HD Ready","imp":"19.000","precio":52000,"tipo":"Vehicular","e":"BM","g":"linear-gradient(135deg,#334155,#075985)","video":"./assets/videos/chacras.mp4","active":false,"aud":"Conductores"},
        {"id":13,"lat":-32.8894,"lng":-68.8094,"n":"Mendoza Plaza Shopping","b":"Guaymallen","dir":"Acceso Este 3280","dim":"10x5 m","res":"4K UHD","imp":"72.000","precio":158000,"tipo":"Mixto","e":"MP","g":"linear-gradient(135deg,#0369a1,#0f766e)","video":"./assets/videos/plaza-independencia.mp4","active":true},
        {"id":14,"lat":-32.8775,"lng":-68.7900,"n":"Acceso Este km 5","b":"Guaymallen","dir":"Ruta Nacional 7 km 5","dim":"8x4 m","res":"Full HD","imp":"58.000","precio":110000,"tipo":"Vehicular","e":"AE","g":"linear-gradient(135deg,#92400e,#075985)","video":"./assets/videos/sarmiento-y-belgrano.mp4","active":false,"aud":"Conductores"},
        {"id":15,"lat":-32.8820,"lng":-68.8150,"n":"Acceso Este & Olascoaga","b":"Guaymallen","dir":"Av. Acceso Este 1500","dim":"6x3 m","res":"Full HD","imp":"35.000","precio":76000,"tipo":"Vehicular","e":"AO","g":"linear-gradient(135deg,#164e63,#92400e)","video":"./assets/videos/maipu.mp4","active":false,"aud":"Conductores"},
        {"id":16,"lat":-32.9500,"lng":-68.7950,"n":"Maipu Centro","b":"Maipu","dir":"Av. Urquiza 1200","dim":"5x2.5 m","res":"Full HD","imp":"16.000","precio":44000,"tipo":"Mixto","e":"MC","g":"linear-gradient(135deg,#166534,#075985)","video":"./assets/videos/maipu.mp4","active":true},
        {"id":17,"lat":-32.9600,"lng":-68.7750,"n":"Ruta 7 Maipu","b":"Maipu","dir":"Ruta Nacional 7 km 15","dim":"8x4 m","res":"Full HD","imp":"42.000","precio":88000,"tipo":"Vehicular","e":"R7","g":"linear-gradient(135deg,#92400e,#334155)","video":"./assets/videos/maipu.mp4","active":false,"aud":"Conductores"},
        {"id":18,"lat":-32.9700,"lng":-68.8600,"n":"Lujan de Cuyo Centro","b":"Lujan de Cuyo","dir":"Av. San Martin 1100","dim":"5x2.5 m","res":"Full HD","imp":"14.000","precio":40000,"tipo":"Mixto","e":"LC","g":"linear-gradient(135deg,#166534,#0f766e)","video":"./assets/videos/chacras.mp4","active":true},
        {"id":19,"lat":-32.9500,"lng":-68.8500,"n":"Carrodilla Lujan","b":"Lujan de Cuyo","dir":"Ruta Provincial 15 km 3","dim":"6x3 m","res":"Full HD","imp":"22.000","precio":60000,"tipo":"Vehicular","e":"CL","g":"linear-gradient(135deg,#0f766e,#334155)","video":"./assets/videos/chacras.mp4","active":false,"aud":"Conductores"},
        {"id":20,"lat":-32.8300,"lng":-68.8200,"n":"Acceso Norte Ruta 40","b":"Las Heras Norte","dir":"Ruta Nacional 40 km 1085","dim":"10x5 m","res":"4K UHD","imp":"55.000","precio":120000,"tipo":"Mixto","e":"AN","g":"linear-gradient(135deg,#075985,#92400e)","video":"./assets/videos/palmares.mp4","active":false,"aud":"Conductores"},
        {"id":21,"lat":-32.8910,"lng":-68.8430,"n":"Galeria Tonsa","b":"Microcentro","dir":"Av. San Martin 1150","dim":"2x1.5 m","res":"Full HD","imp":"12.000","precio":35000,"tipo":"Indoor","e":"GT","g":"linear-gradient(135deg,#16a34a,#166534)","video":"","active":true},
        {"id":22,"lat":-32.98,"lng":-68.87,"n":"Plaza de Chacras","b":"Chacras de Coria","dir":"Frente a la plaza principal","dim":"7x3.5 m","res":"Full HD","imp":"41.000","precio":89000,"tipo":"Mixto","e":"CH","g":"linear-gradient(135deg,#166534,#4f46e5)","video":"./assets/videos/chacras.mp4","aud":"Residentes y Turistas","active":true}
    ];
    return BASE_SCREENS;
  };

  const clearAllData = () => {
    localStorage.removeItem('smartkit-dashboard-state');
    showToast('Datos reseteados. Recargando...', 'ok');
    setTimeout(() => window.location.reload(), 1000);
  };

  const getMediaKitUrl = (kitId) => {
    return kitId ? `./mediakit.html?id=${encodeURIComponent(kitId)}` : '#';
  };

  const updateMediaKitLinks = () => {
    const savedState = loadDashboardState();
    const lastKit = savedState?.kits?.[0];
    const navKitLink = document.getElementById('nav-kit');
    if (navKitLink) {
      if (lastKit) {
        navKitLink.href = getMediaKitUrl(lastKit.id);
        navKitLink.style.display = '';
      } else {
        navKitLink.style.display = 'none';
      }
    }
  };

  const buildMediaKit = async (quote, brand, config, status) => {
    const { screens, duration, total, impacts } = quote;
    if (!screens || screens.length === 0) return null;
    const now = new Date();
    const validityDays = brand.validity ? parseInt(brand.validity, 10) : 15;
    const validUntil = new Date(now.getTime() + validityDays * 86400000);

    const kit = {
      id: `kit-draft-${Date.now()}`,
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString(),
      client: 'Cliente',
      contact: '',
      brandName: brand.name,
      brandLogo: brand.logo,
      durationLabel: duration.l,
      durationValue: duration.v,
      screens: screens.length,
      screenIds: screens.map(s => s.id),
      screenDetails: screens.map(s => ({
        id: s.id, n: s.n, b: s.b, tipo: s.tipo, imp: s.imp, precio: s.precio,
        lat: s.lat, lng: s.lng, dim: s.dim, res: s.res
      })),
      total: total,
      impacts: impacts,
      terms: brand.terms,
      status: status,
    };
    return kit;
  };

  const applyBrandHeader = (brandData) => {
    const state = loadDashboardState();
    const brand = brandData || state?.brand || DEFAULT_BRAND;
    const logoEl = document.getElementById('brand-logo');
    const nameEl = document.getElementById('brand-name');
    if (logoEl) logoEl.textContent = brand.logo || DEFAULT_BRAND.logo;
    if (nameEl) nameEl.textContent = brand.name || DEFAULT_BRAND.name;
  };

  const renderMediaKitPage = async (kit, config) => {
    // Esta función ahora vive aquí para ser reutilizable.
    // El mediakit.js original puede ser simplificado para solo llamar a esto.
    const app = document.getElementById('app');
    if (!app) return;

    const isExpired = new Date(kit.validUntil) < new Date();
    const kpis = [
      { l: 'Pantallas', v: kit.screens },
      { l: 'Duración', v: kit.durationLabel },
      { l: 'Impactos', v: Math.round(kit.impacts).toLocaleString('es-AR') },
      { l: 'Inversión', v: fmt(kit.total) },
    ];

    app.innerHTML = `
      <div class="mk-hero">
        <p class="mk-eyebrow">Propuesta para</p>
        <h1>${h(kit.client)}</h1>
        <p class="mk-hero-meta">Generada: ${new Date(kit.createdAt).toLocaleDateString('es-AR')} · Válida hasta: ${new Date(kit.validUntil).toLocaleDateString('es-AR')}</p>
        ${isExpired ? '<span class="expired-badge">Propuesta Expirada</span>' : ''}
      </div>
      <div class="mk-kpis">${kpis.map(k => `<div class="mk-kpi"><b>${h(k.v)}</b><span>${h(k.l)}</span></div>`).join('')}</div>
      <div class="mk-section">
        <div class="mk-section-head"><h2>Detalle de Pantallas</h2></div>
        <div id="mk-map" class="no-print"></div>
        <div class="mk-screen-list">${kit.screenDetails.map(s => `
          <div class="mk-screen">
            <div class="mk-screen-icon">${h(s.e || s.n.substring(0,2))}</div>
            <div class="mk-screen-info"><strong>${h(s.n)}</strong><span>${h(s.b)} · ${h(s.tipo)}</span></div>
            <div class="mk-screen-price"><strong>${fmt(s.precio * (DURATIONS.find(d=>d.v===kit.durationValue)?.mult || 1))}</strong><span>${kit.durationLabel}</span></div>
          </div>`).join('')}
        </div>
      </div>
      <div class="mk-section">
        <div class="mk-conditions">
          <div class="condition-box"><h3>Condiciones Comerciales</h3><p>${h(kit.terms).replace(/\n/g, '<br>')}</p></div>
          <div class="condition-box mk-cta">
            <div class="mk-cta-text"><h3>¿Consultas?</h3><p>Contactá a tu ejecutivo de cuentas para avanzar.</p></div>
            <div class="mk-cta-actions no-print"><a href="https://wa.me/${(config.whatsapp || '').replace(/\D/g, '')}" target="_blank" class="btn wa">Contactar por WhatsApp</a></div>
          </div>
        </div>
        <div class="mk-sig"><span class="sig-dot"></span>Propuesta generada con ${h(kit.brandName)}</div>
      </div>`;

      // Inicializar mapa si Leaflet está disponible
      if (global.L && kit.screenDetails.length > 0) {
        const map = L.map('mk-map').setView([kit.screenDetails[0].lat, kit.screenDetails[0].lng], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);
        kit.screenDetails.forEach(s => {
          L.circleMarker([s.lat, s.lng], { radius: 6, color: TIPO_COL[s.tipo] || '#fff', fillOpacity: 0.8 }).addTo(map)
            .bindPopup(`<b>${h(s.n)}</b><br>${h(s.b)}`);
        });
      }
  };

  // Exponer las funciones y constantes compartidas
  global.SmartKitShared = {
    h, fmt, impNum, DEFAULT_BRAND, DURATIONS, TIPO_COL,
    safeAssetUrl, safeBackground, debounce, showToast,
    loadDashboardState, persistDashboardState, loadInventory, clearAllData,
    getMediaKitUrl, updateMediaKitLinks, buildMediaKit, applyBrandHeader,
    renderMediaKitPage
  };

})(window);