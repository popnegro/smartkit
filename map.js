/* ══════════════════════════════════════
   MAP APP
══════════════════════════════════════ */
(function(){
'use strict';

// ── Keys ──
const K_KITS  = 'sk_v1_public-kits';
const K_CFG   = 'sk_v1_config';

// ── State ──
let screens = [];
let markers = {};        // id → L.circleMarker
let activeFilter = 'Todos';
let activeScreen = null;
let lMap = null;
let searchQ = '';

const Shared = window.SmartKitShared;
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
async function boot(){
  loadConfig();
  await loadScreens();
  initMap();
  setupSearch();
  setupChips();
  setupPanel();
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

async function loadScreens(){
  try {
    const allScreens = await Shared.loadInventory(); // Use the centralized data loader.
    screens = allScreens.filter(s => (s.status === 'Activo' || s.active) && s.lat && s.lng);
  } catch (error) {
    console.error('Error al cargar pantallas en el mapa:', error);
    screens = [];
    if ($('map-counter')) $('map-counter').textContent = 'Error al cargar datos';
  }
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
    if(show){ m.setStyle({opacity:1, fillOpacity:.88 }); }
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
    <button class="btn-add" id="panel-add-btn">
      + Agregar al cotizador
    </button>`;

  $('panel-add-btn').addEventListener('click', () => addToQuoteAndRedirect(s));
  $('sc-panel').classList.add('open');

  // Highlight marker
  applyFilters();
}

function closePanel(){
  $('sc-panel').classList.remove('open');
  activeScreen = null;
}

/**
 * Adds a screen to the main quote system (managed by app.js) via localStorage
 * and redirects the user to the brochure page.
 * @param {object} screen The screen object to add.
 */
function addToQuoteAndRedirect(screen) {
  toast(`✓ ${screen.nombre} agregada. Redirigiendo al cotizador...`);
  // Use a temporary storage key that app.js can read on load.
  localStorage.setItem('sk_v1_add-to-quote', screen.id);
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 800); // Wait a moment for the user to read the toast.
}

// ── Search ──
function setupSearch(){
  const debouncedFilter = Shared.debounce(() => applyFilters(), 250);
  $('search').addEventListener('input', e => {
    searchQ = e.target.value.toLowerCase().trim();
    debouncedFilter();
  });
}

// ── Chips ──
function setupChips(){
  const tipos = ['Todos', 'Peatonal', 'Vehicular', 'Mixto'];
  const typeChips = tipos.map(tipo => 
    `<button class="chip ${tipo === activeFilter ? 'on' : ''}" data-filter="type" data-value="${tipo}">${tipo}<span class="chip-count" id="cnt-${tipo.toLowerCase()}">0</span></button>`
  ).join('');
  document.getElementById('type-filter-chips').innerHTML = `<span class="filter-label">Tipo:</span> ${typeChips}`;

  document.getElementById('type-filter-chips').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-filter="type"]');
    if (!chip) return;
    activeFilter = chip.dataset.value;
    applyFilters();
    updateChipSelection();
  });
}

// ── Counts ──
function updateCounts(){
  const tipos = ['Peatonal','Vehicular','Mixto'];
  $('cnt-all').textContent = screens.length;
  tipos.forEach(t => {
    const el = document.getElementById(`cnt-${t.toLowerCase()}`); // Corregido para apuntar a los nuevos IDs
    if(el) el.textContent = screens.filter(s => s.tipo === t).length;
  });
}

function updateChipSelection() {
  document.querySelectorAll('[data-filter="type"]').forEach(chip => {
    chip.classList.toggle('on', chip.dataset.value === activeFilter);
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