const Shared=window.SmartKitShared;
const CONFIG=window.APP_CONFIG||{};
const DEFAULT_BRAND=Shared.DEFAULT_BRAND;
const PUBLIC_KITS_STORAGE_KEY=Shared.PUBLIC_KITS_STORAGE_KEY;
const DASHBOARD_STATE=(()=>{
  try{return JSON.parse(localStorage.getItem('smartkit-dashboard-state')||'{}')||{};}
  catch{return {};}
})();
const STORED_ROWS=Array.isArray(DASHBOARD_STATE.rows)?DASHBOARD_STATE.rows:[];
const STORED_ROW_MAP=new Map(STORED_ROWS.map(row=>[row.id,row]));
const SOURCE_SCREENS=SCREENS.map(screen=>{
  const stored=STORED_ROW_MAP.get(screen.id)||{};
  const merged={...screen,...stored};
  merged.video=safeAssetUrl(stored.video)?stored.video:screen.video;
  return merged;
});
const BRAND={...DEFAULT_BRAND,...(CONFIG.brand||{}),...(DASHBOARD_STATE.brand||{})};
const THEME=CONFIG.theme||{};
const DEFAULT_ACTIVE_SCREEN_IDS=[1,2,3,4,5,6,7,10,13,16,18];
let map, activeZone='Todos', activeSort='recommended', markers={}, selectedScreens=[], quoteDuration='1s', activeScreenId=null, mobileQuoteOpen=false, mobileNavOpen=false, mobileFiltersOpen=false, lastScreenTrigger=null, lastQuoteTrigger=null, lastFilterTrigger=null;
const STORED_ACTIVE_SCREEN_IDS=Array.isArray(DASHBOARD_STATE.rows)?STORED_ROWS.filter(row=>row.status==='Activo').map(row=>row.id):null;
const ACTIVE_SCREEN_IDS = STORED_ACTIVE_SCREEN_IDS || (Array.isArray(CONFIG.inventory?.activeScreenIds)&&CONFIG.inventory.activeScreenIds.length?CONFIG.inventory.activeScreenIds:DEFAULT_ACTIVE_SCREEN_IDS);
const ACTIVE_SCREENS = ACTIVE_SCREEN_IDS.map(id=>SOURCE_SCREENS.find(s=>s.id===id)).filter(Boolean);
const fmt=Shared.formatMoney;
const zones=['Todos',...new Set(ACTIVE_SCREENS.map(s=>s.b))];
const activeMetrics=(()=>{
  const totalReach=ACTIVE_SCREENS.reduce((acc,s)=>acc+impNum(s),0);
  return {totalReach};
})();
const whatsappPhone=BRAND.whatsapp;
const prefersReducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const escapeHtml=Shared.escapeHtml;

const h=escapeHtml;
const whatsappIcon='<svg slot="icon" class="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5a8.5 8.5 0 0 0-7.23 12.97L4 20l3.62-.74A8.5 8.5 0 1 0 12 3.5Zm0 1.8a6.7 6.7 0 0 1 5.72 10.18 6.7 6.7 0 0 1-9.45 2.12l-.3-.2-1.62.33.35-1.56-.22-.32A6.7 6.7 0 0 1 12 5.3Zm-2.44 3.5c-.2 0-.5.08-.77.37-.27.3-.9.88-.9 2.1 0 1.23.92 2.42 1.05 2.59.13.17 1.78 2.84 4.42 3.76 2.2.77 2.65.42 3.12-.03.38-.36.6-1.02.66-1.28.07-.27.04-.48-.15-.58l-1.78-.85c-.2-.1-.44-.05-.57.14l-.5.64c-.13.17-.32.2-.52.1-.42-.18-1.17-.51-1.92-1.18-.7-.62-1.18-1.4-1.32-1.63-.13-.23-.02-.39.1-.52l.37-.43c.12-.14.18-.3.27-.48.09-.18.04-.34-.03-.48l-.82-1.83c-.12-.27-.3-.4-.5-.4Z"/></svg>';
const plusIcon='<svg slot="icon" class="whatsapp-icon plus-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>';
const documentIcon='<svg slot="icon" class="whatsapp-icon plus-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Z"/></svg>';

function whatsappButtonContent(label, icon=whatsappIcon){
  return `${icon}<span>${h(label)}</span>`;
}

function safeBackground(value){
  return Shared.safeBackground(value);
}

function safeAssetUrl(value){
  return Shared.safeAssetUrl(value);
}

function kitSlug(value){
  return String(value || 'media-kit')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
    .slice(0,48) || 'media-kit';
}

const storedPublicKits=Shared.storedPublicKits;

function latestMediaKitId(){
  return Shared.latestMediaKitId();
}

function updateMediaKitLinks(id=latestMediaKitId()){
  Shared.updateMediaKitLinks(id);
}

function screenSnapshot(s,duration){
  return Shared.screenSnapshot(s,duration);
}

function screenCpm(s){
  return Math.round((s.precio/(impNum(s)*7))*1000);
}

