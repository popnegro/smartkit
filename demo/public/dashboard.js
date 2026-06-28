/* ═══════════════════════════════════════════
   DASHBOARD APP
══════════════════════════════════════════════ */
(function(){
'use strict';


// ── API ──
const API_URL = ''; // En Vercel, la API está en el mismo dominio

// ── State ──
let screens=[];       // merged screens (base + overrides)
let filtered=[];      // current filter result
let selected=new Set(); // selected screen IDs
let currentEdit=null; // screen being edited
let cfg={};
let sortKey='nombre', sortDir=1;
let kitSelected=new Set(); // IDs selected for current kit
let currentSection='inventory';
let clients = [];

// ── Helpers ──
const $=id=>document.getElementById(id);
const fmt=n=>'$'+Math.round(n).toLocaleString('es-AR');
const fmtImp=n=>n>=1000?(n/1000).toFixed(1)+'k':String(n);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const badgeClass={Peatonal:'bd-p',Vehicular:'bd-v',Mixto:'bd-m'};

let toastTimer;
function toast(msg,type=''){
  const t=$('toast'); t.textContent=msg; t.className='toast show'+(type?' '+type:'');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2400);
}

// ── Boot ──
function boot(){
  loadCfg();
  loadScreens();
  setupSidebar();
  setupNav();
  setupFilters();
  setupTable();
  setupBulk();
  setupSettings();
  setupClients();
  setupCreation();
  setupKitActions();
  switchSection('inventory');
}

// ── Sidebar ──
function setupSidebar(){
  $('sb-toggle')?.addEventListener('click',()=>$('app').classList.toggle('nav-collapsed'));
  $('mobile-menu-btn')?.addEventListener('click',()=>$('app').classList.toggle('mobile-nav-open'));
  $('sidebar-container')?.addEventListener('click',(e)=>{if(e.target===$('sidebar-container')) $('app').classList.remove('mobile-nav-open')});
}

// ── Config ──
function loadCfg(){
  fetch(`${API_URL}/api/config`)
    .then(res => res.json())
    .then(data => {
      cfg = data;
      applyBrand();
      loadSettingsForm();
    }).catch(err => {
      console.error("Error al cargar configuración:", err);
      toast('No se pudo cargar la configuración del servidor.', 'err');
    });
}

function applyBrand(){
  const el=id=>document.getElementById(id);
  ['dash-logo'].forEach(id=>{const e=el(id);if(e)e.textContent=cfg.logo;});
  ['dash-brand'].forEach(id=>{const e=el(id);if(e)e.textContent=cfg.brand;});
}

function loadSettingsForm(){
  const v=(id,val)=>{const e=$(id);if(e)e.value=val??'';};
  v('cfg-brand',cfg.brand); v('cfg-logo',cfg.logo); v('cfg-wa',cfg.whatsapp);
  v('cfg-terms',cfg.terms); v('cfg-hero',cfg.heroTitle);
  const sel=$('cfg-validity'); if(sel) sel.value=cfg.validityDays||15;
}

function setupSettings(){
  $('btn-cfg-save')?.addEventListener('click',()=>{
    const newConfig = {
      brand: $('cfg-brand')?.value || 'SmartKit',
      logo: $('cfg-logo')?.value || 'SK',
      whatsapp: $('cfg-wa')?.value || '',
      terms: $('cfg-terms')?.value || '',
      heroTitle: $('cfg-hero')?.value || '',
      validityDays: parseInt($('cfg-validity')?.value) || 15,
    };

    fetch(`${API_URL}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    }).then(() => {
      cfg = { ...cfg, ...newConfig }; // Actualizar estado local
      applyBrand();
      toast('Configuración guardada en el servidor', 'ok');
    }).catch(err => toast('Error al guardar la configuración', 'err'));
  });
}

// ── Screen Creation ──
function setupCreation() {
  $('btn-new-screen')?.addEventListener('click', openEditorForNew);
}

function openEditorForNew() {
  currentEdit = null; // No estamos editando una pantalla existente
  $('ed-title').textContent = 'Nueva Pantalla';
  $('editor-body').innerHTML = `
    <div class="preview"><div class="preview-hero" id="prev-hero">?</div></div>
    <div style="display:grid;gap:10px">
      <div class="field"><label>Nombre comercial</label><input id="ed-name" value=""></div>
      <div class="field"><label>Zona</label><input id="ed-zone" value=""></div>
      <div class="field"><label>Tipo</label><select id="ed-type"><option>Peatonal</option><option>Vehicular</option><option>Mixto</option></select></div>
      <div class="field"><label>Impactos diarios</label><input id="ed-impacts" type="number" min="0" value="10000"></div>
      <div class="field"><label>Precio semanal (ARS)</label><input id="ed-price" type="number" min="1" value="50000"></div>
      <div class="field"><label>Estado</label><select id="ed-status"><option>Activo</option><option>Pausado</option></select></div>
      <div class="field"><label>Video del hero (path o URL)</label><input id="ed-video" value=""></div>
      <div class="field"><label>Nota interna</label><textarea id="ed-note"></textarea></div>
      <button class="btn ok" id="btn-create-new">Crear Pantalla</button>
    </div>
    <div class="status-line"><span>Pantalla ID</span><strong>Se generará automáticamente</strong></div>`;

  $('btn-create-new')?.addEventListener('click', createNewScreen);
}

function createNewScreen() {
  const newScreenData = {
    nombre: $('ed-name')?.value || 'Nueva Pantalla',
    zona: $('ed-zone')?.value || 'Sin Zona',
    tipo: $('ed-type')?.value || 'Mixto',
    impactos: parseInt($('ed-impacts')?.value) || 0,
    precio: parseFloat($('ed-price')?.value) || 0,
    status: $('ed-status')?.value || 'Activo',
    video: $('ed-video')?.value || '',
    nota: $('ed-note')?.value || '',
  };

  fetch(`${API_URL}/api/screens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newScreenData) })
    .then(res => res.ok ? res.json() : Promise.reject('Error del servidor'))
    .then(createdScreen => {
      toast(`Pantalla "${createdScreen.nombre}" creada`, 'ok');
      screens.push(createdScreen); // Añadir a la lista local
      applyFilters(); // Refrescar la tabla
      openEditor(createdScreen.id); // Abrir para seguir editando
    }).catch(err => toast('Error al guardar la configuración', 'err'));
}

// ── Screens ──
function loadScreens(){
  const savedScreens = localStorage.getItem('sk_screens');
  if (savedScreens) {
    console.log('Cargando pantallas desde localStorage...');
    screens = JSON.parse(savedScreens);
    initializeUI();
  } else {
    console.log('Cargando pantallas desde API por primera vez...');
    fetch(`${API_URL}/api/screens/all`)
      .then(res => res.json())
      .then(data => {
        screens = data;
        saveScreensToLocal(); // Guardar en localStorage la primera vez
        initializeUI();
      })
      .catch(err => {
        console.error("Error al cargar pantallas:", err);
        toast('Error al conectar con el servidor', 'err');
        $('screen-tbody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--danger)">No se pudo conectar al servidor.</td></tr>`;
      });
  }
}

function initializeUI() {
  filtered = [...screens];
  buildZoneFilter();
  buildKitZoneFilter();
  renderTable();
  renderKPIs();
  renderMetrics();
  renderKitScreenList();
  renderKitHistory();
}

function saveScreensToLocal() {
  try {
    localStorage.setItem('sk_screens', JSON.stringify(screens));
    console.log('Pantallas guardadas en localStorage.');
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
    toast('No se pudieron guardar los cambios en el navegador.', 'err');
  }
}

function resetAndReload() {
  if (confirm('¿Restaurar los datos de fábrica? Se perderán todos los cambios locales.')) {
    localStorage.removeItem('sk_screens');
    window.location.reload();
  }
}

function setupSave(){
  $('btn-save').textContent = 'Restaurar Fábrica';
  $('btn-save').addEventListener('click', resetAndReload);
  $('btn-export').style.display = 'none'; // Ocultamos exportar ya que es local
  $('unsaved').style.display = 'none'; // Ya no es necesario
}

function setupNav(){
  document.querySelectorAll('[data-sec]').forEach(btn=>{
    btn.addEventListener('click',()=>switchSection(btn.dataset.sec));
  });
}

function switchSection(sec){
  currentSection=sec;
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('on',b.dataset.sec===sec));
  const el=$('sec-'+sec); if(el) el.classList.add('on');
  const titles={inventory:'Gestión de pantallas',mediakits:'Media Kits',clients:'Clientes',metrics:'Métricas',settings:'Configuración'};
  const descs={inventory:'Inventario, disponibilidad y precios desde una sola superficie.',
    mediakits:'Creá y gestioná propuestas comerciales para clientes.',
    clients:'Gestioná tu base de clientes y su historial.',
    metrics:'Reach diario, distribución por zona y tipo de tránsito.',
    settings:'Marca, condiciones y configuración global.'};
  $('page-title').textContent=titles[sec]||'';
  $('page-desc').textContent=descs[sec]||'';
  $('btn-save').style.display = sec === 'inventory' ? '' : 'none';
  // Auto-close mobile nav on selection
  $('app').classList.remove('mobile-nav-open');
}

// ── Filters ──
function buildZoneFilter(){
  const sel=$('f-zone'); if(!sel) return;
  const zones=['Todos',...new Set(screens.map(s=>s.zona))];
  sel.innerHTML=zones.map(z=>`<option>${z}</option>`).join('');
}

function buildKitZoneFilter(){
  ['kit-zone'].forEach(id=>{
    const sel=$(id); if(!sel) return;
    const zones=['Todas',...new Set(screens.map(s=>s.zona))];
    sel.innerHTML=zones.map(z=>`<option>${z}</option>`).join('');
  });
}

function setupFilters(){
  ['f-search','f-zone','f-type','f-status'].forEach(id=>{
    $(id)?.addEventListener('input',applyFilters);
    $(id)?.addEventListener('change',applyFilters);
  });
}

function applyFilters(){
  const q=($('f-search')?.value||'').toLowerCase();
  const zone=$('f-zone')?.value||'Todos';
  const tipo=$('f-type')?.value||'Todos';
  const st=$('f-status')?.value||'Todos';
  filtered=screens.filter(s=>{
    if(q&&!((s.nombre||'').toLowerCase().includes(q)||(s.zona||'').toLowerCase().includes(q))) return false;
    if(zone!=='Todos'&&s.zona!==zone) return false;
    if(tipo!=='Todos'&&s.tipo!==tipo) return false;
    if(st!=='Todos'&&s.status!==st) return false;
    return true;
  });
  renderTable();
}

// ── Table ──
function setupTable(){
  document.querySelectorAll('th.sort').forEach(th=>{
    th.addEventListener('click',()=>{
      if(sortKey===th.dataset.k) sortDir*=-1; else {sortKey=th.dataset.k;sortDir=1;}
      document.querySelectorAll('th.sort').forEach(t=>t.classList.remove('sort-on'));
      th.classList.add('sort-on');
      renderTable();
    });
  });
  $('sel-all')?.addEventListener('change',e=>{
    if(e.target.checked) filtered.forEach(s=>selected.add(s.id));
    else selected.clear();
    renderTable();
    updateBulk();
  });
}

function renderTable(){
  const tbody=$('screen-tbody'); if(!tbody) return;
  const sorted=[...filtered].sort((a,b)=>{
    const av=a[sortKey]??'', bv=b[sortKey]??'';
    return typeof av==='number'?(av-bv)*sortDir:String(av).localeCompare(String(bv))*sortDir;
  });
  const rc=$('result-count'); if(rc) rc.textContent=`${sorted.length} resultado${sorted.length!==1?'s':''}`;

  tbody.innerHTML=sorted.map(s=>{
    const isSel=selected.has(s.id);
    const ini=esc((s.nombre||'').substring(0,2).toUpperCase());
    const iconCls={Vehicular:'v',Mixto:'m'}[s.tipo]||'';
    return `<tr class="${isSel?'sel':''}" data-id="${esc(s.id)}">
      <td><input type="checkbox" class="row-cb" data-id="${esc(s.id)}" ${isSel?'checked':''}></td>
      <td>
        <div class="sc-cell">
          <div class="sc-icon ${iconCls}">${ini}</div>
          <div><div class="sc-name">${esc(s.nombre)}</div><div class="sc-zone">${esc(s.zona)}</div></div>
        </div>
      </td>
      <td><span class="badge ${badgeClass[s.tipo]||''}">${esc(s.tipo)}</span></td>
      <td>${fmtImp(s.impactos)}</td>
      <td><span class="price-tag">${fmt(s.precio)}</span></td>
      <td><span class="badge ${s.status==='Activo'?'bd-ok':'bd-mu'}">${esc(s.status)}</span></td>
      <td>
        <div class="row-acts">
          <button class="icon-btn" data-action="edit" data-id="${esc(s.id)}" title="Editar">✏️</button>
          <button class="icon-btn ${s.status==='Activo'?'paus':'pub'}" data-action="toggle-status" data-id="${esc(s.id)}" title="${s.status==='Activo'?'Pausar':'Publicar'}">
            ${s.status==='Activo'?'⏸':'▶️'}
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Row events
  tbody.querySelectorAll('.row-cb').forEach(cb=>{
    cb.addEventListener('change',e=>{
      e.target.checked?selected.add(e.target.dataset.id):selected.delete(e.target.dataset.id);
      const row=e.target.closest('tr'); if(row) row.classList.toggle('sel',e.target.checked);
      updateBulk();
    });
  });
  tbody.querySelectorAll('[data-action="edit"]').forEach(btn=>{
    btn.addEventListener('click',()=>openEditor(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="toggle-status"]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const s=screens.find(x=>x.id===btn.dataset.id); if(!s) return;
      s.status=s.status==='Activo'?'Pausado':'Activo';
      saveScreensToLocal();
      renderTable(); renderKPIs(); toast(`${s.nombre}: ${s.status}`, 'ok');
    });
  });
}

// ── Editor ──
function openEditor(id){
  const s=screens.find(x=>x.id===id); if(!s) return;
  const editorPanel = $('editor-panel');
  // On mobile, wrap the editor in a panel div
  if (window.innerWidth <= 800 && !editorPanel.querySelector('.panel')) {
    const panel = document.createElement('aside');
    panel.className = 'panel';
    while (editorPanel.firstChild) { panel.appendChild(editorPanel.firstChild); }
    editorPanel.appendChild(panel);
  }
  currentEdit=id;
  $('ed-title').textContent=s.nombre;
  $('editor-body').innerHTML=`
    <div class="preview">
      <div class="preview-hero" id="prev-hero">${s.video?`<video src="${esc(s.video)}" autoplay muted loop playsinline></video>`:esc((s.nombre||'').substring(0,2).toUpperCase())}</div>
      <div class="preview-body">
        <h3>${esc(s.nombre)}</h3>
        <p>${esc(s.zona)} · <span class="badge ${badgeClass[s.tipo]||''}">${esc(s.tipo)}</span></p>
        <div class="metrics-mini">
          <div class="metric-mini"><span>Impactos/día</span><b>${fmtImp(s.impactos)}</b></div>
          <div class="metric-mini"><span>Precio/sem</span><b>${fmt(s.precio)}</b></div>
        </div>
      </div>
    </div>
    <div style="display:grid;gap:10px">
      <div class="field"><label>Nombre comercial</label><input id="ed-name" value="${esc(s.nombre)}"></div>
      <div class="field"><label>Zona</label><input id="ed-zone" value="${esc(s.zona)}"></div>
      <div class="field"><label>Tipo</label>
        <select id="ed-type">
          <option ${s.tipo==='Peatonal'?'selected':''}>Peatonal</option>
          <option ${s.tipo==='Vehicular'?'selected':''}>Vehicular</option>
          <option ${s.tipo==='Mixto'?'selected':''}>Mixto</option>
        </select>
      </div>
      <div class="field"><label>Impactos diarios</label><input id="ed-impacts" type="number" min="0" value="${s.impactos}"></div>
      <div class="field"><label>Precio semanal (ARS)</label><input id="ed-price" type="number" min="1" value="${s.precio}"></div>
      <div class="field"><label>Estado</label>
        <select id="ed-status"><option ${s.status==='Activo'?'selected':''}>Activo</option><option ${s.status==='Pausado'?'selected':''}>Pausado</option></select>
      </div>
      <div class="field"><label>URL del video/imagen</label><input id="ed-video" type="text" value="${esc(s.video||'')}" placeholder="https://ejemplo.com/video.mp4"></div>
      <div class="field"><label>Nota interna</label><textarea id="ed-note">${esc(s.nota||'')}</textarea></div>
      <button class="btn ok" id="btn-apply">Aplicar cambios</button>
    </div>
    <div class="status-line"><span>Pantalla ID</span><strong>${esc(s.id)}</strong></div>`;

  $('btn-apply')?.addEventListener('click',()=>applyEdit(id));
  
  // Mobile-specific logic
  if (window.innerWidth <= 800) {
    editorPanel.classList.add('open');
    editorPanel.addEventListener('click', closeEditorOnOverlayClick);
    editorPanel.querySelector('.panel-head')?.addEventListener('click', closeEditorOnOverlayClick);
  }
}

function closeEditorOnOverlayClick(e) {
  const editorPanel = $('editor-panel');
  if (e.target === editorPanel || e.target.classList.contains('panel-head')) {
    editorPanel.classList.remove('open');
    editorPanel.removeEventListener('click', closeEditorOnOverlayClick);
  }
}

function applyEdit(id){
  const s=screens.find(x=>x.id===id); if(!s) return;
  s.nombre=$('ed-name')?.value||s.nombre;
  s.zona=$('ed-zone')?.value||s.zona;
  s.tipo=$('ed-type')?.value||s.tipo;
  s.impactos=parseInt($('ed-impacts')?.value)||s.impactos;
  s.precio=parseFloat($('ed-price')?.value)||s.precio;
  s.status=$('ed-status')?.value||s.status;
  s.video=$('ed-video')?.value||'';
  s.nota=$('ed-note')?.value||'';
  saveScreensToLocal();
  renderTable(); renderKPIs(); renderMetrics();
  toast(`${s.nombre} actualizada localmente`, 'ok');
  $('ed-title').textContent=s.nombre;
}

// ── Clients ──
function setupClients() {
  loadClients();
  $('btn-cli-save')?.addEventListener('click', createClient);
}

function loadClients() {
  fetch(`${API_URL}/api/clients`)
    .then(res => res.json())
    .then(data => {
      clients = data;
      renderClientsTable();
      populateClientDropdown();
    })
    .catch(err => console.error('Error al cargar clientes:', err));
}

function renderClientsTable() {
  const tbody = $('clients-tbody');
  if (!tbody) return;
  tbody.innerHTML = clients.map(c => `
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.contact)}</td>
      <td>${esc(c.email)}</td>
      <td>${esc(c.phone)}</td>
      <td><button class="btn sm">Ver</button></td>
    </tr>
  `).join('');
}

function createClient() {
  const clientData = {
    name: $('cli-name')?.value,
    contact: $('cli-contact')?.value,
    email: $('cli-email')?.value,
    phone: $('cli-phone')?.value,
  };
  if (!clientData.name) {
    toast('El nombre del cliente es requerido', 'err');
    return;
  }
  fetch(`${API_URL}/api/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientData) })
    .then(res => res.json())
    .then(() => {
      toast('Cliente creado con éxito', 'ok');
      loadClients(); // Recargar la lista
      // Limpiar formulario
      ['cli-name', 'cli-contact', 'cli-email', 'cli-phone'].forEach(id => $(id).value = '');
    })
    .catch(err => toast('Error al crear cliente', 'err'));
}

