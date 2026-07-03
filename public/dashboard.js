const Shared = window.SmartKitShared;
const theme = {};
const fmt = Shared.formatMoney;
const imp = Shared.impNum;
const h = Shared.escapeHtml;

const MODE = 'static'; // El script de build lo cambiará a 'api' si es necesario
// --- MEJORA: Centralizar el estado de la aplicación en un solo objeto.
const state = {
  rows: [],
  selectedId: null,
  currentSection: 'inventory',
  kitSelected: new Set(),
  savedKits: [],
  brand: {name:'SmartKit',logo:'SK', terms:'', validity:'15 dias', whatsapp: ''}
};

// --- MEJORA: Usar constantes para strings recurrentes (evita "magic strings").
const SECTIONS = { INVENTORY: 'inventory', MEDIAKITS: 'mediakits', METRICS: 'metrics', SETTINGS: 'settings' };
const KIT_STATUS = { DRAFT: 'Borrador', ARCHIVED: 'Archivado' };
const SCREEN_STATUS = { ACTIVE: 'Activo', PAUSED: 'Pausado' };


const debouncedPersist = Shared.debounce((message) => {
  // Ahora el estado ya está centralizado.
  const persistableState = { rows: state.rows, kits: state.savedKits, brand: state.brand };
  Shared.persistDashboardState(persistableState, message || 'Cambios guardados automáticamente');
}, 1500);


async function loadInitialData(){
  const urlParams = new URLSearchParams(window.location.search);
  const loadDefault = urlParams.get('load') === 'default';

  const savedState = Shared.loadDashboardState();
  if (MODE === 'api') {
    try {
      console.log('SmartKit: Modo API, cargando desde /inventory...');
      const response = await fetch('/inventory');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      state.rows = await response.json();
    } catch (err) {
      console.error('Fallo al cargar las pantallas desde la API', err);
      state.rows = [];
    }
  } else if (savedState && !loadDefault) {
    state.rows = savedState.rows;
    state.savedKits = savedState.kits || [];
    Object.assign(state.brand, savedState.brand || {});
  } else {
    state.rows = JSON.parse(JSON.stringify(SCREENS));
    state.rows.forEach(row => { row.status = row.active ? SCREEN_STATUS.ACTIVE : SCREEN_STATUS.PAUSED; });
    Shared.showToast('Datos iniciales cargados');
  }
  state.selectedId = state.rows[0]?.id;
}

// --- MEJORA: Extraer la lógica de cálculo de métricas para reutilizarla.
function calculateKitMetrics(screens, duration) {
  const total = screens.reduce((sum, row) => sum + row.precio * duration.mult, 0);
  const impacts = screens.reduce((sum, row) => sum + imp(row) * duration.days, 0);
  const cpm = impacts ? Math.round(total / impacts * 1000) : 0;
  return { total, impacts, cpm };
}

