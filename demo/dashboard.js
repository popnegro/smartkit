(function() {
  const Shared = window.SmartKitShared;
  const config = window.APP_CONFIG || {};
  const api = window.SmartKitApi;
  const activeIds = new Set(config.inventory?.activeScreenIds || []);
  const brand = {name:'SmartKit',logo:'SK',...(config.brand || {})};
  const theme = config.theme || {};
  const DASHBOARD_STORAGE_KEY = Shared.DASHBOARD_STORAGE_KEY;
  const PUBLIC_KITS_STORAGE_KEY = Shared.PUBLIC_KITS_STORAGE_KEY;
  const fmt = value => '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
  const imp = screen => parseInt(String(screen.imp || '0').replace(/\./g,''),10) || 0;
  const h = Shared.escapeHtml;

  // State Store
  const Store = {
    rows: [],
    selectedId: null,
    currentSection: 'inventory',
    kitSelected: new Set(),
    savedKits: [],
    selectedBulkIds: new Set(),
    hasUnsavedChanges: false,
    currentSort: { key: 'n', order: 'asc' }
  };

  window.addEventListener('smartkit:notify', e => showToast(e.detail.message, e.detail.type));

  function renderTableSkeleton() {
    const tbody = document.getElementById('screen-table');
    tbody.innerHTML = Array(5).fill(0).map(() => `
      <tr>
        <td><div class="skeleton" style="width:18px;height:18px"></div></td>
        <td><div class="skeleton" style="width:150px;height:20px"></div></td>
        <td><div class="skeleton" style="width:70px;height:20px"></div></td>
        <td><div class="skeleton" style="width:50px;height:20px"></div></td>
        <td><div class="skeleton" style="width:80px;height:20px"></div></td>
        <td><div class="skeleton" style="width:60px;height:20px"></div></td>
        <td><div class="skeleton" style="width:100px;height:30px"></div></td>
      </tr>
    `).join('');
  }

  async function loadDashboard(){
    renderTableSkeleton();
    let state = {};
    try{state = JSON.parse(localStorage.getItem(DASHBOARD_STORAGE_KEY) || '{}') || {};}
    catch{state = {};}
    if(state.brand) Object.assign(brand, state.brand);
    
    try {
      const remoteScreens = await api.screens();
      Store.rows = remoteScreens.length ? remoteScreens : SCREENS.map(s => ({...s, status: activeIds.has(s.id) ? 'Activo' : 'Pausado'}));
    } catch (err) {
      Store.rows = SCREENS.map(s => ({...s, status: activeIds.has(s.id) ? 'Activo' : 'Pausado'}));
    }

    if(Array.isArray(state.rows)){
      const storedById = new Map(state.rows.map(row => [row.id,row]));
      Store.rows = Store.rows.map(row => ({...row,...(storedById.get(row.id) || {})}));
    }
    if(Array.isArray(state.savedKits)) Store.savedKits = state.savedKits;
    Store.selectedId = Store.rows.find(row => row.id === Store.selectedId)?.id || Store.rows[0]?.id;
    Store.kitSelected = new Set(Store.rows.filter(row => row.status === 'Activo').slice(0,3).map(row => row.id));

    setTimeout(() => {
      applyBrand();
      fillFilters();
      updateKpis();
      renderKitHistory();
      renderKitBuilder();
      selectRow(Store.selectedId);
    }, 400);
    setUnsavedChanges(false);
  }

  async function persistState(message='Cambios guardados localmente'){
    const saveBtn = document.getElementById('save-btn');
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';
      await api.saveScreens(Store.rows);
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({brand, rows: Store.rows, savedKits: Store.savedKits}));
      showToast(message);
      setUnsavedChanges(false);
    } catch (err) {
      showToast('Error al sincronizar con el servidor', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar cambios';
    }
    document.getElementById('last-sync-time').textContent = `Sincronizado: ${new Date().toLocaleTimeString()}`;
  }

  function setUnsavedChanges(hasChanges) {
    Store.hasUnsavedChanges = hasChanges;
    document.getElementById('save-btn').disabled = !hasChanges;
    document.getElementById('unsaved-changes-indicator').hidden = !hasChanges;
  }

  function updateKpis(){
    const active = Store.rows.filter(row => row.status === 'Activo');
    const totalImpacts = active.reduce((acc,row) => acc + imp(row), 0);
    const revenue = active.reduce((acc,row) => acc + row.precio, 0);
    const avgCpm = active.length ? active.reduce((acc,row) => acc + ((row.precio / (imp(row) * 7)) * 1000), 0) / active.length : 0;
    document.getElementById('kpi-published').textContent = `${active.length} / ${Store.rows.length}`;
    document.getElementById('kpi-active').textContent = active.length;
    document.getElementById('kpi-reach').textContent = totalImpacts.toLocaleString('es-AR');
    document.getElementById('kpi-revenue').textContent = fmt(revenue);
    document.getElementById('kpi-cpm').textContent = fmt(avgCpm);
  }

  function fillFilters(){
    const zones = ['Todos', ...new Set(Store.rows.map(row => row.b))];
    document.getElementById('zone-filter').innerHTML = zones.map(zone => `<option value="${h(zone)}">${h(zone)}</option>`).join('');
    document.getElementById('kit-zone').innerHTML = zones.map(zone => `<option value="${h(zone)}">${h(zone)}</option>`).join('');
  }

  function filteredRows(){
    const query = document.getElementById('search').value.trim().toLowerCase();
    const zone = document.getElementById('zone-filter').value;
    const type = document.getElementById('type-filter').value;
    const status = document.getElementById('status-filter').value;
    const maxPrice = Number(document.getElementById('price-range').value);

    return Store.rows.filter(row => {
      const matchesQuery = !query || [row.n,row.dir,row.b,row.tipo].some(value => String(value).toLowerCase().includes(query));
      const matchesZone = zone === 'Todos' || row.b === zone;
      const matchesType = type === 'Todos' || row.tipo === type;
      const matchesStatus = status === 'Todos' || row.status === status;
      return matchesQuery && matchesZone && matchesType && matchesStatus && row.precio <= maxPrice;
    }).sort((a, b) => {
      let valA = currentSort.key === 'imp' ? imp(a) : a[Store.currentSort.key];
      let valB = currentSort.key === 'imp' ? imp(b) : b[Store.currentSort.key];
      return Store.currentSort.order === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });
  }

  function renderTable(){
    const list = filteredRows();
    const tbody = document.getElementById('screen-table');
    const bulkBar = document.getElementById('bulk-actions');
    bulkBar.hidden = Store.selectedBulkIds.size === 0;
    document.getElementById('bulk-count').textContent = Store.selectedBulkIds.size;
    document.getElementById('result-count').textContent = `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}`;
    
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-table-state">No se encontraron resultados.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(row => `
      <tr class="${row.id === Store.selectedId ? 'selected' : ''}">
        <td><input type="checkbox" class="screen-select-checkbox" data-id="${row.id}" ${Store.selectedBulkIds.has(row.id) ? 'checked' : ''}></td>
        <td>
          <div class="screen-cell">
            <span class="screen-icon">${h(row.e)}</span>
            <div><strong>${h(row.n)}</strong><span>${h(row.dir)} · ${h(row.b)}</span></div>
          </div>
        </td>
        <td><span class="badge">${h(row.tipo)}</span></td>
        <td>${h(row.imp)}</td>
        <td><strong>${fmt(row.precio)}</strong></td>
        <td><span class="badge" style="background:${Shared.STATUS_THEMES[row.status]?.bg}; color:${Shared.STATUS_THEMES[row.status]?.text}">${row.status}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" type="button" data-action="select" data-id="${row.id}">Editar</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function selectRow(id){
    Store.selectedId = Number(id);
    const row = Store.rows.find(item => item.id === Store.selectedId);
    if(!row) return;
    document.getElementById('editor-title').textContent = row.n;
    document.getElementById('edit-name').value = row.n;
    document.getElementById('edit-zone').value = row.b;
    document.getElementById('edit-price').value = row.precio;
    document.getElementById('edit-status').value = row.status;
    renderTable();
  }

  function showToast(message, type = 'success'){
    const toast = document.getElementById('toast');
    toast.className = 'toast show ' + type;
    toast.textContent = message;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  function applyBrand(){
    document.title = `${brand.name} - Dashboard`;
    Shared.applyBrandHeader(brand);
    if(theme.primary) document.documentElement.style.setProperty('--primary', theme.primary);
  }

  function bindEvents(){
    document.querySelectorAll('[data-section]').forEach(button=>{
      button.addEventListener('click',() => {
        Store.currentSection = button.dataset.section;
        document.querySelectorAll('.section').forEach(p => p.hidden = p.id !== `section-${Store.currentSection}`);
        document.querySelectorAll('[data-section]').forEach(b => b.classList.toggle('active', b.dataset.section === Store.currentSection));
        if(Store.currentSection === 'metrics') renderMetrics();
      });
    });

    document.getElementById('editor-form').addEventListener('submit', event => {
      event.preventDefault();
      const row = Store.rows.find(item => item.id === Store.selectedId);
      if(!row || !event.target.checkValidity()) return;

      row.n = document.getElementById('edit-name').value.trim();
      row.b = document.getElementById('edit-zone').value.trim();
      row.precio = Number(document.getElementById('edit-price').value);
      row.status = document.getElementById('edit-status').value;
      
      updateKpis();
      selectRow(row.id);
      setUnsavedChanges(true);
      Shared.notify('Cambios aplicados localmente');
    });

    document.getElementById('save-btn').addEventListener('click', () => persistState());
    
    document.addEventListener('click', e => {
      const target = e.target.closest('[data-action]');
      if(!target) return;
      if(target.dataset.action === 'select') selectRow(target.dataset.id);
    });
  }

  // Init logic...
  bindEvents();
  loadDashboard();

  // Auto-save logic
  setInterval(() => {
    if (Store.hasUnsavedChanges) persistState('Auto-guardado completado');
  }, 60000);
})();