// ── Bulk ──
function setupBulk(){
  document.querySelectorAll('[data-bulk]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const st=btn.dataset.bulk;
      selected.forEach(id=>{const s=screens.find(x=>x.id===id); if(s){s.status=st;}});
      saveScreensToLocal();
      selected.clear(); updateBulk(); renderTable(); renderKPIs();
      toast(`${st==='Activo'?'Publicadas':'Pausadas'} las pantallas seleccionadas`);
    });
  });
  $('bulk-clear')?.addEventListener('click',()=>{selected.clear();updateBulk();renderTable();});
}

function updateBulk(){
  const bar=$('bulk-bar'), cnt=$('bulk-count');
  if(bar) bar.classList.toggle('show',selected.size>0);
  if(cnt) cnt.textContent=selected.size;
  const sa=$('sel-all'); if(sa) sa.checked=filtered.length>0&&filtered.every(s=>selected.has(s.id));
}

// ── KPIs ──
function renderKPIs(){
  const el=$('kpis-row'); if(!el) return;
  const total=screens.length;
  const active=screens.filter(s=>s.status==='Activo').length;
  const reach=screens.filter(s=>s.status==='Activo').reduce((a,s)=>a+(s.impactos||0),0);
  const rev=screens.filter(s=>s.status==='Activo').reduce((a,s)=>a+(s.precio||0),0);
  const cpms=screens.filter(s=>s.status==='Activo'&&s.impactos>0).map(s=>((s.precio||0)/(s.impactos/1000)*1000/7));
  const cpm=cpms.length?cpms.reduce((a,b)=>a+b,0)/cpms.length:0;
  el.innerHTML=`
    <div class="kpi highlight"><b>${active} / ${total}</b><span>Activas / inventario</span></div>
    <div class="kpi"><b>${active}</b><span>Pantallas activas</span></div>
    <div class="kpi"><b>${fmtImp(reach)}</b><span>Impactos diarios</span></div>
    <div class="kpi"><b>${fmt(rev)}</b><span>Potencial semanal</span></div>
    <div class="kpi"><b>${fmt(Math.round(cpm))}</b><span>CPM promedio</span></div>`;
}