function screenAvailability(s){
  if(impNum(s)>=70000)return {label:'Alta demanda',tone:'warning'};
  if(s.precio<=60000)return {label:'Disponible',tone:'success'};
  return {label:'Consultar',tone:'neutral'};
}

function screenUseCase(s){
  if(s.tipo==='Peatonal')return 'Ideal para cercanía, retail y activaciones urbanas';
  if(s.tipo==='Vehicular')return 'Ideal para cobertura, recordación y accesos rápidos';
  return 'Ideal para campañas masivas y audiencias mixtas';
}

function setView(v, fitMap=true){
  if(!document.getElementById('view-'+v))v='brochure';
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('on'));
  document.getElementById('view-'+v).classList.add('on');
  document.querySelectorAll('.view').forEach(x=>x.setAttribute('aria-hidden',x.id!==`view-${v}`?'true':'false'));
  document.getElementById('btn-map').classList.toggle('on',v==='map');
  document.getElementById('btn-brochure').classList.toggle('on',v==='brochure');
  document.querySelectorAll('.mobile-nav-destination').forEach(btn=>{
    const active=btn.dataset.view===v;
    btn.classList.toggle('on',active);
    if(active)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
  document.querySelectorAll('.nav button').forEach(btn=>btn.removeAttribute('aria-current'));
  document.getElementById('btn-'+v)?.setAttribute('aria-current','page');
  const mobileToggle=document.getElementById('mobile-quote-toggle');
  setMobileNav(false);
  setMobileFilters(false);
  if(v!=='brochure')setMobileQuote(false);
  if(mobileToggle)mobileToggle.hidden=false;
  const filterToggle=document.getElementById('mobile-filter-toggle');
  if(filterToggle)filterToggle.hidden=v!=='brochure';
  const actionNav=document.getElementById('mobile-action-nav');
  if(actionNav)actionNav.hidden=false;
  if(v==='map'&&map)setTimeout(()=>{map.invalidateSize();if(fitMap)fitMapToActiveZone();},80);
}

function setZone(zone){
  activeZone=zone;
  renderBrochure();
  updateMapMarkers();
}

function zoneSelectHtml(id){
  return `
    <label class="filter-select control-panel" for="${id}">
      <span>Lugar</span>
      <select id="${id}" data-zone-select>
        ${zones.map(z=>`<option value="${h(z)}" ${z===activeZone?'selected':''}>${h(z)}</option>`).join('')}
      </select>
    </label>`;
}

function sortSelectHtml(id){
  return `
    <label class="filter-select control-panel" for="${id}">
      <span>Orden</span>
      <select id="${id}" data-sort-select>
        <option value="recommended" ${activeSort==='recommended'?'selected':''}>Recomendadas</option>
        <option value="impact" ${activeSort==='impact'?'selected':''}>Mayor impacto</option>
        <option value="price" ${activeSort==='price'?'selected':''}>Menor precio</option>
        <option value="type" ${activeSort==='type'?'selected':''}>Tipo de tránsito</option>
      </select>
    </label>`;
}

function setSort(sort){
  activeSort=sort;
  renderBrochure();
}

function setMobileQuote(open){
  if(open)lastQuoteTrigger=document.activeElement;
  mobileQuoteOpen=open;
  const panel=document.getElementById('quote-panel');
  const toggle=document.getElementById('mobile-quote-toggle');
  if(open)setMobileFilters(false);
  if(panel)panel.classList.toggle('mobile-open',open);
  if(toggle)toggle.setAttribute('aria-expanded',open?'true':'false');
  document.getElementById('mobile-quote-cart')?.classList.toggle('is-suppressed',open);
  if(open)setView('brochure',false);
  if(open&&panel)requestAnimationFrame(()=>panel.focus({preventScroll:true}));
  if(!open&&lastQuoteTrigger instanceof HTMLElement)lastQuoteTrigger.focus({preventScroll:true});
}

function setMobileNav(open){
  mobileNavOpen=open;
  const header=document.querySelector('.top');
  const toggle=document.getElementById('menu-toggle');
  if(header)header.classList.toggle('menu-open',open);
  if(toggle)toggle.setAttribute('aria-expanded',open?'true':'false');
}

function setMobileFilters(open){
  if(open)lastFilterTrigger=document.activeElement;
  mobileFiltersOpen=open;
  const panel=document.getElementById('zone-filters');
  const toggle=document.getElementById('mobile-filter-toggle');
  if(open)setMobileQuote(false);
  if(panel)panel.classList.toggle('filters-open',open);
  if(toggle)toggle.setAttribute('aria-expanded',open?'true':'false');
  if(open&&panel)requestAnimationFrame(()=>panel.querySelector('select,button')?.focus({preventScroll:true}));
  if(!open&&lastFilterTrigger instanceof HTMLElement)lastFilterTrigger.focus({preventScroll:true});
}

function showFeedback(message){
  const feedback=document.getElementById('mobile-feedback');
  if(!feedback)return;
  feedback.classList.remove('is-success');
  feedback.textContent=message;
  feedback.classList.add('show');
  clearTimeout(showFeedback.timer);
  showFeedback.timer=setTimeout(()=>feedback.classList.remove('show'),1400);
}

function showGeneratedFeedback(kit){
  const feedback=document.getElementById('mobile-feedback');
  if(!feedback)return;
  feedback.innerHTML=`<strong>Media kit generado</strong><span>${h(kit.screens)} pantallas · ${fmt(kit.total)}</span>`;
  feedback.classList.add('show','is-success');
  clearTimeout(showFeedback.timer);
  showFeedback.timer=setTimeout(()=>feedback.classList.remove('show','is-success'),2200);
}

function sortedScreens(list){
  const typeRank={Peatonal:0,Mixto:1,Vehicular:2};
  const recommendedScore=s=>(selectedScreens.includes(s.id)?100000000:0)+(impNum(s)*10)-s.precio;
  return [...list].sort((a,b)=>{
    if(activeSort==='impact')return impNum(b)-impNum(a);
    if(activeSort==='price')return a.precio-b.precio;
    if(activeSort==='type')return (typeRank[a.tipo]??9)-(typeRank[b.tipo]??9)||impNum(b)-impNum(a);
    return recommendedScore(b)-recommendedScore(a);
  });
}

function isRecommended(s){
  const byScore=sortedScreens(ACTIVE_SCREENS).slice(0,3).some(x=>x.id===s.id);
  return activeSort==='recommended'&&byScore;
}

function loadLazyVideos(root=document){
  const videos=[...root.querySelectorAll('video[data-src]')];
  if(!videos.length)return;
  const load=video=>{
    if(video.src)return;
    video.src=video.dataset.src;
    video.removeAttribute('data-src');
    video.load();
    if(!prefersReducedMotion())video.play().catch(()=>{});
  };
  if(!('IntersectionObserver' in window)){
    videos.slice(0,4).forEach(load);
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        load(entry.target);
        observer.unobserve(entry.target);
      }
    });
  },{rootMargin:'220px'});
  videos.forEach(video=>observer.observe(video));
}

