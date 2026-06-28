(function(){
  'use strict';
  
  const K_QUOTE = 'sk_v1_public-quote';
  const API_URL = ''; // En Vercel, la API está en el mismo dominio

  let state = { quote: new Map() };

  // Helpers
  const $ = id => document.getElementById(id);
  const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
  const fmtImp = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const badgeClass = {Peatonal:'bd-p',Vehicular:'bd-v',Mixto:'bd-m'};
  const dotClass = {Peatonal:'#0369a1',Vehicular:'#0f766e',Mixto:'#7c3aed'};

  function boot() {
    Promise.all([
      fetch(`${API_URL}/api/screens`).then(res => res.json()),
      fetch(`${API_URL}/api/config`).then(res => res.json())
    ]).then(([screens, config]) => {
      loadQuote();
      applyConfig(config);
      initMap(screens);
    }).catch(err => {
      console.error("Error al cargar datos:", err);
      $('map').innerHTML = `<p style="text-align:center;padding:40px;color:var(--mu)">Error al conectar con el servidor.</p>`;
    });
  }
  
  function loadQuote() {
    const saved = localStorage.getItem(K_QUOTE);
    if (saved) {
      state.quote = new Map(JSON.parse(saved));
    }
  }

  function saveQuote() {
    localStorage.setItem(K_QUOTE, JSON.stringify(Array.from(state.quote.entries())));
  }

  function applyConfig(config) {
    const c = config || {};
    ['brand-logo','brand-name'].forEach(id=>{const el=$(id); if(el) el.textContent=id.includes('logo')?c.logo:c.brand;});
  }

  function initMap(screens) {
    if(!window.L) return;
    const center = [-32.903, -68.839];
    const lMap = L.map('map').setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap contributors', maxZoom: 19,
    }).addTo(lMap);

    screens.forEach(s => {
      if(!s.lat || !s.lng) return;
      const m = L.circleMarker([s.lat, s.lng], {radius:9, fillColor:dotClass[s.tipo]||'#64748b', color:'#fff', weight:2, fillOpacity:.9}).addTo(lMap);
      m.on('click', () => showPanel(s));
    });

    $('scp-close')?.addEventListener('click', () => $('sc-panel').classList.remove('open'));
  }

  function showPanel(s) {
    const panel = $('sc-panel'); if(!panel) return;
    const inQ = state.quote.has(s.id);
    $('scp-content').innerHTML = `
      <div class="scp-hero">${s.video ? `<video src="${esc(s.video)}" autoplay muted loop playsinline></video>` : esc((s.nombre||'').substring(0,2).toUpperCase())}</div>
      <strong>${esc(s.nombre)}</strong>
      <p class="mu sm">${esc(s.zona)} · <span class="badge ${badgeClass[s.tipo]||''}">${esc(s.tipo)}</span></p>
      <div class="scp-stats">
        <div class="scp-stat"><span>Impactos/día</span><strong>${fmtImp(s.impactos)}</strong></div>
        <div class="scp-stat"><span>Precio/semana</span><strong>${fmt(s.precio)}</strong></div>
      </div>
      ${s.nota ? `<p class="mu sm" style="margin-bottom:10px">${esc(s.nota)}</p>`:''}
      <button class="btn-add ${inQ ? 'on' : ''}" data-action="toggle-quote" data-id="${s.id}">${inQ ? '✓ En cotizador' : '+ Agregar al cotizador'}</button>`;
    panel.classList.add('open');

    panel.querySelector('[data-action="toggle-quote"]')?.addEventListener('click', function() {
      toggleQuote(s);
      const inQuoteNow = state.quote.has(s.id);
      this.textContent = inQuoteNow ? '✓ En cotizador' : '+ Agregar al cotizador';
      this.classList.toggle('on', inQuoteNow);
    });
  }

  function toggleQuote(screen) {
    state.quote.has(screen.id) ? state.quote.delete(screen.id) : state.quote.set(screen.id, screen);
    saveQuote();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();