// ── Metrics ──
function renderMetrics(){
  // By zone
  const byZone={};
  screens.filter(s=>s.status==='Activo').forEach(s=>{
    byZone[s.zona]=(byZone[s.zona]||0)+s.impactos;
  });
  const maxZ=Math.max(...Object.values(byZone),1);
  $('chart-zones').innerHTML=Object.entries(byZone).sort((a,b)=>b[1]-a[1]).map(([z,v])=>`
    <div class="chart-row">
      <div class="chart-meta"><span>${esc(z)}</span><span>${fmtImp(v)} imp/día</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(v/maxZ*100).toFixed(1)}%"></div></div>
    </div>`).join('');

  // By type
  const byType={};
  screens.filter(s=>s.status==='Activo').forEach(s=>{
    byType[s.tipo]=(byType[s.tipo]||0)+s.impactos;
  });
  const maxT=Math.max(...Object.values(byType),1);
  $('chart-types').innerHTML=Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`
    <div class="chart-row">
      <div class="chart-meta"><span>${esc(t)}</span><span>${fmtImp(v)} imp/día</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(v/maxT*100).toFixed(1)}%"></div></div>
    </div>`).join('');
}

// ── Media Kit Builder ──
function renderKitScreenList(){
  const el=$('kit-screen-list'); if(!el) return;
  const zone=$('kit-zone')?.value||'Todas';
  const visible=screens.filter(s=>s.status==='Activo'&&(zone==='Todas'||s.zona===zone));
  el.innerHTML=visible.map(s=>`
    <div class="kit-row">
      <input type="checkbox" class="kit-cb" data-id="${esc(s.id)}" ${kitSelected.has(s.id)?'checked':''}>
      <div>
        <strong style="font-size:13px">${esc(s.nombre)}</strong>
        <div style="color:var(--mu);font-size:11px">${esc(s.zona)} · ${esc(s.tipo)} · ${fmtImp(s.impactos)} imp/día</div>
      </div>
      <span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--pdk)">${fmt(s.precio)}/sem</span>
    </div>`).join('');
  el.querySelectorAll('.kit-cb').forEach(cb=>{
    cb.addEventListener('change',e=>{
      e.target.checked?kitSelected.add(e.target.dataset.id):kitSelected.delete(e.target.dataset.id);
      updateKitPreview();
    });
  });
  updateKitPreview();
}