function screenVideoHtml(s, eager=false){
  const videoUrl=safeAssetUrl(s.video);
  if(!videoUrl)return `<span>${h(s.e)}</span>`;
  const sourceAttr=eager&&!prefersReducedMotion()
    ? `src="${h(videoUrl)}"`
    : `data-src="${h(videoUrl)}"`;
  const autoplay=prefersReducedMotion()?'':'autoplay';
  const preload=eager&&!prefersReducedMotion()?'metadata':'none';
  return `
    <span class="media-fallback" aria-hidden="true">${h(s.e)}</span>
    <video ${sourceAttr} ${autoplay} muted loop playsinline preload="${preload}" aria-label="Video de ${h(s.n)}" onerror="this.hidden=true"></video>`;
}

function markerHtml(s){
  return `<div class="marker ${impNum(s)>=50000?'hot':''}" style="color:${TIPO_COL[s.tipo]}">${s.e}</div>`;
}

function screenHead(s, className, overlay='', eager=className==='media'){
  const background=safeBackground(s.g);
  return `<div class="${className} video-head" style="background:${background}">${screenVideoHtml(s,eager)}${overlay}</div>`;
}

function renderBrochureCard(s, eagerVideo=false){
  const selected=selectedScreens.includes(s.id);
  const recommended=isRecommended(s);
  const availability=screenAvailability(s);
  const badgeText=selected?'Seleccionada':recommended?'Recomendada':h(s.tipo);
  const badgeClass=selected?'badge-selected':recommended?'badge-recommended':'';
  return `
    <article class="card video-card ${selected?'selected':''}">
      ${screenHead(s,'thumb',`<span class="badge media-badge ${badgeClass}" style="background:${TIPO_COL[s.tipo]}22;color:${TIPO_COL[s.tipo]}">${badgeText}</span>`,eagerVideo)}
      <div class="card-body">
        <div class="row card-head">
          <span class="muted small card-zone">${h(s.b)}</span>
        </div>
        <h3 class="card-title">${h(s.n)}</h3>
        <p class="muted small card-address">${h(s.dir)}</p>
        <p class="card-use-case">${h(screenUseCase(s))}</p>
        <div class="product-tags card-product-tags">
          <span class="product-tag availability-${availability.tone}">${h(availability.label)}</span>
          <span class="product-tag">CPM ${fmt(screenCpm(s))}</span>
        </div>
        <p class="muted small card-spec">${h(s.dim)} · ${h(s.res)} · ${h(s.imp)} imp/día</p>
        <div class="price card-price">${fmt(s.precio)}<span class="muted small"> / semana</span></div>
        <div class="card-actions button-group" role="group" aria-label="Acciones para ${h(s.n)}">
          <md-filled-button class="quote-add ${selected?'selected':''}" aria-pressed="${selected?'true':'false'}" aria-label="${selected?'Quitar':'Agregar'} ${h(s.n)} del plan" data-action="toggle-quote" data-screen-id="${s.id}">${selected?'Agregado':'Agregar'}</md-filled-button>
          <md-outlined-button class="map-btn" data-action="show-map" data-screen-id="${s.id}">Ubicar</md-outlined-button>
        </div>
      </div>
    </article>`;
}