function downloadKitJson(kit){
  const blob = new Blob([JSON.stringify(kit,null,2)], {type:'application/json;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${kit.id}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function applyBrand(){
  document.title = `${state.brand.name} - Dashboard de Gestion`;
  document.getElementById('dash-logo').textContent = state.brand.logo;
  document.getElementById('dash-brand').textContent = state.brand.name;
  if(theme.primary)document.documentElement.style.setProperty('--primary', theme.primary);
  if(theme.primaryStrong)document.documentElement.style.setProperty('--primary-strong', theme.primaryStrong);
  if(theme.success)document.documentElement.style.setProperty('--success', theme.success);
}

function updateKpis(){
  const active = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE);
  const totalImpacts = active.reduce((acc,row) => acc + imp(row), 0);
  const revenue = active.reduce((acc,row) => acc + row.precio, 0);
  const avgCpm = active.length
    ? active.reduce((acc,row) => acc + ((row.precio / (imp(row) * 7)) * 1000), 0) / active.length
    : 0;
  document.getElementById('kpi-published').textContent = `${active.length} / ${rows.length}`;
  document.getElementById('kpi-active').textContent = active.length;
  document.getElementById('kpi-reach').textContent = totalImpacts.toLocaleString('es-AR');
  document.getElementById('kpi-revenue').textContent = fmt(revenue);
  document.getElementById('kpi-cpm').textContent = fmt(avgCpm);
}

function fillFilters(){
  const zones = ['Todos', ...new Set(state.rows.map(row => row.b))];
  const types = ['Todos', ...new Set(state.rows.map(row => row.tipo))];

  const zoneOptions = zones.map(zone => `<option value="${h(zone)}">${h(zone)}</option>`).join('');
  const typeOptions = types.map(type => `<option value="${h(type)}">${h(type)}</option>`).join('');

  document.getElementById('zone-filter').innerHTML = zoneOptions;
  document.getElementById('type-filter').innerHTML = typeOptions;
  document.getElementById('kit-zone').innerHTML = zoneOptions;
  document.getElementById('kit-duration').innerHTML = Shared.DURATIONS.map(duration => `<option value="${duration.v}">${duration.l}</option>`).join('');
}

function filteredRows(){
  const query = document.getElementById('search').value.trim().toLowerCase();
  const zone = document.getElementById('zone-filter').value;
  const type = document.getElementById('type-filter').value;
  return state.rows.filter(row => {
    const matchesQuery = !query || [row.n,row.dir,row.b,row.tipo].some(value => String(value).toLowerCase().includes(query));
    const matchesZone = zone === 'Todos' || row.b === zone;
    const matchesType = type === 'Todos' || row.tipo === type;
    return matchesQuery && matchesZone && matchesType;
  });
}

function renderTable(){
  const list = filteredRows();
  let selectedChanged = false;
  if(list.length && !list.some(row => row.id === state.selectedId)){
    state.selectedId = list[0].id;
    selectedChanged = true;
  }
  document.getElementById('result-count').textContent = `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}`;
  document.getElementById('screen-table').innerHTML = list.map(row => `
    <tr class="${row.id === state.selectedId ? 'selected' : ''}">
      <td>
        <div class="screen-cell">
          <span class="screen-icon">${h(row.e)}</span>
          <div><strong>${h(row.n)}</strong><span>${h(row.dir)} · ${h(row.b)}</span></div>
        </div>
      </td>
      <td><span class="badge">${h(row.tipo)}</span></td>
      <td>${h(row.imp)}</td>
      <td><strong>${fmt(row.precio)}</strong></td>
      <td><span class="badge ${row.status === SCREEN_STATUS.ACTIVE ? 'active' : 'paused'}">${row.status}</span></td>
      <td>
        <button class="icon-btn" type="button" data-action="select" data-id="${row.id}" aria-label="Editar ${h(row.n)}">Editar</button>
      </td>
    </tr>
  `).join('');
  if(selectedChanged){
    const row = state.rows.find(item => item.id === state.selectedId);
    if(row)updateEditor(row);
  }
}

function renderPreview(row){
  const video = row.video ? `<video src="${row.video}" autoplay muted loop playsinline></video>` : '';
  document.getElementById('preview').innerHTML = `
    <div class="preview-media" style="background:${row.g || 'linear-gradient(135deg,#075985,#0f766e)'}">${row.e}${video}</div>
    <div class="preview-body">
      <h3>${row.n}</h3>
      <p>${row.dir} · ${row.b}</p>
      <div class="metrics-grid">
        <div class="metric"><span>Formato</span><b>${row.dim}</b></div>
        <div class="metric"><span>Resolucion</span><b>${row.res}</b></div>
        <div class="metric"><span>Audiencia</span><b>${h(row.aud || 'N/D')}</b></div>
        <div class="metric"><span>Impactos/dia</span><b>${row.imp}</b></div>
        <div class="metric"><span>CPM</span><b>${fmt((row.precio / (imp(row) * 7)) * 1000)}</b></div>
      </div>
    </div>
  `;
}

function updateEditor(row){
  if(!row)return;
  document.getElementById('editor-title').textContent = row.n;
  document.getElementById('edit-name').value = row.n;
  document.getElementById('edit-zone').value = row.b;
  document.getElementById('edit-price').value = row.precio;
  document.getElementById('edit-audience').value = row.aud || '';
  document.getElementById('edit-video').value = row.video || '';
  document.getElementById('edit-note').value = row.note;
  document.getElementById('edit-status').value = row.status || SCREEN_STATUS.ACTIVE;
  renderPreview(row);
}

function selectRow(id){
  state.selectedId = Number(id);
  const row = state.rows.find(item => item.id === state.selectedId) || state.rows[0];
  updateEditor(row);
  renderTable();
}

function exportCsv(){
  const header = ['id','nombre','zona','direccion','tipo','impactos_dia','precio_semana','estado'];
  const lines = state.rows.map(row => [row.id,row.n,row.b,row.dir,row.tipo,row.imp,row.precio,row.status].map(value => `"${String(value).replace(/"/g,'""')}"`).join(','));
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {type:'text/csv;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'smartkit-inventario.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  Shared.showToast('CSV exportado');
}

function setSection(section){
  state.currentSection = section;
  document.querySelectorAll('[data-section]').forEach(button=>{
    button.classList.toggle('active',button.dataset.section===section);
  });
  document.querySelectorAll('.section').forEach(panel=>{
    panel.hidden = panel.id !== `section-${section}`;
  });
  const titles = {
    [SECTIONS.INVENTORY]:['Gestion de pantallas','Administra inventario, disponibilidad, precios y vista comercial desde una sola superficie.'],
    [SECTIONS.MEDIAKITS]:['Constructor de Media Kits','Crea, previsualiza y mantiene propuestas comerciales listas para enviar a clientes.'],
    [SECTIONS.METRICS]:['Metricas comerciales','Analiza cobertura, mix de transito y potencial de venta por zona.'],
    [SECTIONS.SETTINGS]:['Configuracion comercial','Define marca, contacto y condiciones base para tus mediakits.']
  };
  document.getElementById('page-title').textContent = titles[section][0];
  document.getElementById('page-copy').textContent = titles[section][1];
  if(section === SECTIONS.MEDIAKITS) renderKitBuilder();
  if(section === SECTIONS.METRICS) renderMetrics();
}

function setKitStep(n){
  const client = document.getElementById('kit-client').value.trim();
  
  // Validación básica
  if(n > 1 && !client){
    Shared.showToast('Por favor, indica el nombre del cliente');
    document.getElementById('kit-client').focus();
    return;
  }
  if(n === 3 && state.kitSelected.size === 0){
    Shared.showToast('Selecciona al menos una pantalla para continuar');
    return;
  }

  document.querySelectorAll('[data-step-nav]').forEach(el => el.classList.toggle('active', Number(el.dataset.stepNav) === n));
  // Marcar completados
  document.querySelectorAll('[data-step-nav]').forEach(el => {
    el.classList.toggle('completed', Number(el.dataset.stepNav) < n);
  });
  document.querySelectorAll('[data-step-panel]').forEach(el => el.classList.toggle('active', Number(el.dataset.stepPanel) === n));
}

function selectedDuration(){
  return Shared.DURATIONS.find(d => d.v === document.getElementById('kit-duration').value) || Shared.DURATIONS[0];
}

function kitScreens(){
  return state.rows.filter(row => state.kitSelected.has(row.id) && row.status === SCREEN_STATUS.ACTIVE);
}

function renderKitBuilder(){
  const query = document.getElementById('kit-search')?.value.toLowerCase() || '';
  const zone = document.getElementById('kit-zone').value || 'Todos';
  const visible = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE && (zone === 'Todos' || row.b === zone) && 
    (!query || row.n.toLowerCase().includes(query) || row.dir.toLowerCase().includes(query)));
  document.getElementById('kit-screen-list').innerHTML = visible.map(row => `
    <label class="kit-screen">
      <input type="checkbox" data-kit-screen="${row.id}" ${state.kitSelected.has(row.id)?'checked':''}>
      <span class="screen-icon">${h(row.e)}</span>
      <span><strong>${h(row.n)}</strong><span>${h(row.b)} · ${h(row.imp)} imp/dia · ${fmt(row.precio)}/sem</span></span>
      <span class="badge">${h(row.tipo)}</span>
    </label>
  `).join('');
  renderKitPreview();
}

function renderKitPreview(){
  const duration = selectedDuration();
  const screens = kitScreens();
  const client = document.getElementById('kit-client').value.trim() || 'Cliente sin nombre';
  const { total, impacts, cpm } = calculateKitMetrics(screens, duration);
  const cpmFormatted = screens.length ? fmt(cpm) : '$0';
  const terms = document.getElementById('settings-terms').value.trim();
  
  document.getElementById('kit-selected-count').textContent = `${screens.length} ${screens.length===1?'seleccionada':'seleccionadas'}`;
  document.getElementById('kit-state').textContent = screens.length ? 'Borrador listo' : KIT_STATUS.DRAFT;
  
  const metricsHtml = `
    <div class="kpi"><b>${screens.length}</b><span>Pantallas</span></div>
    <div class="kpi"><b>${Math.round(impacts/1000).toLocaleString('es-AR')}k</b><span>Impactos</span></div>
    <div class="kpi"><b>${fmt(total)}</b><span>Inversión</span></div>
    <div class="kpi"><b>${cpm}</b><span>CPM</span></div>`;
  
  const metricsContainer = document.getElementById('kit-final-metrics');
  if(metricsContainer) metricsContainer.innerHTML = metricsHtml;

  document.getElementById('kit-preview').innerHTML = `
    <div class="kit-doc-hero"><span class="eyebrow" style="color:#bae6fd">Propuesta</span><h2>${h(client)}</h2><p>${h(duration.l)}</p></div>
    <div class="kit-doc-body"><div class="kit-summary">${metricsHtml}</div>
    <div class="kit-list">${screens.map(row=>`<div class="kit-row"><span><strong>${h(row.n)}</strong><br><small>${h(row.b)}</small></span><strong>${fmt(row.precio*duration.mult)}</strong></div>`).join('')}</div>
    ${terms ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--line); font-size:11px; color:var(--muted); line-height:1.4"><strong>Condiciones legales:</strong><br>${h(terms)}</div>` : ''}
    </div>
  `;
}

async function saveKit(){
  const screens = kitScreens();
  if(!screens.length){
    Shared.showToast('Selecciona al menos una pantalla');
    return;
  }

  const duration = selectedDuration();
  const { total, impacts } = calculateKitMetrics(screens, duration);
  const quote = { screens, duration, total, impacts };
  
  const kit = await Shared.buildMediaKit(quote, state.brand, window.CONFIG || {}, KIT_STATUS.DRAFT);
  if (!kit) {
    Shared.showToast('Error al generar el media kit');
    return;
  }

  kit.client = document.getElementById('kit-client').value.trim() || 'Cliente sin nombre';
  kit.contact = document.getElementById('kit-contact').value.trim() || 'Contacto a confirmar';
  kit.archived = false; // Los kits nuevos siempre están activos
  state.savedKits = [kit, ...state.savedKits.filter(k => k.id !== kit.id)];
  setKitStep(1);
  debouncedPersist('Media kit guardado');
}

function renderKitHistory(){
  // --- MEJORA: Separar la lógica de filtrado de la de renderizado.
  const activeKits = state.savedKits.filter(kit => !kit.archived);
  const archivedKits = state.savedKits.filter(kit => kit.archived);

  const renderKitRow = (kit, isArchived = false) => `
    <div class="kit-row">
      <span><strong>${h(kit.client)}</strong><br><small>${Number(kit.screens)||0} pantallas · ${h(isArchived ? KIT_STATUS.ARCHIVED : (kit.status || KIT_STATUS.DRAFT))}</small></span>
      <span class="kit-actions">
        <strong>${fmt(kit.total)}</strong>
        <a class="kit-link" href="${Shared.getMediaKitUrl(kit.id)}" target="_blank" rel="noopener">Ver público</a>
        ${!isArchived ? `
          <button class="icon-btn" type="button" data-action="copy-kit" data-id="${h(kit.id)}">Copiar</button>
          <button class="icon-btn" type="button" data-action="download-kit" data-id="${h(kit.id)}">JSON</button>
          <button class="icon-btn" type="button" data-action="duplicate-kit" data-id="${h(kit.id)}">Duplicar</button>
          <button class="icon-btn pause" type="button" data-action="archive-kit" data-id="${h(kit.id)}">Archivar</button>
        ` : `
          <button class="icon-btn" type="button" data-action="restore-kit" data-id="${h(kit.id)}">Restaurar</button>
        `}
      </span>
    </div>
  `;

  document.getElementById('kit-history').innerHTML = activeKits.map(kit => renderKitRow(kit, false)).join('') || '<div class="kit-row"><span>No hay kits guardados.</span></div>';
  const archiveWrap = document.getElementById('kit-archive-wrap');
  const archiveCount = document.getElementById('kit-archive-count');
  const archive = document.getElementById('kit-archive');
  if(archiveWrap)archiveWrap.hidden = archivedKits.length === 0;
  if(archiveWrap && archivedKits.length)archiveWrap.open = true;
  if(archiveCount)archiveCount.textContent = archivedKits.length;
  if(archive)archive.innerHTML = archivedKits.map(kit => renderKitRow(kit, true)).join('');
}

function renderMetrics(){
  const active = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE);
  const totalReach = active.reduce((acc,row) => acc + imp(row), 0);
  const byZone = active.reduce((acc,row)=>{acc[row.b]=(acc[row.b]||0)+imp(row);return acc;},{});
  const byType = active.reduce((acc,row)=>{acc[row.tipo]=(acc[row.tipo]||0)+1;return acc;},{});
  const colors = [
    'linear-gradient(90deg,#0369a1,#0ea5e9)',
    'linear-gradient(90deg,#0f766e,#2dd4bf)',
    'linear-gradient(90deg,#7c3aed,#a78bfa)',
    'linear-gradient(90deg,#c026d3,#e879f9)',
    'linear-gradient(90deg,#ea580c,#fb923c)',
    'linear-gradient(90deg,#be123c,#fb7185)'
  ];
  const maxZone = Math.max(...Object.values(byZone),1);
  document.getElementById('zone-chart').innerHTML = Object.entries(byZone).sort((a,b)=>b[1]-a[1]).map(([zone,value], i)=>`
    <div class="chart-row">
      <div class="chart-meta"><strong>${zone}</strong><span><b>${value.toLocaleString('es-AR')}</b> <small class="muted">(${((value/totalReach)*100).toFixed(1)}%)</small></span></div>
      <div class="bar"><div class="bar-fill" style="width:${(value/maxZone*100).toFixed(1)}%; background:${colors[i % colors.length]}"></div></div>
    </div>
  `).join('');
  document.getElementById('type-chart').innerHTML = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([type,value], i)=>`
    <div class="chart-row">
      <div class="chart-meta"><strong>${type}</strong><span><b>${value}</b> <small class="muted">(${((value/(active.length||1))*100).toFixed(1)}%)</small></span></div>
      <div class="bar"><div class="bar-fill" style="width:${(value/(active.length||1)*100).toFixed(1)}%; background:${colors[(i+2) % colors.length]}"></div></div>
    </div>
  `).join('');
}

function bindEvents(){
  document.querySelectorAll('[data-section]').forEach(button=>{
    button.addEventListener('click',()=>setSection(button.dataset.section));
  });
  ['search','zone-filter','type-filter'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderTable);
    document.getElementById(id).addEventListener('change', renderTable);
  });
  ['kit-client','kit-contact'].forEach(id=>{
    document.getElementById(id).addEventListener('input', renderKitPreview);
  });
  ['kit-duration','kit-zone'].forEach(id=>{
    document.getElementById(id).addEventListener('change', renderKitBuilder);
  });
  document.getElementById('kit-search').addEventListener('input', renderKitBuilder);
  document.getElementById('settings-terms').addEventListener('input', renderKitPreview);
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if(!target)return;
    if(target.dataset.action === 'select')selectRow(target.dataset.id);
    if(target.dataset.action === 'copy-kit'){
      const kit = state.savedKits.find(item => item.id === target.dataset.id);
      if(kit)navigator.clipboard?.writeText(new URL(Shared.getMediaKitUrl(kit.id), location.href).href).then(()=>Shared.showToast('Link copiado')).catch(()=>Shared.showToast('No se pudo copiar'));
    }
    if(target.dataset.action === 'download-kit'){
      const kit = state.savedKits.find(item => item.id === target.dataset.id);
      if(kit){downloadKitJson(kit);Shared.showToast('JSON descargado');}
    }
    if(target.dataset.action === 'duplicate-kit'){
      const kit = state.savedKits.find(item => item.id === target.dataset.id);
      if(kit){
        const copy = {...kit,id:`${kit.id}-copy-${Date.now()}`,status:KIT_STATUS.DRAFT,createdAt:new Date().toISOString()};
        state.savedKits = [copy,...state.savedKits].slice(0,8);
        renderKitHistory();
        debouncedPersist('Media kit duplicado');
      }
    }
    if(target.dataset.action === 'archive-kit'){
      state.savedKits = state.savedKits.map(item => item.id === target.dataset.id ? {...item, archived:true, archivedAt:new Date().toISOString()} : item);
      renderKitHistory();
      debouncedPersist('Media kit archivado');
    }
    if(target.dataset.action === 'restore-kit'){
      state.savedKits = state.savedKits.map(item => item.id === target.dataset.id ? {...item, archived:false, restoredAt:new Date().toISOString()} : item);
      renderKitHistory();
      debouncedPersist('Media kit restaurado');
    }
  });
  document.addEventListener('change', event => {
    const target = event.target.closest('[data-kit-screen]');
    if(!target)return;
    const id = Number(target.dataset.kitScreen);
    if(target.checked)state.kitSelected.add(id);
    else state.kitSelected.delete(id);
    renderKitPreview();
  });
  document.getElementById('editor-form').addEventListener('submit', event => {
    event.preventDefault();
    const row = state.rows.find(item => item.id === state.selectedId);
    if(!row)return;
    row.n = document.getElementById('edit-name').value.trim() || row.n;
    row.b = document.getElementById('edit-zone').value.trim() || row.b;
    row.aud = document.getElementById('edit-audience').value.trim();
    row.precio = Number(document.getElementById('edit-price').value) || row.precio;
    row.note = document.getElementById('edit-note').value.trim();
    row.status = document.getElementById('edit-status').value;
    document.getElementById('last-action').textContent = `Actualizada #${row.id}`;
    updateKpis();
    fillFilters();
    selectRow(row.id);
    renderKitBuilder();
    debouncedPersist('Cambios aplicados al dashboard');
  });
  document.getElementById('export-btn').addEventListener('click', exportCsv);
  document.getElementById('kit-save-btn').addEventListener('click', saveKit);
  document.getElementById('settings-save').addEventListener('click', () => {
    state.brand.name = document.getElementById('settings-brand').value.trim() || state.brand.name;
    state.brand.logo = document.getElementById('settings-logo').value.trim() || state.brand.logo;
    state.brand.whatsapp = document.getElementById('settings-whatsapp').value.trim() || state.brand.whatsapp;
    state.brand.terms = document.getElementById('settings-terms').value.trim();
    state.brand.validity = document.getElementById('settings-validity').value;
    applyBrand();
    renderKitPreview();
    debouncedPersist('Configuración guardada');
  });
  document.getElementById('reset-data-btn').addEventListener('click', () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los datos locales? Esta acción no se puede deshacer.')) {
      Shared.showToast('Borrando datos locales...');
      Shared.clearAllData().then(() => location.reload());
    }
  });
}

(async () => {
  await loadInitialData();
  applyBrand();
  fillFilters();
  updateKpis();
  bindEvents();
  document.getElementById('settings-brand').value = state.brand.name;
  document.getElementById('settings-logo').value = state.brand.logo;
  document.getElementById('settings-whatsapp').value = state.brand.whatsapp || '';
  if(state.brand.terms) document.getElementById('settings-terms').value = state.brand.terms;
  if(state.brand.validity) document.getElementById('settings-validity').value = state.brand.validity;
  renderKitHistory();
  renderKitBuilder();
  selectRow(state.selectedId);
})();