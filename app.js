const BrochureApp = (() => {
  const Shared = window.SmartKitShared;
  const { formatMoney: fmt, impNum, escapeHtml: h } = Shared;

  const ICONS = {
    WHATSAPP: '<svg slot="icon" class="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5a8.5 8.5 0 0 0-7.23 12.97L4 20l3.62-.74A8.5 8.5 0 1 0 12 3.5Zm0 1.8a6.7 6.7 0 0 1 5.72 10.18 6.7 6.7 0 0 1-9.45 2.12l-.3-.2-1.62.33.35-1.56-.22-.32A6.7 6.7 0 0 1 12 5.3Zm-2.44 3.5c-.2 0-.5.08-.77.37-.27.3-.9.88-.9 2.1 0 1.23.92 2.42 1.05 2.59.13.17 1.78 2.84 4.42 3.76 2.2.77 2.65.42 3.12-.03.38-.36.6-1.02.66-1.28.07-.27.04-.48-.15-.58l-1.78-.85c-.2-.1-.44-.05-.57.14l-.5.64c-.13.17-.32.2-.52.1-.42-.18-1.17-.51-1.92-1.18-.7-.62-1.18-1.4-1.32-1.63-.13-.23-.02-.39.1-.52l.37-.43c.12-.14.18-.3.27-.48.09-.18.04-.34-.03-.48l-.82-1.83c-.12-.27-.3-.4-.5-.4Z"/></svg>',
    PLUS: '<svg slot="icon" class="whatsapp-icon plus-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>',
    DOCUMENT: '<svg slot="icon" class="whatsapp-icon plus-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Z"/></svg>'
  };

  const state = {
    sourceScreens: [],
    activeScreens: [],
    brand: { ...Shared.DEFAULT_BRAND },
    activeSort: 'recommended',
    markers: {},
    selectedScreens: [],
    quoteDuration: '1s',
    activeScreenId: null,
    mobileQuoteOpen: false,
    mobileNavOpen: false,
    mobileFiltersOpen: false,
    lastScreenTrigger: null,
    lastQuoteTrigger: null,
    lastFilterTrigger: null,
    zones: ['Todos'],
    activeMetrics: { totalReach: 0 }
  };

function whatsappButtonContent(label, icon = ICONS.WHATSAPP) {
  return `${icon}<span>${h(label)}</span>`;
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

function setMobileQuote(open){
  if (open) state.lastQuoteTrigger = document.activeElement;
  state.mobileQuoteOpen = open;
  const panel=document.getElementById('quote-panel');
  const toggle=document.getElementById('mobile-quote-toggle');
  if (open) setMobileFilters(false);
  panel?.classList.toggle('mobile-open', open);
  toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.getElementById('mobile-quote-cart')?.classList.toggle('is-suppressed', open);
  if (open) setView('brochure', false);
  if (open && panel) requestAnimationFrame(() => panel.focus({ preventScroll: true }));
  if (!open && state.lastQuoteTrigger instanceof HTMLElement) state.lastQuoteTrigger.focus({ preventScroll: true });
}

function setMobileNav(open){
  state.mobileNavOpen = open;
  const header=document.querySelector('.top');
  const toggle=document.getElementById('menu-toggle');
  header?.classList.toggle('menu-open', open);
  toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setMobileFilters(open){
  if (open) state.lastFilterTrigger = document.activeElement;
  state.mobileFiltersOpen = open;
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
  const videoUrl=Shared.safeAssetUrl(s.video);
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

function renderBrochureCard(s, eagerVideo=false){
  const selected=state.selectedScreens.includes(s.id);
  const availability=screenAvailability(s);
  const badgeText=selected?'Seleccionada':h(s.tipo);
  const badgeClass=selected?'badge-selected':'';
  return `
    <article class="card video-card ${selected?'selected':''}">
      ${screenHead(s, 'thumb', `<span class="badge media-badge ${badgeClass}" style="background:${Shared.TIPO_COL[s.tipo]}22;color:${Shared.TIPO_COL[s.tipo]}">${badgeText}</span>`, eagerVideo)}
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
          <button class="btn primary quote-add ${selected?'selected':''}" aria-pressed="${selected?'true':'false'}" aria-label="${selected?'Quitar':'Agregar'} ${h(s.n)} del plan" data-action="toggle-quote" data-screen-id="${s.id}">${selected?'Agregado':'Agregar'}</button>
          <button class="btn map-btn" data-action="show-map" data-screen-id="${s.id}">Ubicar</button>
        </div>
      </div>
    </article>`;
}

function renderFilters() {
  document.getElementById('hero-stats').innerHTML=`
    <div class="stat"><b>${state.activeScreens.length}</b><span>Pantallas activas</span></div>
    <div class="stat"><b>${Math.round(state.activeMetrics.totalReach / 1000)}k</b><span>Impactos/día</span></div>
    <div class="stat"><b>${fmt(state.activeScreens.reduce((min, s) => Math.min(min, s.precio), Infinity))}</b><span>Desde / semana</span></div>
    <div class="stat"><b>${state.zones.length - 1}</b><span>Zonas</span></div>`;

  document.getElementById('zone-filters').innerHTML = state.zones.map(z =>
    `<button class="chip ${z === state.activeZone ? 'on' : ''}" data-action="set-zone" data-zone="${h(z)}">${h(z)}</button>`
  ).join('');

  const sortOptions = [ { key: 'recommended', label: 'Recomendadas' }, { key: 'impact', label: 'Mayor impacto' }, { key: 'price', label: 'Menor precio' }, { key: 'type', label: 'Tipo de tránsito' } ];
  document.getElementById('sort-filters').innerHTML = sortOptions.map(opt =>
    `<button class="chip ${opt.key === state.activeSort ? 'on' : ''}" data-action="set-sort" data-sort="${h(opt.key)}">${h(opt.label)}</button>`
  ).join('');
}

function durationOptions(){
  return Shared.DURATIONS.map(d => `<option value="${d.v}" ${d.v === state.quoteDuration ? 'selected' : ''}>${h(d.l)}</option>`).join('');
}

function renderScreenCard(s){
  const selected = state.selectedScreens.includes(s.id);
  const availability=screenAvailability(s);
  const d=selectedDuration();
  const q=quoteTotals();
  const subtotal=s.precio*d.mult;
  const previewScreens=selected?q.screens:[...q.screens,s];
  const previewTotal=previewScreens.reduce((acc,screen)=>acc+(screen.precio*d.mult),0);
  const previewImpacts=previewScreens.reduce((acc,screen)=>acc+(impNum(screen)*d.days),0);
  const selectedList=previewScreens.length?previewScreens.map(screen=>`
    <div class="quote-item">
      <div><strong>${h(screen.n)}</strong><div class="muted small">${h(screen.b)} · ${fmt(screen.precio)}/semana${!state.selectedScreens.includes(screen.id) ? ' · se suma al reservar' : ''}</div></div>
      ${state.selectedScreens.includes(screen.id) ? `<button type="button" aria-label="Quitar ${h(screen.n)}" data-action="toggle-quote" data-screen-id="${screen.id}">×</button>` : ''}
    </div>`).join(''):'<div class="quote-empty">Agrega pantallas desde el brochure para armar tu plan.</div>';
  return `
    ${screenHead(s,'media',`<span class="badge media-badge" style="background:${Shared.TIPO_COL[s.tipo]}22;color:${Shared.TIPO_COL[s.tipo]}">${h(s.tipo)}</span>`)}
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
        <div class="metric"><span class="muted small">Audiencia</span><b>${h(s.aud || 'General')}</b></div>
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
          <button class="btn primary quote-btn quote-mediakit reserve-btn" data-action="generate-mediakit" data-screen-id="${s.id}">${whatsappButtonContent('Generar Propuesta', ICONS.DOCUMENT)}</button>
          <button class="btn success quote-btn quote-whatsapp reserve-btn" data-action="toggle-quote" data-screen-id="${s.id}">${whatsappButtonContent(selected ? 'Quitar del plan' : 'Agregar al plan', ICONS.PLUS)}</button>
        </div>
      </div>
    </div>`;
}

function renderBrochure(){
  const list = sortedScreens(state.activeZone === 'Todos' ? state.activeScreens : state.activeScreens.filter(s => s.b === state.activeZone));
  const catalogCount=document.getElementById('catalog-count');
  if (catalogCount) catalogCount.textContent = `${list.length} ${list.length === 1 ? 'pantalla' : 'pantallas'}${state.activeZone === 'Todos' ? '' : ' · ' + state.activeZone}`;
  const activeChip=document.getElementById('active-filter-chip');
  if(activeChip){
    const hasFilter = state.activeZone !== 'Todos' || state.activeSort !== 'recommended';
    activeChip.hidden=!hasFilter;
    activeChip.innerHTML=hasFilter?`
      <span>${h(state.activeZone)} · ${h(({ recommended: 'Recomendadas', impact: 'Mayor impacto', price: 'Menor precio', type: 'Tipo de tránsito' })[state.activeSort] || state.activeSort)}</span>
      <button type="button" data-action="clear-filters">Limpiar</button>`:'';
  }
  document.getElementById('cards').innerHTML=list.length
    ? list.map((s,index)=>renderBrochureCard(s,index<4)).join('')
    : `<div class="empty-state">No hay pantallas activas en ${state.activeZone}.<br><button type="button" data-action="set-zone" data-zone="Todos">Ver todas</button></div>`;
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
    const status=document.getElementById(`${panel.prefix}quote-status`);
    const hint=document.getElementById(`${panel.prefix}quote-action-hint`);
    const quotePanel=whatsapp?.closest('.quote-panel');
    const hasScreens=q.screens.length>0;
    if(durationSelect)durationSelect.innerHTML=durationHtml;
    if(mediakit){
      mediakit.disabled=!hasScreens;
      mediakit.classList.toggle('is-empty', !hasScreens);
    }
    if(status)status.textContent=hasScreens?'Listo':'Vacío';
    if(hint)hint.textContent=hasScreens?'Genera una propuesta con snapshot, inversión, impactos y condiciones; luego puedes guardarla como PDF o contactar por WhatsApp.':'Agrega una pantalla al cotizador para generar una propuesta compartible.';
    if(list)list.innerHTML=listHtml || '<div class="quote-empty">Agrega pantallas desde el brochure para armar tu plan.</div>';
    if(list)list.classList.toggle('is-empty',!hasScreens);
    if(count)count.textContent=q.screens.length;
    if(impacts)impacts.textContent=Math.round(q.impacts).toLocaleString('es-AR');
    if(total)total.textContent=fmt(q.total);
    if(whatsapp){
      whatsapp.disabled=!hasScreens;
      whatsapp.classList.toggle('is-empty',!hasScreens);
      whatsapp.innerHTML=whatsappButtonContent('Contactar');
    }
    if(quotePanel)quotePanel.classList.toggle('has-selection',hasScreens);
    if(summaryCount)summaryCount.textContent=hasScreens?`${q.screens.length} ${q.screens.length===1?'pantalla':'pantallas'} · ${Math.round(q.impacts/1000).toLocaleString('es-AR')}k impactos · ${fmt(q.total)}`:'0 pantallas · Sin plan armado';
  });
}

function handleFocusTrap(event) {
  if (event.key !== 'Tab') return;

  const container = document.getElementById('mediakit-offcanvas');
  const focusableElements = Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) { // Shift + Tab
    if (document.activeElement === firstElement) {
      lastElement.focus();
      event.preventDefault();
    }
  } else { // Tab
    if (document.activeElement === lastElement) {
      firstElement.focus();
      event.preventDefault();
    }
  }
}

async function generateMediaKit(id=null){
  if (id) ensureQuoteScreen(id);
  const kit=await Shared.buildMediaKit(quoteTotals(), BRAND, window.CONFIG || {}, 'Borrador');
  if(!kit)return;

  // Mejora: Enviar el kit a la API para persistencia remota.
  try {
    const response = await fetch('/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kit)
    });
    if (!response.ok) throw new Error('No se pudo guardar el media kit en el servidor.');
    console.log('Media kit guardado en la API con éxito.');
  } catch (error) {
    console.error(error);
    // Opcional: Guardar en localStorage como fallback si la API falla.
    Shared.showToast('Error al guardar la propuesta, se guardó localmente.', 'error');
  }

  showGeneratedFeedback(kit);

  const offcanvas = document.getElementById('mediakit-offcanvas');
  const iframe = offcanvas?.querySelector('iframe');
  if (iframe) {
    iframe.src = Shared.getMediaKitUrl(kit.id);
    setOffcanvas(true);
  } else {
    // Fallback para navegadores o contextos donde el offcanvas no esté disponible
    window.open(Shared.getMediaKitUrl(kit.id), '_blank', 'noopener');
  }
}

function toggleQuoteScreen(id){
  const wasSelected = state.selectedScreens.includes(id);
  state.selectedScreens = wasSelected ? state.selectedScreens.filter(x => x !== id) : [...state.selectedScreens, id];
  const screen = state.activeScreens.find(s => s.id === id);
  renderBrochure();
  renderQuote();
  if (state.activeScreenId) openScreen(state.activeScreenId);
  if (screen) showFeedback(wasSelected ? 'Quitado del cotizador' : 'Agregado al cotizador');
}

function ensureQuoteScreen(id){
  if (id && !state.selectedScreens.includes(id)) {
    state.selectedScreens = [...state.selectedScreens, id];
    renderBrochure();
    renderQuote();
    if (state.activeScreenId) openScreen(state.activeScreenId);
  }
}

function requestWhatsappQuote(id=null, trigger=null){
  ensureQuoteScreen(id);
  const q=quoteTotals();
  const whatsappTarget=trigger&&!trigger.disabled?trigger:document.querySelector('[data-action="whatsapp-quote"]:not([disabled])');
  const previousHtml=whatsappTarget?.innerHTML;
  const normalizedPhone = String(state.brand.whatsapp || '').replace(/\D/g, '');
  if(whatsappTarget)whatsappTarget.innerHTML=whatsappButtonContent('Abriendo WhatsApp...');
  
  let msg;
  if (q.screens.length > 0) {
    const screenLines=q.screens.map(s=>`- ${s.n} (${s.b}) - ${fmt(s.precio)}/semana - CPM ${fmt(screenCpm(s))}`).join('\n');
    msg=`Hola, quiero consultar por esta campaña de ${BRAND.name}:

Pantallas seleccionadas (${q.screens.length}):
${screenLines}

Duración: ${q.duration.l}
Impactos estimados: ${Math.round(q.impacts).toLocaleString('es-AR')}
Inversión estimada: ${fmt(q.total)}`;
  } else {
    msg = `Hola, quiero hacer una consulta sobre las campañas de publicidad en ${BRAND.name}.`;
  }
  if(normalizedPhone)window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
  if(whatsappTarget&&previousHtml)setTimeout(()=>{whatsappTarget.innerHTML=previousHtml;},1600);
}

function applyBrand(){
  document.title = state.brand.name + ' - Brochure y Mapa';
  Shared.applyBrandHeader(state.brand);
  document.getElementById('hero-title').textContent = state.brand.name;
  document.getElementById('hero-copy').textContent = state.brand.heroCopy;
}

function bindEvents(){
  document.addEventListener('click',event=>{
    const action=actionTarget.dataset.action;
    if(action==='generate-mediakit')generateMediaKit(id);
    if(action==='whatsapp-quote')requestWhatsappQuote(id, actionTarget);
    if(action==='toggle-quote')toggleQuoteScreen(id);
    if(action==='show-map')showOnMap(id, actionTarget);
    if(action==='close-screen')closeScreen();
    if(action==='set-zone')setZone(actionTarget.dataset.zone);
    if(action==='set-sort')setSort(actionTarget.dataset.sort);
    if(action==='clear-filters'){
      state.activeZone = 'Todos';
      state.activeSort = 'recommended';
      document.querySelectorAll('[data-sort-select] option[value="recommended"]').forEach(o => o.selected = true);
      setMobileFilters(false);
      renderBrochure();
      updateMapMarkers();
    }
    if (action === 'toggle-mobile-quote') setMobileQuote(!state.mobileQuoteOpen);
    if (action === 'toggle-nav') setMobileNav(!state.mobileNavOpen);
    if (action === 'toggle-filters') setMobileFilters(!state.mobileFiltersOpen);
    if(action==='close-offcanvas')setOffcanvas(false);
  });

  document.addEventListener('change',event=>{
    if(event.target.matches('[data-duration-select]')){
      state.quoteDuration = event.target.value;
      renderQuote();
      renderBrochure();
      return;
    }
    if(event.target.matches('[data-sort-select]')){
      setSort(event.target.value);
      setMobileFilters(false);
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if (state.mobileFiltersOpen) {
      event.preventDefault();
      setMobileFilters(false);
      return;
    }
    if (state.mobileQuoteOpen) {
      event.preventDefault();
      setMobileQuote(false);
      return;
    }
    if (state.activeScreenId) {
      event.preventDefault();
      closeScreen();
    }
    const offcanvas = document.getElementById('mediakit-offcanvas');
    if (offcanvas && offcanvas.getAttribute('aria-hidden') === 'false') {
      event.preventDefault();
      setOffcanvas(false);
    }
  });
}

  /**
   * Checks for a screen ID passed from map.js via localStorage and adds it to the quote.
   * This creates a seamless flow for the user between the map and the brochure.
   */
  function handleRedirectFromMap() {
    const screenIdToAdd = localStorage.getItem('sk_v1_add-to-quote');
    if (screenIdToAdd) {
      const screenId = parseInt(screenIdToAdd, 10);
      // Ensure the screen is not already in the quote to avoid duplicates.
      if (!state.selectedScreens.includes(screenId)) {
        state.selectedScreens.push(screenId);
        const screen = state.sourceScreens.find(s => s.id === screenId);
        if (screen) {
          // The toast from map.js is already shown, so this is optional.
          // Shared.showToast(`✓ ${screen.n} agregada al cotizador`);
        }
      }
      localStorage.removeItem('sk_v1_add-to-quote'); // Clean up the temporary key.
    }
  }

  async function loadData() {
    try {
      state.sourceScreens = await Shared.loadInventory();
    } catch (error) {
      console.error('Error al cargar datos de pantallas:', error);
      document.getElementById('cards').innerHTML = `<div class="empty-state"><h3>Error al cargar el inventario</h3><p>Por favor, intenta recargar la página.</p></div>`;
    }
  }

  async function init() {
    await loadData();
    
    handleRedirectFromMap(); // Check for and handle the action from the map page.

    state.activeScreens = state.sourceScreens.filter(s => s.status ? s.status === 'Activo' : (s.active !== false));
    state.zones = ['Todos', ...new Set(state.activeScreens.map(s => s.b))];
    state.activeMetrics.totalReach = state.activeScreens.reduce((acc, s) => acc + impNum(s), 0);

  applyBrand();
  Shared.updateMediaKitLinks();
  renderFilters();
  renderBrochure();
  bindEvents();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', BrochureApp.init);