function durationOptions(){
  return DURATIONS.map(d=>`<option value="${d.v}" ${d.v===quoteDuration?'selected':''}>${d.l}</option>`).join('');
}

function renderScreenCard(s){
  const selected=selectedScreens.includes(s.id);
  const availability=screenAvailability(s);
  const d=selectedDuration();
  const q=quoteTotals();
  const subtotal=s.precio*d.mult;
  const previewScreens=selected?q.screens:[...q.screens,s];
  const previewTotal=previewScreens.reduce((acc,screen)=>acc+(screen.precio*d.mult),0);
  const previewImpacts=previewScreens.reduce((acc,screen)=>acc+(impNum(screen)*d.days),0);
  const selectedList=previewScreens.length?previewScreens.map(screen=>`
    <div class="quote-item">
      <div><strong>${h(screen.n)}</strong><div class="muted small">${h(screen.b)} · ${fmt(screen.precio)}/semana${!selectedScreens.includes(screen.id)?' · se suma al reservar':''}</div></div>
      ${selectedScreens.includes(screen.id)?`<button type="button" aria-label="Quitar ${h(screen.n)}" data-action="toggle-quote" data-screen-id="${screen.id}">×</button>`:''}
    </div>`).join(''):'<div class="quote-empty">Agrega pantallas desde el brochure para armar tu plan.</div>';
  return `
    ${screenHead(s,'media',`<span class="badge media-badge" style="background:${TIPO_COL[s.tipo]}22;color:${TIPO_COL[s.tipo]}">${h(s.tipo)}</span>`)}
      <button type="button" class="close" aria-label="Cerrar ficha" data-action="close-screen">×</button>
    <div class="content screen-card">
      <h2>${h(s.n)}</h2>
      <p class="muted">${h(s.dir)} · ${h(s.b)}</p>
      <div class="product-tags">
        <span class="product-tag availability-${availability.tone}">${h(availability.label)}</span>
        <span class="product-tag">CPM ${fmt(screenCpm(s))}</span>
      </div>
      <p class="screen-fit">${h(screenUseCase(s))}</p>
      <div class="grid2">
        <div class="metric"><span class="muted small">Formato</span><b>${h(s.dim)}</b></div>
        <div class="metric"><span class="muted small">Resolución</span><b>${h(s.res)}</b></div>
        <div class="metric"><span class="muted small">Impactos/día</span><b>${h(s.imp)}</b></div>
        <div class="metric"><span class="muted small">Precio base</span><b>${fmt(s.precio)}</b></div>
      </div>
      <div class="inline-quote">
        <div class="quote-field control-panel">
          <label for="screen-duration-select">Duración</label>
          <div class="select-shell duration-select-shell">
            <select id="screen-duration-select" data-screen-duration-select data-screen-id="${s.id}">${durationOptions()}</select>
          </div>
        </div>
        <div class="quote-total">
          <div class="quote-meta"><span>Subtotal pantalla</span><strong>${fmt(subtotal)}</strong></div>
          <div class="quote-meta"><span>${selected?'Pantallas seleccionadas':'Pantallas al reservar'}</span><strong>${previewScreens.length}</strong></div>
          <div class="quote-meta"><span>Impactos estimados</span><strong>${Math.round(previewImpacts).toLocaleString('es-AR')}</strong></div>
          <div>
            <span class="muted small">${selected?'Total estimado':'Total al reservar'}</span>
            <div class="price">${fmt(previewTotal)}</div>
          </div>
        </div>
        <details class="map-extra">
          <summary>Plan seleccionado</summary>
          <div class="quote-list">${selectedList}</div>
        </details>
        <div class="quote-actions">
          <md-filled-button class="quote-btn quote-mediakit reserve-btn" data-action="generate-mediakit" data-screen-id="${s.id}">${whatsappButtonContent('Generar media kit', documentIcon)}</md-filled-button>
          <md-filled-button class="quote-btn quote-whatsapp reserve-btn" data-action="toggle-quote" data-screen-id="${s.id}">${whatsappButtonContent(selected?'Quitar del plan':'Agregar al plan', selected?plusIcon:plusIcon)}</md-filled-button>
        </div>
      </div>
    </div>`;
}

function initMap(){
  map=L.map('map',{center:[-32.9,-68.83],zoom:11,zoomControl:false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'© OSM © CartoDB',subdomains:'abcd'}).addTo(map);
  L.control.zoom({position:'bottomright'}).addTo(map);
  ACTIVE_SCREENS.forEach(s=>{
    markers[s.id]=L.marker([s.lat,s.lng],{
      icon:L.divIcon({className:'',iconSize:[30,30],iconAnchor:[15,15],html:markerHtml(s)}),
      keyboard:true,
      title:s.n,
      alt:`Pantalla ${s.n}, ${s.b}`
    }).addTo(map).on('click',event=>openScreen(s.id,event.originalEvent?.target));
    const setMarkerAccessibility=()=>{
      const element=markers[s.id].getElement();
      if(!element)return;
      element.setAttribute('role','button');
      element.setAttribute('aria-label',`Ver detalle de ${s.n}, ${s.b}`);
    };
    setMarkerAccessibility();
    markers[s.id].on('add',setMarkerAccessibility);
  });
  updateMapMarkers();
}