function setupKitActions(){
  $('kit-zone')?.addEventListener('change',()=>renderKitScreenList());
  
  // Inputs que solo actualizan el preview
  ['kit-contact','kit-dur','kit-validity','kit-notes'].forEach(id=>{
    $(id)?.addEventListener('input',updateKitPreview);
    $(id)?.addEventListener('change',updateKitPreview);
  });

  // El selector de cliente tiene lógica adicional
  $('kit-client-select')?.addEventListener('change', (e) => {
    const selectedClient = clients.find(c => c.id === e.target.value);
    $('kit-contact').value = selectedClient ? selectedClient.contact || '' : '';
    updateKitPreview(); // Actualizar el preview después de cambiar el contacto
  });

  $('btn-save-kit')?.addEventListener('click',saveKit);
  $('btn-dl-kit-pdf')?.addEventListener('click', downloadKitAsPDF);
}

function updateKitPreview(){
  const cnt=$('kit-sel-count'); if(cnt) cnt.textContent=`${kitSelected.size} seleccionada${kitSelected.size!==1?'s':''}`;
  const badge=$('kit-draft-badge'); if(badge) badge.textContent=kitSelected.size?'Listo':'Borrador';
  const el=$('kit-preview'); if(!el) return;
  const clientSelect = $('kit-client-select');
  const clientName = clientSelect.value ? clientSelect.options[clientSelect.selectedIndex].text : 'Público';
  const contact=$('kit-contact')?.value||'';
  const weeks=parseInt($('kit-dur')?.value)||4;
  const validity=parseInt($('kit-validity')?.value)||15;
  const notes=$('kit-notes')?.value||'';
  const items=screens.filter(s=>kitSelected.has(s.id));
  const totalInv=items.reduce((a,s)=>a+s.precio*weeks,0);
  const totalImp=items.reduce((a,s)=>a+s.impactos,0)*weeks*7;
  const now=new Date();
  const validUntil=new Date(now.getTime()+validity*86400000);
  const weekLabel={1:'1 semana',2:'2 semanas',4:'4 semanas',8:'8 semanas',12:'12 semanas'}[weeks]||`${weeks} semanas`;

  el.innerHTML=`
    <div class="kit-doc-hero">
      <h3>${esc(cfg.brand||'SmartKit')} · Propuesta Comercial</h3>
      <div style="font-size:12px;opacity:.8">Para: ${esc(clientName)}${contact?` (${esc(contact)})`:''} · ${now.toLocaleDateString('es-AR')}</div>
      <div style="font-size:11px;opacity:.7;margin-top:3px">Duración: ${weekLabel} · Válida hasta ${validUntil.toLocaleDateString('es-AR')}</div>
    </div>
    <div class="kit-doc-body">
      <div class="kit-kpis">
        <div class="kit-kpi"><b>${items.length}</b><span>Pantallas</span></div>
        <div class="kit-kpi"><b>${fmtImp(totalImp)}</b><span>Impactos totales</span></div>
        <div class="kit-kpi"><b>${fmt(totalInv)}</b><span>Inversión total</span></div>
      </div>
      ${items.length?`<div>${items.map(s=>`
        <div class="kit-sc-row">
          <div><strong>${esc(s.nombre)}</strong><br><span style="color:var(--mu);font-size:11px">${esc(s.zona)} · ${fmtImp(s.impactos)} imp/día</span></div>
          <strong>${fmt(s.precio*weeks)}</strong>
        </div>`).join('')}</div>`:'<p style="color:var(--mu);font-size:12px;text-align:center;padding:16px 0">Seleccioná pantallas para armar la propuesta.</p>'}
      ${notes?`<div class="kit-terms">${esc(notes)}</div>`:''}
      <div class="kit-terms">${esc(cfg.terms||'')}</div>
    </div>`;
}

