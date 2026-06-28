(function(){
  'use strict';
  
  // ── API ──
  const API_URL = ''; // En Vercel, la API está en el mismo dominio

  // ── State ──
  const state = {
    screens: [],
    filtered: [],
    quote: new Map(),
    weeks: 4,
    activeZone: 'Todos',
    config: {},
  };

  // ── Helpers ──
  const $ = id => document.getElementById(id);
  const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
  const fmtImp = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const badgeClass = {Peatonal:'bd-p',Vehicular:'bd-v',Mixto:'bd-m'};
  const dotClass = {Peatonal:'#0369a1',Vehicular:'#0f766e',Mixto:'#7c3aed'};

  function toast(msg, duration=1800){
    const t=$('toast'); t.textContent=msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), duration);
  }

  // ── Boot ──
  function boot(){
    // Cargar datos desde la API
    Promise.all([
      fetch(`${API_URL}/api/screens`).then(res => res.json()),
      fetch(`${API_URL}/api/config`).then(res => res.json())
    ]).then(([screens, config]) => {
      state.screens = screens;
      state.config = config;
      state.filtered = [...state.screens];

      applyConfig();
      renderHeroStats();
      buildZoneFilters();
      renderCards();
      renderQuote();
      setupNav();
      setupDuration();
      setupActions();
    }).catch(err => {
      console.error("Error al cargar datos desde la API:", err);
      $('hero-title').textContent = "Error de conexión";
      $('hero-copy').innerHTML = `No se pudo conectar con el servidor en <code>${API_URL}</code>. <br>Por favor, asegurate de que esté corriendo e intentá de nuevo.`;
    });
  }

  function applyConfig(){
    const c=state.config;
    ['brand-logo','brand-name'].forEach(id=>{const el=$(id); if(el) el.textContent=id.includes('logo')?c.logo:c.brand;});
    if(c.heroTitle){ const el=$('hero-title'); if(el) el.textContent=c.heroTitle; }
    // heroCopy no se actualiza para mantener el texto del brochure.
  }

  function renderHeroStats(){
    const el=$('hero-stats'); if(!el) return;
    const total=state.screens.length;
    const imp=state.screens.reduce((a,s)=>a+(s.impactos||0),0);
    const zones=[...new Set(state.screens.map(s=>s.zona))].length;
    el.innerHTML=`
      <div class="stat"><b>${total}</b><span>Pantallas</span></div>
      <div class="stat"><b>${fmtImp(imp)}</b><span>Impactos/día</span></div>
      <div class="stat"><b>${zones}</b><span>Zonas</span></div>`;
  }

  function buildZoneFilters(){
    const el=$('zone-filters'); if(!el) return;
    const zones=['Todos',...new Set(state.screens.map(s=>s.zona))];
    el.innerHTML=zones.map(z=>`<button class="chip${z===state.activeZone?' on':''}" data-zone="${esc(z)}">${esc(z)}</button>`).join('');
    el.addEventListener('click',e=>{
      const btn=e.target.closest('[data-zone]'); if(!btn) return;
      state.activeZone=btn.dataset.zone;
      el.querySelectorAll('.chip').forEach(b=>b.classList.toggle('on',b.dataset.zone===state.activeZone));
      state.filtered=state.activeZone==='Todos'?[...state.screens]:state.screens.filter(s=>s.zona===state.activeZone);
      renderCards();
    });
  }

  function renderCards(){
    const el=$('cards'); if(!el) return;
    const cc=$('cat-count'); if(cc) cc.textContent=`${state.filtered.length} pantalla${state.filtered.length!==1?'s':''}`;
    if(!state.filtered.length){ el.innerHTML='<p class="empty">No hay pantallas disponibles en esta zona.</p>'; return; }
    el.innerHTML=state.filtered.map(s=>{
      const inQ=state.quote.has(s.id);
      const isPaused = s.status === 'Pausado';
      const initials=esc((s.nombre||'').substring(0,2).toUpperCase());
      return `<article class="card${inQ?' in-quote':''}${isPaused?' paused':''}" data-id="${esc(s.id)}">
        <div class="card-hero">${s.video?`<video src="${esc(s.video)}" autoplay muted loop playsinline></video>`:initials}</div>
        <div class="card-body">
          <div class="card-top"><strong class="card-name">${esc(s.nombre)}</strong><span class="badge ${badgeClass[s.tipo]||''}">${esc(s.tipo)}</span></div>
          <p class="card-zone">${esc(s.zona)}</p>
          <div class="card-stats">
            <span class="mu sm">${fmtImp(s.impactos)} imp/día</span>
            <strong class="card-price">${isPaused ? '--' : fmt(s.precio)}<span class="mu" style="font-size:10px;font-weight:400">/sem</span></strong>
          </div>
          ${s.nota?`<p class="card-note">${esc(s.nota)}</p>`:''}
        </div>
        <div class="card-footer"><button class="btn-add${inQ?' on':''}" data-action="toggle-quote" data-id="${esc(s.id)}">${inQ?'✓ En cotizador':'+ Agregar'}</button></div>
      </article>`;
    }).join('');
    el.querySelectorAll('.card').forEach(card=>{
      card.addEventListener('click',()=>toggleQuote(card.dataset.id));
    });
  }

  function toggleQuote(id){
    const s=state.screens.find(x=>x.id===id); if(!s) return;
    if (s.status === 'Pausado') { toast('Esta pantalla no está disponible actualmente.'); return; }
    state.quote.has(id)?state.quote.delete(id):state.quote.set(id,s);
    renderCards(); renderQuote();
    toast(state.quote.has(id)?`${s.nombre} agregada al cotizador`:`${s.nombre} quitada`);
  }

  function renderQuote(){
    const items=[...state.quote.values()];
    const w=state.weeks;
    const totalInv=items.reduce((a,s)=>a+s.precio*w,0);
    const totalImp=items.reduce((a,s)=>a+s.impactos,0)*w*7;
    const hasItems=items.length>0;

    const st=$('q-status'); if(st){ st.textContent=hasItems?'Listo':'Vacío'; st.className='q-status'+(hasItems?' ready':''); }
    const sc=$('q-sum-count'); if(sc) sc.textContent=hasItems?`${items.length} pantalla${items.length!==1?'s':''}`:' 0 pantallas · Sin plan armado';
    const sd=$('q-sum-detail'); if(sd) sd.textContent=hasItems?`${fmtImp(totalImp)} impactos totales estimados`:'Agregá pantallas para estimar inversión';
    const sm=$('q-mobile-status'); if(sm) sm.textContent = items.length;

    const ql=$('q-list'); if(ql){
      ql.innerHTML=items.map(s=>`
        <div class="q-item">
          <div class="q-item-info"><strong>${esc(s.nombre)}</strong><span>${esc(s.zona)} · ${esc(s.tipo)}</span></div>
          <div class="q-item-right"><span class="q-price">${fmt(s.precio*w)}</span><button class="q-rm" data-id="${esc(s.id)}" title="Quitar">✕</button></div>
        </div>`).join('')||`<p class="mu sm" style="padding:8px 0">Sin pantallas agregadas.</p>`;
      ql.querySelectorAll('.q-rm').forEach(b=>b.addEventListener('click',()=>{state.quote.delete(b.dataset.id);renderCards();renderQuote();}));
    }

    const el=(id,val)=>{const e=$(id);if(e)e.textContent=val;};
    el('q-count',items.length);
    el('q-impacts',fmtImp(totalImp));
    el('q-total',fmt(totalInv));

    const mkBtn=$('btn-mk'), waBtn=$('btn-wa'), hint=$('q-hint');
    if(mkBtn){mkBtn.disabled=!hasItems;}
    if(waBtn){waBtn.disabled=!hasItems;}
    if(hint){hint.style.display=hasItems?'none':'block';}
  }

  function setupDuration(){
    const sel=$('dur-select'); if(!sel) return;
    state.weeks=parseInt(sel.value)||4;
    sel.addEventListener('change',()=>{state.weeks=parseInt(sel.value)||1;renderQuote();});
  }

  // ── Nav ──
  let mapInited=false;
  function setupNav(){
    document.querySelectorAll('[data-view]').forEach(btn=>{
      btn.addEventListener('click',()=>switchView(btn.dataset.view));
    });
  }

  function switchView(view){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===view));
    const el=$('view-'+view); if(el) el.classList.add('on');
    if(view==='map'&&!mapInited){initMap();mapInited=true;}
  }

  // ── Map ──
  function initMap(){
    if(!window.L) return;
    const mapEl=$('map'); if(!mapEl) return;
    const center=[-32.903,-68.839];
    const lMap=L.map('map').setView(center,12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap contributors',maxZoom:19,
    }).addTo(lMap);
    state.screens.forEach(s=>{
      if(!s.lat||!s.lng) return;
      const m=L.circleMarker([s.lat,s.lng],{radius:9,fillColor:dotClass[s.tipo]||'#64748b',color:'#fff',weight:2,fillOpacity:.9}).addTo(lMap);
      m.on('click',()=>showPanel(s));
    });
    $('scp-close')?.addEventListener('click',()=>$('sc-panel').classList.remove('open'));
  }

  function showPanel(s){
    const panel=$('sc-panel'); if(!panel) return;
    const inQ=state.quote.has(s.id);
    $('scp-content').innerHTML=`
      <div class="scp-hero">${s.video?`<video src="${esc(s.video)}" autoplay muted loop playsinline></video>`:esc((s.nombre||'').substring(0,2).toUpperCase())}</div>
      <strong>${esc(s.nombre)}</strong>
      <p class="mu sm">${esc(s.zona)} · <span class="badge ${badgeClass[s.tipo]||''}">${esc(s.tipo)}</span></p>
      <div class="scp-stats">
        <div class="scp-stat"><span>Impactos/día</span><strong>${fmtImp(s.impactos)}</strong></div>
        <div class="scp-stat"><span>Precio/semana</span><strong>${fmt(s.precio)}</strong></div>
      </div>
      ${s.nota?`<p class="mu sm" style="margin-bottom:10px">${esc(s.nota)}</p>`:''}
      <button class="btn-add${inQ?' on':''}" style="width:100%;min-height:34px" data-map-toggle="${esc(s.id)}">${inQ?'✓ En cotizador':'+ Agregar al cotizador'}</button>`;
    panel.classList.add('open');
    $('scp-content').querySelector('[data-map-toggle]')?.addEventListener('click', function(){
      toggleQuote(s.id);
      this.textContent=state.quote.has(s.id)?'✓ En cotizador':'+ Agregar al cotizador';
      this.classList.toggle('on',state.quote.has(s.id));
    });
  }

  // ── Actions ──
  function setupActions(){
    $('btn-mk')?.addEventListener('click', generateKit);
    $('btn-wa')?.addEventListener('click', sendWhatsApp);
    document.querySelector('[data-action="open-kit"]')?.addEventListener('click',()=>showKitHistory());
    $('mk-close')?.addEventListener('click',()=>$('mk-overlay').classList.remove('open'));
    // Mobile quote panel
    $('q-mobile-toggle')?.addEventListener('click', () => $('q-panel-wrap').classList.add('open'));
    $('q-mobile-close')?.addEventListener('click', () => $('q-panel-wrap').classList.remove('open'));
    $('q-panel-wrap')?.addEventListener('click', e => { if(e.target.id === 'q-panel-wrap') e.target.classList.remove('open'); });
    $('mk-overlay')?.addEventListener('click',e=>{ if(e.target===$('mk-overlay')) $('mk-overlay').classList.remove('open'); });
  }

  function generateKit(){
    const items=[...state.quote.values()]; if(!items.length) return;
    const c=state.config;
    const w=state.weeks;
    const totalInv=items.reduce((a,s)=>a+s.precio*w,0);
    const totalImp=items.reduce((a,s)=>a+s.impactos,0);
    const now=new Date();
    const exp=new Date(now.getTime()+15*86400000);
    const weekLabel={1:'1 semana',2:'2 semanas',4:'4 semanas (1 mes)',8:'8 semanas',12:'12 semanas'}[w]||`${w} semanas`;
    const kitData={createdAt:now.toISOString(),validUntil:exp.toISOString(),brand:c.brand||'SmartKit',weeks:w,weekLabel,
      screens:items.map(s=>({...s,precioCampana:s.precio*w})),
      totals:{screens:items.length,impactsPerDay:totalImp,impactsTotal:totalImp*w*7,investment:totalInv},
      terms:c.terms||'',};

    // Guardar el kit en el servidor
    fetch(`${API_URL}/api/kits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kitData)
    }).then(res => res.json())
    .then(kit => {
      renderKitModal(kit);
      toast('✓ Media kit generado', 2000);
    }).catch(err => toast('Error al guardar el kit', 'err'));
  }

  function renderKitModal(kit){
    const overlay=$('mk-overlay'), content=$('mk-content'); if(!overlay||!content) return;
    const now=new Date();
    const validStr=new Date(kit.validUntil).toLocaleDateString('es-AR');
    content.innerHTML=`
      <div class="mk-hero">
        <h2>${esc(kit.brand)} · Propuesta Comercial</h2>
        <p class="mk-meta">Generado: ${now.toLocaleDateString('es-AR')} · Duración: ${esc(kit.weekLabel)} · Válida hasta: ${validStr}</p>
      </div>
      <div class="mk-kpis">
        <div class="mk-kpi"><b>${kit.totals.screens}</b><span>Pantallas</span></div>
        <div class="mk-kpi"><b>${fmtImp(kit.totals.impactsTotal)}</b><span>Impactos totales</span></div>
        <div class="mk-kpi"><b>${fmt(kit.totals.investment)}</b><span>Inversión total</span></div>
      </div>
      <div class="mk-section">
        <h3>Detalle de pantallas</h3>
        ${kit.screens.map(s=>`<div class="mk-screen-row"><div><strong>${esc(s.nombre)}</strong><br><span class="mu sm">${esc(s.zona)} · ${esc(s.tipo)} · ${fmtImp(s.impactos)} imp/día</span></div><strong>${fmt(s.precioCampana)}</strong></div>`).join('')}
      </div>
      <div class="mk-section">
        <h3>Condiciones</h3>
        <div class="mk-terms">${esc(kit.terms)}</div>
      </div>
      <div class="mk-footer">
        <button class="btn" onclick="printKit()">Imprimir / PDF</button>
        <button class="btn wa" onclick="sendKitWhatsApp()">Enviar por WhatsApp</button>
        <button class="btn" onclick="downloadKit('${esc(kit.id)}')">Descargar JSON</button>
      </div>`;
    overlay.classList.add('open');
    window._currentKit=kit;
  }

  window.printKit=()=>{ window.print(); };
  window.sendKitWhatsApp=()=>{
    const kit=window._currentKit; if(!kit) return;
    const c=state.config;
    const wa=c.whatsapp||''; if(!wa){alert('Configurá el WhatsApp en config.js');return;}
    const lines=[`Hola! Te comparto la propuesta comercial SmartKit:`,``,`Duración: ${kit.weekLabel}`,
      ...kit.screens.map(s=>`• ${s.nombre} (${s.zona}) — ${fmt(s.precioCampana)}`),``,
      `Inversión total: ${fmt(kit.totals.investment)}`,`Válida hasta: ${new Date(kit.validUntil).toLocaleDateString('es-AR')}`,];
    window.open(`https://wa.me/${wa.replace(/\D/g,'')}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };
  window.downloadKit=id=>{
    fetch(`${API_URL}/api/kits/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject('Kit no encontrado'))
      .then(kit => {
        const a=document.createElement('a');
        a.href='data:application/json,'+encodeURIComponent(JSON.stringify(kit,null,2));
        a.download=id+'.json'; a.click();
      })
      .catch(err => toast('No se pudo descargar el kit', 'err'));
  };

  function showKitHistory(){
    const content=$('mk-content');
    if(!content) return;

    fetch(`${API_URL}/api/kits`).then(r => r.json()).then(all => {
      const kits=Object.values(all).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      if(!kits.length){
        content.innerHTML='<p class="mu" style="text-align:center;padding:32px">No hay kits generados todavía.<br>Armá una cotización para crear tu primer media kit.</p>';
      } else {
        content.innerHTML=`<h3 style="margin-bottom:14px;font-size:16px;font-weight:700">Kits generados (${kits.length})</h3>`+
          kits.map(k=>`<div style="border:1px solid var(--ln);border-radius:10px;padding:12px;margin-bottom:10px;cursor:pointer" onclick="loadKit('${esc(k.id)}')">
            <strong>${esc(k.brand)}</strong> · ${k.totals.screens} pantallas<br>
            <span class="mu sm">${new Date(k.createdAt).toLocaleDateString('es-AR')} · ${k.weekLabel} · ${fmt(k.totals.investment)}</span>
          </div>`).join('');
      }
      $('mk-overlay').classList.add('open');
      window._currentKit=null;
    }).catch(err => {
      content.innerHTML='<p class="mu" style="text-align:center;padding:32px;color:var(--danger)">Error al cargar el historial de kits.</p>';
      $('mk-overlay').classList.add('open');
    });
  }
  window.loadKit=id=>{
    fetch(`${API_URL}/api/kits/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject('Kit no encontrado'))
      .then(kit => {
        if (kit) renderKitModal(kit);
      }).catch(err => toast('No se pudo cargar el kit', 'err'));
  };

  function sendWhatsApp(){
    const c=state.config;
    const wa=c.whatsapp||''; if(!wa){alert('Configurá el WhatsApp en config.js');return;}
    const items=[...state.quote.values()];
    const w=state.weeks;
    const total=items.reduce((a,s)=>a+s.precio*w,0);
    const lines=[`Hola! Me interesa cotizar las siguientes pantallas SmartKit:`,``,
      ...items.map(s=>`• ${s.nombre} (${s.zona}) — ${fmt(s.precio*w)}`),``,
      `Duración: ${w} semana${w!==1?'s':''}`,`Inversión estimada: ${fmt(total)}`,];
    window.open(`https://wa.me/${wa.replace(/\D/g,'')}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }

  // ── Init ──
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();