function openScreen(id, trigger=document.activeElement){
  const s=ACTIVE_SCREENS.find(x=>x.id===id);
  if(!s)return;
  if(trigger instanceof HTMLElement)lastScreenTrigger=trigger;
  activeScreenId=id;
  document.getElementById('screen-panel').className='side on';
  document.getElementById('screen-panel').innerHTML=renderScreenCard(s);
  loadLazyVideos(document.getElementById('screen-panel'));
  requestAnimationFrame(()=>document.querySelector('#screen-panel .close')?.focus({preventScroll:true}));
}

function closeScreen(){
  activeScreenId=null;
  document.getElementById('screen-panel').className='side';
  document.getElementById('screen-panel').innerHTML='';
  if(lastScreenTrigger instanceof HTMLElement)lastScreenTrigger.focus({preventScroll:true});
}

function renderBrochure(){
  const minPrice=ACTIVE_SCREENS.reduce((min,s)=>Math.min(min,s.precio),Infinity);
  document.getElementById('hero-stats').innerHTML=`
    <div class="stat"><b>${ACTIVE_SCREENS.length}</b><span>Pantallas activas</span></div>
    <div class="stat"><b>${Math.round(activeMetrics.totalReach*7/1000)}k</b><span>Reach semanal</span></div>
    <div class="stat"><b>${Number.isFinite(minPrice)?fmt(minPrice):'$0'}</b><span>Desde / semana</span></div>
    <div class="stat"><b>${zones.length-1}</b><span>Zonas</span></div>`;

  document.getElementById('zone-filters').innerHTML=zoneSelectHtml('brochure-zone-select')+sortSelectHtml('brochure-sort-select');
  const list=sortedScreens(activeZone==='Todos'?ACTIVE_SCREENS:ACTIVE_SCREENS.filter(s=>s.b===activeZone));
  const catalogCount=document.getElementById('catalog-count');
  if(catalogCount)catalogCount.textContent=`${list.length} ${list.length===1?'pantalla':'pantallas'}${activeZone==='Todos'?'':' · '+activeZone}`;
  const activeChip=document.getElementById('active-filter-chip');
  if(activeChip){
    const hasFilter=activeZone!=='Todos'||activeSort!=='recommended';
    activeChip.hidden=!hasFilter;
    activeChip.innerHTML=hasFilter?`
      <span>${h(activeZone)} · ${h(({recommended:'Recomendadas',impact:'Mayor impacto',price:'Menor precio',type:'Tipo de tránsito'})[activeSort]||activeSort)}</span>
      <button type="button" data-action="clear-filters">Limpiar</button>`:'';
  }
  document.getElementById('cards').innerHTML=list.length
    ? list.map((s,index)=>renderBrochureCard(s,index<4)).join('')
    : `<div class="empty-state">No hay pantallas activas en ${activeZone}.<br><button type="button" data-action="set-zone" data-zone="Todos">Ver todas</button></div>`;
  updateMapMarkers();
  renderQuote();
  loadLazyVideos(document.getElementById('cards'));
}

function mapScreens(){
  return activeZone==='Todos'?ACTIVE_SCREENS:ACTIVE_SCREENS.filter(s=>s.b===activeZone);
}

function updateMapMarkers(){
  if(!map)return;
  const visibleIds=new Set(mapScreens().map(s=>s.id));
  ACTIVE_SCREENS.forEach(s=>{
    const marker=markers[s.id];
    if(!marker)return;
    if(visibleIds.has(s.id)){
      if(!map.hasLayer(marker))marker.addTo(map);
    }else if(map.hasLayer(marker)){
      map.removeLayer(marker);
    }
  });
  if(activeScreenId&&!visibleIds.has(activeScreenId))closeScreen();
}

function fitMapToActiveZone(){
  const list=mapScreens();
  if(!map||!list.length)return;
  if(list.length===1){
    map.flyTo([list[0].lat,list[0].lng],14);
    return;
  }
  const bounds=L.latLngBounds(list.map(s=>[s.lat,s.lng]));
  map.fitBounds(bounds,{padding:[48,48],maxZoom:13});
}

function selectedDuration(){
  return DURATIONS.find(d=>d.v===quoteDuration)||DURATIONS[0];
}

function quoteScreens(){
  return selectedScreens.map(id=>ACTIVE_SCREENS.find(s=>s.id===id)).filter(Boolean);
}

function quoteTotals(){
  const d=selectedDuration();
  const screens=quoteScreens();
  return {
    duration:d,
    screens,
    total:screens.reduce((acc,s)=>acc+(s.precio*d.mult),0),
    impacts:screens.reduce((acc,s)=>acc+(impNum(s)*d.days),0)
  };
}