function renderKitHistory(){
  const el=$('kit-history'); if(!el) return;
  fetch(`${API_URL}/api/kits`)
    .then(res => res.json())
    .then(all => {
      const kits=Object.values(all).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
      if(!kits.length){
        el.innerHTML='<p style="color:var(--mu);font-size:12px;padding:4px">Sin propuestas guardadas todavía.</p>';
        return;
      }
      el.innerHTML=kits.map(k=>`
    <div class="kit-hist-row ${k.archived?'arch':''}">
      <div>
        <strong style="font-size:13px">${esc(k.clientName||'Sin cliente')}</strong>
        <div style="color:var(--mu);font-size:11px">${new Date(k.createdAt).toLocaleDateString('es-AR')} · ${k.weekLabel||''} · ${fmt(k.totals?.investment||0)}</div>
      </div>
      <div style="display:flex;gap:5px">
        <button class="btn sm" data-action="load-kit" data-id="${esc(k.id)}">Ver</button>
        <button class="btn sm" data-action="dl-kit" data-id="${esc(k.id)}">↓</button>
        <button class="btn sm" data-action="arch-kit" data-id="${esc(k.id)}">${k.archived?'Restaurar':'Archivar'}</button>
        <button class="btn sm danger" data-action="del-kit" data-id="${esc(k.id)}">✕</button>
      </div>
    </div>`).join('');
      el.querySelectorAll('[data-action="load-kit"]').forEach(btn=>btn.addEventListener('click',()=>loadKitIntoBuilder(btn.dataset.id)));
      el.querySelectorAll('[data-action="dl-kit"]').forEach(btn=>btn.addEventListener('click',()=>downloadKit(btn.dataset.id)));
      el.querySelectorAll('[data-action="arch-kit"]').forEach(btn=>btn.addEventListener('click',()=>archiveKit(btn.dataset.id)));
      el.querySelectorAll('[data-action="del-kit"]').forEach(btn=>btn.addEventListener('click',()=>deleteKit(btn.dataset.id)));
    })
    .catch(err => {
      console.error("Error al cargar historial de kits:", err);
      el.innerHTML = '<p style="color:var(--danger);font-size:12px;padding:4px">Error al cargar historial.</p>';
    });
}


