/* ══════════════════════════════════════════════════════════════
   SmartKit Core — v2
   Única fuente de verdad para datos + sincronización entre pantallas.

   Por qué existe este archivo:
   Antes, index.html, map.html y dashboard.html cada uno traía su
   propia copia de BASE_SCREENS (con datos ligeramente distintos:
   "Terminal de Ómnibus" vs "Terminal Buses Mendoza", notas distintas,
   etc). Además, index.html usaba un `CONFIG` hardcodeado que nunca
   leía lo que el dashboard guardaba, y el "cotizador" del brochure
   y el del mapa vivían en memoria separada, sin compartir nada.
   Este módulo resuelve eso: una sola semilla de datos, un solo
   esquema de Kit, y un bus de eventos que reacciona a cambios en
   localStorage (misma pestaña y entre pestañas) para que todas las
   pantallas queden siempre sincronizadas.
═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const NS = 'sk_v2_';
  const KEYS = {
    OVERLAY: NS + 'screens-overlay', // ediciones del dashboard sobre la semilla
    CONFIG: NS + 'config',
    CART: NS + 'cart',               // array de screen ids compartido por index/map
    KITS: NS + 'kits',
  };

  // ── Semilla única de inventario (antes duplicada en 3 archivos) ──
  const SEED_SCREENS = [
    { id: 'sc-01', nombre: 'Sarmiento y 9 de Julio', zona: 'Centro', tipo: 'Peatonal', impactos: 14200, precio: 95000, status: 'Activo', lat: -32.8894, lng: -68.8458, nota: 'Esquina comercial de máximo tránsito peatonal.' },
    { id: 'sc-02', nombre: 'Palmares Open Mall', zona: 'Palmares', tipo: 'Mixto', impactos: 22500, precio: 145000, status: 'Activo', lat: -32.9121, lng: -68.8306, nota: 'Acceso principal al shopping. Vehicular y peatonal.' },
    { id: 'sc-03', nombre: 'Las Heras y Mitre', zona: 'Las Heras', tipo: 'Peatonal', impactos: 8800, precio: 68000, status: 'Activo', lat: -32.8716, lng: -68.8388, nota: 'Zona comercial barrial. Alto tráfico local.' },
    { id: 'sc-04', nombre: 'Av. Aristides frente al Parque', zona: 'Ciudad', tipo: 'Vehicular', impactos: 31000, precio: 185000, status: 'Activo', lat: -32.8908, lng: -68.8762, nota: 'Avenida principal. Ideal autos y commuters.' },
    { id: 'sc-05', nombre: 'Guaymallén Centro', zona: 'Guaymallén', tipo: 'Peatonal', impactos: 11400, precio: 78000, status: 'Activo', lat: -32.8955, lng: -68.8212, nota: 'Centro comercial de Guaymallén.' },
    { id: 'sc-06', nombre: 'Maipú Ruta 7', zona: 'Maipú', tipo: 'Vehicular', impactos: 19600, precio: 112000, status: 'Activo', lat: -32.9812, lng: -68.7757, nota: 'Tránsito hacia bodegas y aeropuerto.' },
    { id: 'sc-07', nombre: 'Villanueva Gomensoro', zona: 'Las Heras', tipo: 'Mixto', impactos: 9300, precio: 72000, status: 'Activo', lat: -32.8658, lng: -68.8415, nota: 'Zona residencial-comercial en crecimiento.' },
    { id: 'sc-08', nombre: 'Godoy Cruz Belgrano', zona: 'Godoy Cruz', tipo: 'Vehicular', impactos: 25800, precio: 155000, status: 'Activo', lat: -32.9246, lng: -68.8488, nota: 'Corredor vehicular de alto volumen.' },
    { id: 'sc-09', nombre: 'Chacras de Coria Acceso', zona: 'Luján', tipo: 'Vehicular', impactos: 16700, precio: 125000, status: 'Activo', lat: -33.0158, lng: -68.8642, nota: 'Acceso a Chacras. Ideal turismo y bodegas.' },
    { id: 'sc-10', nombre: 'Terminal de Ómnibus', zona: 'Centro', tipo: 'Peatonal', impactos: 18400, precio: 118000, status: 'Activo', lat: -32.8868, lng: -68.8284, nota: 'Alta rotación. Público diverso 24h.' },
  ];

  const DEFAULT_CONFIG = {
    brand: 'SmartKit',
    logo: 'SK',
    whatsapp: '5492616000000',
    heroTitle: 'Pantallas DOOH · Mendoza',
    heroCopy: 'Planificá campañas digitales outdoor. Seleccioná ubicaciones, estimá alcance e inversión, y generá tu propuesta en minutos.',
    terms: 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas creativas. Valores expresados en ARS. Propuesta válida por 15 días.',
    validityDays: 15,
  };

  // ── localStorage helpers ──
  function lsGet(k, def) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
    catch (_) { return def; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (_) { return false; }
  }

  // ── Bus de eventos: misma pestaña + entre pestañas ──
  // Cualquier página que llame Store.on(cb) se entera al instante cuando
  // el inventario, la config, el carrito o los kits cambian, sin recargar.
  const listeners = new Set();
  function emit(key) {
    listeners.forEach(cb => { try { cb(key); } catch (_) {} });
  }
  window.addEventListener('storage', e => {
    if (e.key && Object.values(KEYS).includes(e.key)) emit(e.key);
  });

  // ── Formato / utilidades compartidas ──
  const fmt = n => '$' + Math.round(n || 0).toLocaleString('es-AR');
  const fmtImp = n => (n || 0) >= 1000 ? ((n || 0) / 1000).toFixed(1) + 'k' : String(n || 0);
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const badgeClass = { Peatonal: 'bd-p', Vehicular: 'bd-v', Mixto: 'bd-m' };
  const dotColor = { Peatonal: '#0369a1', Vehicular: '#0f766e', Mixto: '#7c3aed' };
  const weekLabel = w => ({ 1: '1 semana', 2: '2 semanas', 4: '4 semanas (1 mes)', 8: '8 semanas (2 meses)', 12: '12 semanas (1 trimestre)' }[w] || `${w} semanas`);
  const genId = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const EDITABLE_FIELDS = ['nombre', 'zona', 'precio', 'status', 'video', 'nota'];

  const Store = {
    keys: KEYS,
    seed: SEED_SCREENS,

    // ── Screens ──
    getScreens() {
      const overlay = lsGet(KEYS.OVERLAY, {});
      return SEED_SCREENS.map(s => ({ ...s, ...(overlay[s.id] || {}) }));
    },
    getActiveScreens() {
      return this.getScreens().filter(s => s.status === 'Activo');
    },
    getScreen(id) {
      return this.getScreens().find(s => s.id === id) || null;
    },
    getOverlay() { return lsGet(KEYS.OVERLAY, {}); },
    /** Aplica un parche a una pantalla (usado por el editor del dashboard) */
    patchScreen(id, patch) {
      const base = SEED_SCREENS.find(s => s.id === id);
      if (!base) return;
      const overlay = lsGet(KEYS.OVERLAY, {});
      const merged = { ...(overlay[id] || {}), ...patch };
      // Si un campo vuelve a coincidir con la semilla, lo limpiamos del overlay
      const diff = {};
      EDITABLE_FIELDS.forEach(k => { if (merged[k] !== undefined && merged[k] !== base[k]) diff[k] = merged[k]; });
      if (Object.keys(diff).length) overlay[id] = diff; else delete overlay[id];
      lsSet(KEYS.OVERLAY, overlay);
      emit(KEYS.OVERLAY);
    },
    setStatus(id, status) { this.patchScreen(id, { status }); },
    isDirty(id) { const o = lsGet(KEYS.OVERLAY, {}); return !!o[id]; },

    // ── Config ──
    getConfig() { return { ...DEFAULT_CONFIG, ...lsGet(KEYS.CONFIG, {}) }; },
    setConfig(cfg) { lsSet(KEYS.CONFIG, cfg); emit(KEYS.CONFIG); },

    // ── Cart (carrito compartido entre brochure y mapa) ──
    getCart() { return lsGet(KEYS.CART, []); },
    getCartScreens() {
      const ids = new Set(this.getCart());
      return this.getActiveScreens().filter(s => ids.has(s.id));
    },
    setCart(ids) { lsSet(KEYS.CART, ids); emit(KEYS.CART); },
    isInCart(id) { return this.getCart().includes(id); },
    toggleCart(id) {
      const c = this.getCart();
      const i = c.indexOf(id);
      if (i >= 0) c.splice(i, 1); else c.push(id);
      this.setCart(c);
      return c.includes(id);
    },
    clearCart() { this.setCart([]); },

    // ── Kits (propuestas) — esquema canónico único ──
    getKits() { return lsGet(KEYS.KITS, {}); },
    getKitList() {
      return Object.values(this.getKits()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    getKit(id) { return this.getKits()[id] || null; },
    /**
     * Crea un kit a partir de una lista de pantallas activas + parámetros.
     * Esquema canónico (usado por dashboard, index y map por igual):
     * { id, client, contact, brand, createdAt, validUntil, weeks, weekLabel,
     *   notes, terms, screens:[{id,nombre,zona,tipo,impactos,precioSemana,precioCampana}],
     *   totals:{screens,impactsPerDay,impactsTotal,investment}, archived }
     */
    buildKit({ screens, client = '', contact = '', weeks = 4, validityDays, notes = '' }) {
      const cfg = this.getConfig();
      const now = new Date();
      const validity = validityDays || cfg.validityDays || 15;
      const totalImpPerDay = screens.reduce((a, s) => a + (s.impactos || 0), 0);
      const investment = screens.reduce((a, s) => a + (s.precio || 0) * weeks, 0);
      return {
        id: genId('kit'),
        client, contact,
        brand: cfg.brand,
        createdAt: now.toISOString(),
        validUntil: new Date(now.getTime() + validity * 86400000).toISOString(),
        weeks, weekLabel: weekLabel(weeks),
        notes,
        terms: cfg.terms,
        screens: screens.map(s => ({
          id: s.id, nombre: s.nombre, zona: s.zona, tipo: s.tipo,
          impactos: s.impactos, precioSemana: s.precio, precioCampana: s.precio * weeks,
          lat: s.lat, lng: s.lng,
        })),
        totals: {
          screens: screens.length,
          impactsPerDay: totalImpPerDay,
          impactsTotal: totalImpPerDay * weeks * 7,
          investment,
        },
        archived: false,
      };
    },
    saveKit(kit) {
      const all = this.getKits();
      all[kit.id] = kit;
      lsSet(KEYS.KITS, all);
      emit(KEYS.KITS);
      return kit;
    },
    deleteKit(id) {
      const all = this.getKits();
      delete all[id];
      lsSet(KEYS.KITS, all);
      emit(KEYS.KITS);
    },
    toggleArchiveKit(id) {
      const all = this.getKits();
      if (!all[id]) return;
      all[id].archived = !all[id].archived;
      lsSet(KEYS.KITS, all);
      emit(KEYS.KITS);
      return all[id].archived;
    },
    /** Pantallas del kit que hoy están pausadas o eliminadas del inventario vivo */
    getStaleScreenIds(kit) {
      const live = this.getScreens();
      return (kit.screens || []).filter(ks => {
        const l = live.find(s => s.id === ks.id);
        return !l || l.status !== 'Activo';
      }).map(s => s.id);
    },

    // ── Suscripción a cambios ──
    on(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };

  global.SmartKit = { Store, fmt, fmtImp, esc, badgeClass, dotColor, weekLabel, genId, DEFAULT_CONFIG, SEED_SCREENS };
})(window);