function renderQuote(){
  const q=quoteTotals();
  const durationHtml=durationOptions();
  const listHtml=q.screens.length?q.screens.map(s=>`
    <div class="quote-item">
      <div><strong>${h(s.n)}</strong><div class="muted small">${h(s.b)} · ${fmt(s.precio)}/semana</div></div>
      <button type="button" aria-label="Quitar ${h(s.n)}" data-action="toggle-quote" data-screen-id="${s.id}">×</button>
    </div>`).join(''):'';
  [
    {prefix:'',duration:'duration-select'}
  ].forEach(panel=>{
    const durationSelect=document.getElementById(panel.duration);
    const list=document.getElementById(`${panel.prefix}quote-list`);
    const count=document.getElementById(`${panel.prefix}quote-count`);
    const impacts=document.getElementById(`${panel.prefix}quote-impacts`);
    const total=document.getElementById(`${panel.prefix}quote-total`);
    const whatsapp=document.getElementById(`${panel.prefix}quote-whatsapp`);
    const mediakit=document.getElementById(`${panel.prefix}quote-mediakit`);
    const summaryCount=document.getElementById(`${panel.prefix}quote-summary-count`);
    const summaryDetail=document.getElementById(`${panel.prefix}quote-summary-detail`);
    const status=document.getElementById(`${panel.prefix}quote-status`);
    const hint=document.getElementById(`${panel.prefix}quote-action-hint`);
    const mobileToggle=document.getElementById(`${panel.prefix}mobile-quote-toggle`);
    const mobileCart=document.getElementById(`${panel.prefix}mobile-quote-cart`);
    const mobileCartSummary=document.getElementById(`${panel.prefix}mobile-quote-cart-summary`);
    const mobileCartMeta=document.getElementById(`${panel.prefix}mobile-quote-cart-meta`);
    const quotePanel=whatsapp?.closest('.quote-panel');
    const hasScreens=q.screens.length>0;
    if(durationSelect)durationSelect.innerHTML=durationHtml;
    if(list)list.innerHTML=listHtml;
    if(list)list.classList.toggle('is-empty',!hasScreens);
    if(count)count.textContent=q.screens.length;
    if(impacts)impacts.textContent=Math.round(q.impacts).toLocaleString('es-AR');
    if(total)total.textContent=fmt(q.total);
    if(whatsapp){
      whatsapp.disabled=!hasScreens;
      whatsapp.classList.toggle('is-empty',!hasScreens);
      whatsapp.innerHTML=hasScreens?whatsappButtonContent('Contactar'):whatsappButtonContent('Contactar', plusIcon);
    }
    if(mediakit){
      mediakit.disabled=!hasScreens;
      mediakit.classList.toggle('is-empty',!hasScreens);
      mediakit.innerHTML=hasScreens?whatsappButtonContent('Generar media kit', documentIcon):whatsappButtonContent('Generar media kit', documentIcon);
    }
    if(status)status.textContent=hasScreens?'Listo':'Vacío';
    if(hint)hint.textContent=hasScreens?'Genera una propuesta con snapshot, inversión, impactos y condiciones; luego puedes guardarla como PDF o contactar por WhatsApp.':'Agrega una pantalla al cotizador para generar una propuesta compartible.';
    if(quotePanel)quotePanel.classList.toggle('has-selection',hasScreens);
    if(summaryCount)summaryCount.textContent=hasScreens?`${q.screens.length} ${q.screens.length===1?'pantalla':'pantallas'} · ${Math.round(q.impacts/1000).toLocaleString('es-AR')}k impactos · ${fmt(q.total)}`:'0 pantallas · Sin plan armado';
    if(summaryDetail)summaryDetail.textContent=hasScreens?`${q.duration.l} · disponibilidad a confirmar`:'Agrega pantallas para estimar inversión';
    if(mobileToggle){
      const label=hasScreens?`${q.screens.length} ${q.screens.length===1?'pantalla':'pantallas'} · ${fmt(q.total)}`:'Cotizador';
      const labelTarget=mobileToggle.querySelector('span')||mobileToggle;
      labelTarget.textContent=label;
    }
    if(mobileCart){
      mobileCart.hidden=!hasScreens;
      mobileCart.classList.toggle('show',hasScreens);
      mobileCart.setAttribute('aria-hidden',hasScreens?'false':'true');
    }
    if(mobileCartSummary)mobileCartSummary.textContent=hasScreens?`${q.screens.length} ${q.screens.length===1?'pantalla':'pantallas'} · ${fmt(q.total)}`:'Cotizador vacío';
    if(mobileCartMeta)mobileCartMeta.textContent=hasScreens?`${Math.round(q.impacts/1000).toLocaleString('es-AR')}k impactos · ${q.duration.l}`:'Agrega pantallas para armar tu plan';
  });
}