function saveKit(){
  const items=screens.filter(s=>kitSelected.has(s.id));
  if(!items.length){toast('Seleccioná al menos una pantalla','err');return;}
  const clientSelect = $('kit-client-select');
  const clientId = clientSelect.value;
  const clientName = clientId ? clientSelect.options[clientSelect.selectedIndex].text : 'Público';

  const contact=$('kit-contact')?.value||'';
  const weeks=parseInt($('kit-dur')?.value)||4;
  const validity=parseInt($('kit-validity')?.value)||15;
  const notes=$('kit-notes')?.value||'';
  const weekLabel={1:'1 semana',2:'2 semanas',4:'4 semanas',8:'8 semanas',12:'12 semanas'}[weeks]||`${weeks} semanas`;
  const now=new Date();
  const totalInv=items.reduce((a,s)=>a+s.precio*weeks,0);
  const totalImp=items.reduce((a,s)=>a+s.impactos,0);
  const kitData={clientName, clientId, contact, createdAt:now.toISOString(),
    validUntil:new Date(now.getTime()+validity*86400000).toISOString(),
    brand:cfg.brand||'SmartKit',weeks,weekLabel,notes,
    screens:items.map(s=>({...s,precioCampana:s.precio*weeks})),
    totals:{screens:items.length,impactsPerDay:totalImp,impactsTotal:totalImp*weeks*7,investment:totalInv},
    terms:cfg.terms||''};

  fetch(`${API_URL}/api/kits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(kitData)
  }).then(res => res.json()).then(() => {
    renderKitHistory();
    toast(`Propuesta archivada para ${clientName}`, 'ok');
  }).catch(err => toast('Error al guardar la propuesta', 'err'));
}

function populateClientDropdown() {
  const select = $('kit-client-select');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Sin cliente --</option>' + clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  select.value = currentVal;
}

function loadKitIntoBuilder(id){
  fetch(`${API_URL}/api/kits/${id}`)
    .then(res => res.ok ? res.json() : Promise.reject('Kit no encontrado'))
    .then(kit => {
    kitSelected=new Set((kit.screens||[]).map(s=>s.id));
    if($('kit-client-select')) $('kit-client-select').value=kit.clientId||'';
    if($('kit-contact')) $('kit-contact').value=kit.contact||'';
    if($('kit-dur')) $('kit-dur').value=kit.weeks||4;
    if($('kit-notes')) $('kit-notes').value=kit.notes||'';
    renderKitScreenList(); toast('Propuesta cargada en el constructor');
  }).catch(err => toast('No se pudo cargar el kit', 'err'));
}

function downloadKit(id){
  fetch(`${API_URL}/api/kits/${id}`)
    .then(res => res.ok ? res.json() : Promise.reject('Kit no encontrado'))
    .then(kit => {
    const a=document.createElement('a');
    a.href='data:application/json,'+encodeURIComponent(JSON.stringify(kit,null,2));
    a.download=id+'.json'; a.click();
  }).catch(err => toast('No se pudo descargar el kit', 'err'));
}

function archiveKit(id){
  // Primero obtenemos el estado actual para saber a qué cambiarlo
  fetch(`${API_URL}/api/kits/${id}`).then(r => r.json()).then(kit => {
    const newArchivedState = !kit.archived; // Calculamos el nuevo estado
    fetch(`${API_URL}/api/kits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: newArchivedState })
    }).then(()=>{
      renderKitHistory();
      toast(newArchivedState ? 'Propuesta archivada' : 'Propuesta restaurada');
    });
  }).catch(err => toast('No se pudo archivar el kit', 'err'));
}

