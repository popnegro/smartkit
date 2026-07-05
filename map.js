/* ══════════════════════════════════════
   MAP APP
══════════════════════════════════════ */
(function(){
'use strict';

// ── Keys ──
const K_STATE = 'sk_v1_dashboard-state';
const K_KITS  = 'sk_v1_public-kits';
const K_CFG   = 'sk_v1_config';

// ── State ──
let screens = [];
let markers = {};        // id → L.circleMarker
let activeFilter = 'Todos';
let activeScreen = null;
let quote = new Map();   // id → screen
let lMap = null;
let searchQ = '';

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
function boot(){
  loadConfig();
  loadScreens();
  initMap();
  setupSearch();
  setupChips();
  setupPanel();
  setupQuotePill();
  updateQuotePill();
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

function loadScreens(){
  let overlay = {};
  try{ overlay = JSON.parse(localStorage.getItem(K_STATE)||'{}'); }catch(_){}
  screens = (window.BASE_SCREENS || [])
    .map(s => ({...s, ...(overlay[s.id]||{})}))
    .filter(s => s.status === 'Activo' && s.lat && s.lng);
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
    const inQ = quote.has(s.id);
    if(show){ m.setStyle({opacity:1, fillOpacity: inQ ? 1 : .88, weight: inQ ? 3 : 2, color: inQ ? '#fbbf24' : '#fff'}); }
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
  const inQ = quote.has(s.id);
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
    <button class="btn-add${inQ?' in':''}" id="panel-add-btn">
      ${inQ ? '✓ En cotizador · Quitar' : '+ Agregar al cotizador'}
    </button>`;

  $('panel-add-btn').addEventListener('click', () => toggleQuote(s));
  $('sc-panel').classList.add('open');

  // Highlight marker
  applyFilters();
}

function closePanel(){
  $('sc-panel').classList.remove('open');
  activeScreen = null;
}

// ── Quote ──
function toggleQuote(s){
  if(quote.has(s.id)){
    quote.delete(s.id);
    toast(`${s.nombre} quitada del cotizador`);
  } else {
    quote.set(s.id, s);
    toast(`✓ ${s.nombre} agregada al cotizador`);
  }
  updateQuotePill();
  applyFilters();
  // Refresh panel button if open
  if(activeScreen && activeScreen.id === s.id) openPanel(s);
}

function updateQuotePill(){
  const n = quote.size;
  const items = [...quote.values()];
  const total = items.reduce((a,s)=>a+s.precio*4,0); // default 4 semanas

  $('q-dot').textContent = n;
  $('quote-pill').classList.toggle('has-items', n > 0);

  if(n === 0){
    $('q-label').textContent = 'Cotizador vacío';
    $('q-sublabel').textContent = 'Agregá pantallas desde el mapa';
    $('q-actions').style.display = 'none';
  } else {
    $('q-label').textContent = `${n} pantalla${n!==1?'s':''} · ${fmt(total)}/mes`;
    $('q-sublabel').textContent = `${fmtImp(items.reduce((a,s)=>a+s.impactos,0))} imp/día`;
    $('q-actions').style.display = 'flex';
  }
}

function setupQuotePill(){
  $('q-clear').addEventListener('click', () => {
    if(!confirm('¿Limpiar el cotizador?')) return;
    quote.clear();
    updateQuotePill();
    applyFilters();
    toast('Cotizador vaciado');
  });

  $('q-go').addEventListener('click', () => {
    // Persist quote to localStorage as a draft kit then navigate
    const items = [...quote.values()];
    if(!items.length) return;
    const weeks = 4;
    const id = 'kit-draft-' + Date.now().toString(36);
    const now = new Date();
    const kit = {
      id, client:'', contact:'',
      createdAt: now.toISOString(),
      validUntil: new Date(now.getTime()+15*86400000).toISOString(),
      brand:'SmartKit', weeks, weekLabel:'4 semanas',
      screens: items.map(s=>({...s, precioCampana:s.precio*weeks})),
      totals:{
        screens:items.length,
        impactsPerDay:items.reduce((a,s)=>a+s.impactos,0),
        impactsTotal:items.reduce((a,s)=>a+s.impactos,0)*weeks*7,
        investment:items.reduce((a,s)=>a+s.precio*weeks,0)
      },
      terms:'Inicio de campaña sujeto a disponibilidad. Valores en ARS.'
    };
    let all={};
    try{all=JSON.parse(localStorage.getItem(K_KITS)||'{}');}catch(_){}
    all[id]=kit; localStorage.setItem(K_KITS,JSON.stringify(all));
    window.location.href=`mediakit.html?id=${encodeURIComponent(id)}`;
  });
}

// ── Search ──
function setupSearch(){
  $('search').addEventListener('input', e => {
    searchQ = e.target.value.toLowerCase().trim();
    applyFilters();
  });
}

// ── Chips ──
function setupChips(){
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      activeFilter = c.dataset.tipo;
      document.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      applyFilters();
    });
  });
}

// ── Counts ──
function updateCounts(){
  const tipos = ['Peatonal','Vehicular','Mixto'];
  $('cnt-all').textContent = screens.length;
  tipos.forEach(t => {
    const el = document.querySelector(`.chip[data-tipo="${t}"] .chip-count`);
    if(el) el.textContent = screens.filter(s=>s.tipo===t).length;
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