async function buildMediaKitFromQuote(){
  const q=quoteTotals();
  if(!q.screens.length)return null;
  const createdAt=new Date();
  const validUntil=new Date(createdAt);
  validUntil.setDate(validUntil.getDate()+15);
  const client=`Propuesta ${BRAND.name}`;
  const kit={
    id:`kit-${kitSlug(client)}-${createdAt.getTime()}`,
    client,
    contact:'Equipo comercial',
    duration:q.duration.l,
    durationValue:q.duration.v,
    days:q.duration.days,
    screenIds:q.screens.map(s=>s.id),
    screenSnapshots:q.screens.map(s=>screenSnapshot(s,q.duration)),
    screens:q.screens.length,
    total:q.total,
    impacts:q.impacts,
    cpm:q.impacts?Math.round(q.total/q.impacts*1000):0,
    status:'Borrador',
    createdAt:createdAt.toISOString(),
    validUntil:validUntil.toISOString().slice(0,10),
    validity:'15 días',
    executiveSummary:`Plan recomendado de ${q.screens.length} ${q.screens.length===1?'pantalla':'pantallas'} para cubrir puntos de alto tránsito durante ${q.duration.l}, con ${Math.round(q.impacts).toLocaleString('es-AR')} impactos estimados y CPM de ${fmt(q.impacts?q.total/q.impacts*1000:0)}.`,
    nextSteps:['Validar disponibilidad de pantallas y fechas de campaña.','Confirmar inversión, forma de pago y orden de compra.','Enviar piezas finales 72 hs hábiles antes del inicio.'],
    terms:'Inicio de campaña sujeto a disponibilidad y aprobación de piezas. Valores expresados en ARS. La reserva se confirma con orden de compra y material aprobado.',
    brand:{name:BRAND.name,logo:BRAND.logo,whatsapp:BRAND.whatsapp}
  };
  kit.digitalSignature=await SmartKitShared.signMediaKit(kit,{
    signer:CONFIG.signature?.signer||BRAND.name,
    secret:CONFIG.signature?.secret||''
  });
  return kit;
}

/**
 * Genera un Media Kit evitando el bloqueo de ventanas emergentes (popups).
 * La ventana se abre de forma sincrónica inmediatamente tras el gesto del usuario.
 */
function generateMediaKit(id=null){
  ensureQuoteScreen(id);
  
  // 1. Abrir la pestaña inmediatamente (Sincrónico) para garantizar que el navegador lo permita.
  const popup = window.open('', '_blank');
  
  if (!popup) {
    showFeedback('Ventana bloqueada. Por favor, habilita los popups para este sitio.');
    return;
  }

  // 2. Mostrar un estado de carga en la nueva pestaña para mejorar la UX.
  popup.document.write(`
    <html>
      <head>
        <title>Generando Propuesta - ${h(BRAND.name)}</title>
        <style>
          body { margin: 0; background: #f6f8fb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .container { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; color: #0f172a; }
          .logo { width: 54px; height: 54px; background: ${THEME.primary || '#0369a1'}; color: white; border-radius: 14px; display: grid; place-items: center; font-weight: 950; font-size: 24px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
          .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: ${THEME.primary || '#0369a1'}; border-radius: 50%; animation: spin 0.8s infinite linear; margin-bottom: 20px; }
          h2 { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #1e293b; }
          p { margin: 0; color: #64748b; font-size: 15px; max-width: 280px; line-height: 1.5; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">${h(BRAND.logo)}</div>
          <div class="spinner"></div>
          <h2>Preparando Media Kit</h2>
          <p>Estamos procesando las pantallas y generando la firma de seguridad para <strong>${h(BRAND.name)}</strong>.</p>
        </div>
      </body>
    </html>
  `);
  popup.document.close();

  // 3. Ejecutar la lógica asíncrona (firma digital)
  buildMediaKitFromQuote().then(kit => {
    if (!kit) {
      popup.close();
      return;
    }
    const kits = [kit, ...storedPublicKits().filter(item => item.id !== kit.id)].slice(0, 12);
    localStorage.setItem(PUBLIC_KITS_STORAGE_KEY, JSON.stringify(kits));
    updateMediaKitLinks(kit.id);
    showGeneratedFeedback(kit);
    
    // 4. Redirigir la ventana ya abierta al destino final.
    popup.location.href = `./mediakit.html?id=${encodeURIComponent(kit.id)}`;
  }).catch(err => {
    console.error('Error al generar Media Kit:', err);
    popup.close();
    showFeedback('Error al generar el Media Kit');
  });
}

function toggleQuoteScreen(id){
  const wasSelected=selectedScreens.includes(id);
  selectedScreens=wasSelected?selectedScreens.filter(x=>x!==id):[...selectedScreens,id];
  const screen=ACTIVE_SCREENS.find(s=>s.id===id);
  renderBrochure();
  renderQuote();
  if(activeScreenId)openScreen(activeScreenId);
  if(screen)showFeedback(wasSelected?'Quitado del cotizador':'Agregado al cotizador');
}

function ensureQuoteScreen(id){
  if(id&&!selectedScreens.includes(id)){
    selectedScreens=[...selectedScreens,id];
    renderBrochure();
    renderQuote();
    if(activeScreenId)openScreen(activeScreenId);
  }
}