function deleteKit(id){
  if(!confirm('¿Eliminar esta propuesta? Esta acción no se puede deshacer.')) return;

  fetch(`${API_URL}/api/kits/${id}`, {
    method: 'DELETE',
  })
  .then(res => {
    if (res.ok) {
      toast('Propuesta eliminada permanentemente', 'ok');
      renderKitHistory(); // Recargar la lista desde el servidor
    } else {
      toast('Error al eliminar la propuesta', 'err');
    }
  })
  .catch(err => toast('Error de conexión al eliminar', 'err'));
}

function downloadKitAsPDF() {
  const element = $('kit-preview');
  if (!element || kitSelected.size === 0) {
    toast('No hay pantallas seleccionadas para generar el PDF.', 'err');
    return;
  }

  const clientSelect = $('kit-client-select');
  const clientName = clientSelect.value ? clientSelect.options[clientSelect.selectedIndex].text : 'Propuesta';
  const date = new Date().toISOString().split('T')[0];
  const filename = `MediaKit-${clientName.replace(/ /g, '_')}-${date}.pdf`;

  const opt = {
    margin:       [0.5, 0.5, 0.5, 0.5], // pulgadas [top, left, bottom, right]
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().from(element).set(opt).save();
}
// ── Init ──
document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',boot)
  :boot();

})();