function requestWhatsappQuote(id=null, trigger=null){
  ensureQuoteScreen(id);
  const q=quoteTotals();
  if(!q.screens.length)return;
  const whatsappTarget=trigger&&!trigger.disabled?trigger:document.querySelector('[data-action="whatsapp-quote"]:not([disabled])');
  const previousHtml=whatsappTarget?.innerHTML;
  const normalizedPhone=String(whatsappPhone||'').replace(/\D/g,'');
  if(whatsappTarget)whatsappTarget.innerHTML=whatsappButtonContent('Abriendo WhatsApp...');
  const screenLines=q.screens.map(s=>`- ${s.n} (${s.b}) - ${fmt(s.precio)}/semana - CPM ${fmt(screenCpm(s))}`).join('\n');
  const msg=`Hola, quiero consultar por esta campaña de ${BRAND.name}:

Pantallas seleccionadas (${q.screens.length}):
${screenLines}

Duración: ${q.duration.l}
Impactos estimados: ${Math.round(q.impacts).toLocaleString('es-AR')}
Inversión estimada: ${fmt(q.total)}

Gracias.`;
  if(normalizedPhone)window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
  if(whatsappTarget&&previousHtml)setTimeout(()=>{whatsappTarget.innerHTML=previousHtml;},1600);
}

function showOnMap(id, trigger=document.activeElement){
  const s=ACTIVE_SCREENS.find(x=>x.id===id);
  if(!s)return;
  setView('map', false);
  setTimeout(()=>map.flyTo([s.lat,s.lng],14),90);
  openScreen(id, trigger);
}

function applyBrand(){
  document.title=BRAND.name+' - Brochure y Mapa';
  Shared.applyBrandHeader(BRAND);
  document.getElementById('hero-title').textContent=BRAND.name;
  document.getElementById('hero-copy').textContent=BRAND.heroCopy;
}

function applyTheme(){
  const root=document.documentElement;
  const vars={
    '--brand-primary':THEME.primary,
    '--brand-primary-strong':THEME.primaryStrong,
    '--brand-success':THEME.success,
    '--brand-success-strong':THEME.successStrong
  };
  Object.entries(vars).forEach(([name,value])=>{
    if(value)root.style.setProperty(name,value);
  });
}

function bindEvents(){
  document.addEventListener('click',event=>{
    const viewButton=event.target.closest('[data-view]');
    if(viewButton&&viewButton instanceof HTMLButtonElement){
      setView(viewButton.dataset.view);
      return;
    }
    const actionTarget=event.target.closest('[data-action]');
    if(!actionTarget){
      if(mobileNavOpen&&!event.target.closest('.top'))setMobileNav(false);
      if(mobileFiltersOpen&&!event.target.closest('#zone-filters'))setMobileFilters(false);
      return;
    }
    const id=Number(actionTarget.dataset.screenId);
    const action=actionTarget.dataset.action;
    if(action==='generate-mediakit')generateMediaKit(id);
    if(action==='whatsapp-quote')requestWhatsappQuote(id, actionTarget);
    if(action==='toggle-quote')toggleQuoteScreen(id);
    if(action==='show-map')showOnMap(id, actionTarget);
    if(action==='close-screen')closeScreen();
    if(action==='set-zone')setZone(actionTarget.dataset.zone);
    if(action==='clear-filters'){
      activeZone='Todos';
      activeSort='recommended';
      setMobileFilters(false);
      renderBrochure();
      updateMapMarkers();
    }
    if(action==='toggle-mobile-quote')setMobileQuote(!mobileQuoteOpen);
    if(action==='toggle-nav')setMobileNav(!mobileNavOpen);
    if(action==='toggle-filters')setMobileFilters(!mobileFiltersOpen);
  });

  document.addEventListener('change',event=>{
    if(event.target.matches('[data-duration-select]')){
      quoteDuration=event.target.value;
      renderQuote();
      renderBrochure();
      return;
    }
    if(event.target.matches('[data-screen-duration-select]')){
      quoteDuration=event.target.value;
      renderQuote();
      openScreen(Number(event.target.dataset.screenId));
      renderBrochure();
      return;
    }
    if(event.target.matches('[data-zone-select]')){
      setZone(event.target.value);
      setMobileFilters(false);
    }
    if(event.target.matches('[data-sort-select]')){
      setSort(event.target.value);
      setMobileFilters(false);
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(mobileFiltersOpen){
      event.preventDefault();
      setMobileFilters(false);
      return;
    }
    if(mobileQuoteOpen){
      event.preventDefault();
      setMobileQuote(false);
      return;
    }
    if(activeScreenId){
      event.preventDefault();
      closeScreen();
    }
  });
}

window.addEventListener('DOMContentLoaded',()=>{
  applyTheme();
  applyBrand();
  updateMediaKitLinks();
  bindEvents();
  initMap();
  const initialView=new URLSearchParams(window.location.search).get('view')==='map'?'map':'brochure';
  setView(initialView,false);
  renderBrochure();
});
