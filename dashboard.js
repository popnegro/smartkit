const DashboardApp = (() => {
  const Shared = window.SmartKitShared;
  const { formatMoney: fmt, impNum: imp, escapeHtml: h } = Shared;
  const AUTH_TOKEN_KEY = 'sk_auth_token';

  const SECTIONS = { INVENTORY: 'inventory', MEDIAKITS: 'mediakits', METRICS: 'metrics', SETTINGS: 'settings' };
  const KIT_STATUS = { DRAFT: 'Borrador', ARCHIVED: 'Archivado' };
  const SCREEN_STATUS = { ACTIVE: 'Activo', PAUSED: 'Pausado' };

  const state = {
    rows: [],
    selectedId: null,
    currentSection: 'inventory',
    kitSelected: new Set(),
    bulkSelected: new Set(),
    filters: {
      zone: 'Todas',
      status: 'Todos'
    },
    savedKits: [],
    brand: { name: 'SmartKit', logo: 'SK', terms: '', validity: '15 dias', whatsapp: '' }
  };

  // Modificado: debouncedPersist ahora solo guarda datos específicos del cliente (kits, marca).
  // El inventario (state.rows) se gestiona exclusivamente a través de la API.
  const debouncedPersist = Shared.debounce((message) => {
    const persistableState = { kits: state.savedKits, brand: state.brand };
    Shared.persistDashboardState(persistableState, message || 'Cambios guardados automáticamente');
  }, 1500);

  // Esta función debería ser tu única vía para actualizar el inventario.

  /**
   * Un fetch wrapper que añade el token de autenticación y maneja errores 401.
   */
  async function authedFetch(url, options = {}) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      // Token inválido o expirado
      logout();
      throw new Error('Sesión expirada. Por favor, ingresa de nuevo.');
    }

    return response;
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    location.reload();
  }

  async function loadInitialData() {
    try {
      console.log('SmartKit Dashboard: Cargando desde /screens.json...');
      const response = await fetch('/screens.json');
      if (!response.ok) throw new Error('No se pudo cargar el inventario.');
      
      const data = await response.json();
      state.rows = data.map(row => ({ ...row, status: row.active ? SCREEN_STATUS.ACTIVE : SCREEN_STATUS.PAUSED }));
      document.getElementById('data-status').textContent = 'Datos locales';
      Shared.showToast('Inventario cargado');
    } catch (error) {
      console.error('Error fatal al cargar el inventario:', error);
      document.getElementById('data-status').textContent = 'Error de carga';
      state.rows = [];
    }
    if (state.rows.length > 0) {
      state.selectedId = state.rows[0].id;
    } else {
      state.selectedId = null;
    }
  }

  function calculateKitMetrics(screens, duration) {
    const total = screens.reduce((sum, row) => sum + row.precio * duration.mult, 0);
    const impacts = screens.reduce((sum, row) => sum + imp(row) * duration.days, 0);
    const cpm = impacts ? Math.round(total / impacts * 1000) : 0;
    return { total, impacts, cpm };
  }

  function downloadKitJson(kit) {
    const blob = new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${kit.id}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function applyBrand() {
    document.title = `${state.brand.name} - Dashboard de Gestion`;
    document.getElementById('dash-logo').textContent = state.brand.logo;
    document.getElementById('dash-brand').textContent = state.brand.name;
  }

  function updateKpis() {
    const active = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE);
    const totalImpacts = active.reduce((acc, row) => acc + imp(row), 0);
    const revenue = active.reduce((acc, row) => acc + row.precio, 0);
    const avgCpm = active.length
      ? active.reduce((acc, row) => acc + ((row.precio / (imp(row) * 7)) * 1000), 0) / active.length
      : 0;
    document.getElementById('kpi-published').textContent = `${active.length} / ${state.rows.length}`;
    document.getElementById('kpi-active').textContent = active.length;
    document.getElementById('kpi-reach').textContent = totalImpacts.toLocaleString('es-AR');
    document.getElementById('kpi-revenue').textContent = fmt(revenue);
    document.getElementById('kpi-cpm').textContent = fmt(avgCpm);
  }

  function fillFilters() {
    const zones = ['Todas', ...new Set(state.rows.map(row => row.b))];
    const statuses = ['Todos', 'Activo', 'Pausado'];
    
    const zoneChips = zones.map(zone => `<button class="chip" data-filter="zone" data-value="${h(zone)}">${h(zone)}</button>`).join('');
    const statusChips = statuses.map(status => `<button class="chip" data-filter="status" data-value="${h(status)}">${h(status)}</button>`).join('');

    document.getElementById('zone-filter-chips').innerHTML = `<span class="filter-label">Zona:</span> ${zoneChips}`;
    document.getElementById('status-filter-chips').innerHTML = `<span class="filter-label">Estado:</span> ${statusChips}`;

    updateFilterChips();

    // Refactorizado: Usar chips para la duración en el constructor de kits
    document.getElementById('kit-duration-chips').innerHTML = `<span class="filter-label">Duración:</span>` + Shared.DURATIONS.map(d => 
      `<button class="chip" data-filter="kit-duration" data-value="${d.v}">${h(d.l)}</button>`
    ).join('');
  }

  function updateFilterChips() {
    document.querySelectorAll('[data-filter]').forEach(chip => {
      const filterType = chip.dataset.filter;
      const value = chip.dataset.value;
      const isActive = state.filters[filterType] === value;
      chip.classList.toggle('on', isActive);
    });
    const hasFilters = state.filters.zone !== 'Todas' || state.filters.status !== 'Todos';
    document.getElementById('btn-clear-filters').style.display = hasFilters ? 'flex' : 'none';
  }

  function clearFilters() {
    state.filters.zone = 'Todas';
    state.filters.status = 'Todos';
    renderTable();
    updateFilterChips();
  }

  function filteredRows() {
    const query = document.getElementById('search').value.trim().toLowerCase();
    const zone = state.filters.zone;
    const status = state.filters.status;

    return state.rows.filter(row => {
      const matchesQuery = !query || [row.n, row.dir, row.b, row.tipo].some(v => String(v).toLowerCase().includes(query));
      const matchesZone = zone === 'Todos' || row.b === zone;
      const matchesStatus = status === 'Todos' || row.status === status;
      return matchesQuery && matchesZone && matchesStatus;
    });
  }

  function renderTable() {
    const list = filteredRows();
    // Corregido: Si el ID seleccionado no está en la lista filtrada, seleccionar el primero de la lista.
    if (list.length && !list.some(row => row.id === state.selectedId)) {
      selectRow(list[0].id, false); // Evitar bucle de renderizado
    }
    document.getElementById('result-count').textContent = `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}`;
    document.getElementById('screen-tbody').innerHTML = list.map(row => `
      <tr class="${row.id === state.selectedId ? 'selected' : ''} ${state.bulkSelected.has(row.id) ? 'bulk-selected' : ''}" data-row-id="${row.id}">
        <td><input type="checkbox" data-action="bulk-select" data-id="${row.id}"></td><td><div class="screen-cell"><span class="screen-icon">${h(row.e)}</span><div><strong>${h(row.n)}</strong><span>${h(row.dir)} · ${h(row.b)}</span></div></div></td>
        <td><span class="badge">${h(row.tipo)}</span></td>
        <td>${h(row.imp)}</td>
        <td><strong>${fmt(row.precio)}</strong></td>
        <td><span class="badge ${row.status === SCREEN_STATUS.ACTIVE ? 'active' : 'paused'}">${row.status}</span></td>
        <td>
          <div class="row-acts"><button class="icon-btn" data-action="select" data-id="${row.id}" title="Editar">✏️</button></div>
        </td>
      </tr>`).join('');
  }

  function renderPreview(row) {
    const video = row.video ? `<video src="${Shared.safeAssetUrl(row.video)}" autoplay muted loop playsinline></video>` : '';
    document.getElementById('preview').innerHTML = `
      <div class="preview-media" style="background:${Shared.safeBackground(row.g)}">${h(row.e)}${video}</div>
      <div class="preview-body">
        <h3>${h(row.n)}</h3>
        <p>${h(row.dir)} · ${h(row.b)}</p>
        <div class="metrics-grid">
          <div class="metric"><span>Formato</span><b>${h(row.dim)}</b></div>
          <div class="metric"><span>Resolucion</span><b>${h(row.res)}</b></div>
          <div class="metric"><span>Audiencia</span><b>${h(row.aud || 'N/D')}</b></div>
          <div class="metric"><span>Impactos/dia</span><b>${h(row.imp)}</b></div>
          <div class="metric"><span>CPM</span><b>${fmt((row.precio / (imp(row) * 7)) * 1000)}</b></div>
        </div>
      </div>`;
  }

  function updateEditor(row) {
    document.getElementById('editor-form').reset();
    if (!row) return;
    document.getElementById('editor-form').style.display = 'grid';
    document.getElementById('editor-empty').style.display = 'none';
    document.getElementById('editor-title').textContent = row.n;
    document.getElementById('edit-name').value = row.n;
    document.getElementById('edit-zone').value = row.b;
    document.getElementById('edit-price').value = row.precio;
    document.getElementById('edit-audience').value = row.aud || '';
    document.getElementById('edit-video').value = row.video || '';
    document.getElementById('edit-note').value = row.note || '';
    document.getElementById('edit-status').value = row.status || SCREEN_STATUS.ACTIVE;
    renderPreview(row);
  }

  function showNewScreenForm() {
    state.selectedId = null; // Deseleccionar cualquier fila
    renderTable();
    document.getElementById('editor-form').reset();
    document.getElementById('editor-form').style.display = 'grid';
    document.getElementById('editor-empty').style.display = 'none';
    document.getElementById('ed-title').textContent = 'Nueva Pantalla';
  }

  function selectRow(id, doRenderTable = true) {
    const numericId = Number(id);
    const row = state.rows.find(item => item.id === numericId);
    if (!row) return;

    state.selectedId = numericId;
    updateEditor(row);
    if (doRenderTable) renderTable();
  }

  function exportCsv() {
    const header = ['id', 'nombre', 'zona', 'direccion', 'tipo', 'impactos_dia', 'precio_semana', 'estado'];
    const lines = state.rows.map(row => [row.id, row.n, row.b, row.dir, row.tipo, row.imp, row.precio, row.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'smartkit-inventario.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    Shared.showToast('CSV exportado');
  }

  function setSection(section) {
    state.currentSection = section;
    document.querySelectorAll('[data-section]').forEach(btn => btn.classList.toggle('active', btn.dataset.section === section));
    document.querySelectorAll('.section').forEach(panel => panel.hidden = panel.id !== `section-${section}`);
    const titles = {
      [SECTIONS.INVENTORY]: ['Gestion de pantallas', 'Administra inventario, disponibilidad, precios y vista comercial.'],
      [SECTIONS.MEDIAKITS]: ['Constructor de Media Kits', 'Crea, previsualiza y mantiene propuestas comerciales.'],
      [SECTIONS.METRICS]: ['Metricas comerciales', 'Analiza cobertura, mix de transito y potencial de venta por zona.'],
      [SECTIONS.SETTINGS]: ['Configuracion comercial', 'Define marca, contacto y condiciones base para tus mediakits.']
    };
    const [title, description] = titles[section] || ['Error', 'Sección no encontrada'];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-desc').textContent = description;
    if (section === SECTIONS.MEDIAKITS) renderKitBuilder();
    if (section === SECTIONS.METRICS) renderMetrics();
  }

  function validateKitStep(targetStep) {
    if (targetStep > 1 && !document.getElementById('kit-client').value.trim()) {
      Shared.showToast('Por favor, indica el nombre del cliente');
      document.getElementById('kit-client').focus();
      return false;
    }
    if (targetStep === 3 && state.kitSelected.size === 0) {
      Shared.showToast('Selecciona al menos una pantalla para continuar');
      return false;
    }
    return true;
  }

  function setKitStep(n) {
    document.querySelectorAll('[data-step-nav]').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.stepNav) === n);
      el.classList.toggle('completed', Number(el.dataset.stepNav) < n);
    });
    document.querySelectorAll('[data-step-panel]').forEach(el => el.classList.toggle('active', Number(el.dataset.stepPanel) === n));
  }

  function getSelectedDuration() {
    return Shared.DURATIONS.find(d => d.v === document.getElementById('kit-duration').value) || Shared.DURATIONS;
  }

  function getKitScreens() {
    return state.rows.filter(row => state.kitSelected.has(row.id) && row.status === SCREEN_STATUS.ACTIVE);
  }

  function renderKitBuilder() {
    const query = document.getElementById('kit-search')?.value.toLowerCase() || '';
    const zone = document.getElementById('kit-zone').value || 'Todos';
    const visible = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE && (zone === 'Todos' || row.b === zone) &&
      (!query || row.n.toLowerCase().includes(query) || row.dir.toLowerCase().includes(query)));
    document.getElementById('kit-screen-list').innerHTML = visible.map(row => `
      <label class="kit-screen">
        <input type="checkbox" data-kit-screen="${row.id}" ${state.kitSelected.has(row.id) ? 'checked' : ''}>
        <span class="screen-icon">${h(row.e)}</span>
        <span><strong>${h(row.n)}</strong><span>${h(row.b)} · ${h(row.imp)} imp/dia · ${fmt(row.precio)}/sem</span></span>
        <span class="badge">${h(row.tipo)}</span>
      </label>`).join('');
    renderKitPreview();
  }

  function renderKitPreview() {
    const duration = getSelectedDuration();
    const screens = getKitScreens();
    const client = document.getElementById('kit-client').value.trim() || 'Cliente sin nombre';
    const { total, impacts, cpm } = calculateKitMetrics(screens, duration);
    const terms = document.getElementById('settings-terms').value.trim();

    document.getElementById('kit-selected-count').textContent = `${screens.length} ${screens.length === 1 ? 'seleccionada' : 'seleccionadas'}`;
    document.getElementById('kit-state').textContent = screens.length ? 'Borrador listo' : KIT_STATUS.DRAFT;

    const metricsHtml = `
      <div class="kpi"><b>${screens.length}</b><span>Pantallas</span></div>
      <div class="kpi"><b>${Math.round(impacts / 1000).toLocaleString('es-AR')}k</b><span>Impactos</span></div>
      <div class="kpi"><b>${fmt(total)}</b><span>Inversión</span></div>
      <div class="kpi"><b>${fmt(cpm)}</b><span>CPM</span></div>`;

    document.getElementById('kit-final-metrics').innerHTML = metricsHtml;
    document.getElementById('kit-preview').innerHTML = `
      <div class="kit-doc-hero"><span class="eyebrow" style="color:#bae6fd">Propuesta</span><h2>${h(client)}</h2><p>${h(duration.l)}</p></div>
      <div class="kit-doc-body"><div class="kit-summary">${metricsHtml}</div>
      <div class="kit-list">${screens.map(row => `<div class="kit-row"><span><strong>${h(row.n)}</strong><br><small>${h(row.b)}</small></span><strong>${fmt(row.precio * duration.mult)}</strong></div>`).join('')}</div>
      ${terms ? `<div class="kit-terms"><strong>Condiciones:</strong><br>${h(terms)}</div>` : ''}
      </div>`;
  }

  async function saveKit() {
    const screens = getKitScreens();
    if (!screens.length) {
      Shared.showToast('Selecciona al menos una pantalla');
      return;
    }
    const duration = getSelectedDuration();
    const { total, impacts } = calculateKitMetrics(screens, duration);
    const quote = { screens, duration, total, impacts };
    const kit = await Shared.buildMediaKit(quote, state.brand, window.CONFIG || {}, KIT_STATUS.DRAFT);

    if (!kit) {
      Shared.showToast('Error al generar el media kit');
      return;
    }

    kit.client = document.getElementById('kit-client').value.trim() || 'Cliente sin nombre';
    kit.contact = document.getElementById('kit-contact').value.trim() || 'Contacto a confirmar';
    kit.archived = false;
    state.savedKits = [kit, ...state.savedKits.filter(k => k.id !== kit.id)];
    setKitStep(1);
    debouncedPersist('Media kit guardado');
  }

  /**
   * Carga un media kit existente en el constructor para su edición.
   * @param {string} kitId El ID del kit a editar.
   */
  function editKit(kitId) {
    const kit = state.savedKits.find(k => k.id === kitId);
    if (!kit) {
      Shared.showToast('No se encontró el media kit para editar.');
      return;
    }

    setSection(SECTIONS.MEDIAKITS);
    document.getElementById('kit-client').value = kit.client || '';
    document.getElementById('kit-contact').value = kit.contact || '';
    document.getElementById('kit-duration').value = kit.durationValue || '1s';
    state.kitSelected = new Set(kit.screenIds || []);
    renderKitBuilder();
    setKitStep(2); // Llevar al usuario directamente a la selección de pantallas
  }

  function renderKitHistory() {
    const activeKits = state.savedKits.filter(kit => !kit.archived);
    const archivedKits = state.savedKits.filter(kit => kit.archived);

    const renderKitRow = (kit, isArchived = false) => `
      <div class="kit-row">
        <span><strong>${h(kit.client)}</strong><br><small>${Number(kit.screens) || 0} pantallas · ${h(isArchived ? KIT_STATUS.ARCHIVED : (kit.status || KIT_STATUS.DRAFT))}</small></span>
        <span class="kit-actions">
          <strong>${fmt(kit.total)}</strong>
          <a class="kit-link" href="${Shared.getMediaKitUrl(kit.id)}" target="_blank" rel="noopener">Ver público</a>
          ${!isArchived ? `
          <button class="icon-btn" type="button" data-action="edit-kit" data-id="${h(kit.id)}">Editar</button>
            <button class="icon-btn" type="button" data-action="copy-kit" data-id="${h(kit.id)}">Copiar</button>
            <button class="icon-btn" type="button" data-action="download-kit" data-id="${h(kit.id)}">JSON</button>
            <button class="icon-btn" type="button" data-action="duplicate-kit" data-id="${h(kit.id)}">Duplicar</button>
            <button class="icon-btn pause" type="button" data-action="archive-kit" data-id="${h(kit.id)}">Archivar</button>
          ` : `<button class="icon-btn" type="button" data-action="restore-kit" data-id="${h(kit.id)}">Restaurar</button>`}
        </span>
      </div>`;

    document.getElementById('kit-history').innerHTML = activeKits.map(k => renderKitRow(k, false)).join('') || '<div class="kit-row"><span>No hay kits guardados.</span></div>';
    const archiveWrap = document.getElementById('kit-archive-wrap');
    archiveWrap.hidden = archivedKits.length === 0;
    archiveWrap.open = archivedKits.length > 0;
    document.getElementById('kit-archive-count').textContent = archivedKits.length;
    document.getElementById('kit-archive').innerHTML = archivedKits.map(k => renderKitRow(k, true)).join('');
    const active = state.rows.filter(row => row.status === SCREEN_STATUS.ACTIVE);
    const totalReach = active.reduce((acc, row) => acc + imp(row), 0);
    const byZone = active.reduce((acc, row) => { acc[row.b] = (acc[row.b] || 0) + imp(row); return acc; }, {});
    const byType = active.reduce((acc, row) => { acc[row.tipo] = (acc[row.tipo] || 0) + 1; return acc; }, {});
    const colors = ['#0ea5e9', '#2dd4bf', '#a78bfa', '#e879f9', '#fb923c', '#fb7185'];

    const renderChart = (containerId, data, total, useGradient = false) => {
      const max = Math.max(...Object.values(data), 1);
      document.getElementById(containerId).innerHTML = Object.entries(data).sort((a, b) => b - a).map(([label, value], i) => {
        const width = (value / max * 100).toFixed(1);
        const percentage = ((value / (total || 1)) * 100).toFixed(1);
        const bg = useGradient ? `linear-gradient(90deg, ${colors[i % colors.length]}90, ${colors[i % colors.length]})` : colors[i % colors.length];
        return `
          <div class="chart-row">
            <div class="chart-meta"><strong>${label}</strong><span><b>${value.toLocaleString('es-AR')}</b> <small class="muted">(${percentage}%)</small></span></div>
            <div class="bar"><div class="bar-fill" style="width:${width}%; background:${bg}"></div></div>
          </div>`;
      }).join('');
    };

    renderChart('zone-chart', byZone, totalReach, true);
    renderChart('type-chart', byType, active.length);
  }

  function bindEvents() {
    document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', () => setSection(btn.dataset.section)));

    document.getElementById('sb-toggle').addEventListener('click', () => {
      document.getElementById('app').classList.toggle('nav-collapsed');
    });

    document.getElementById('btn-new-screen').addEventListener('click', showNewScreenForm);

    document.addEventListener('click', (event) => {
      const filterChip = event.target.closest('[data-filter]');
      if (filterChip) {
        state.filters[filterChip.dataset.filter] = filterChip.dataset.value;
        renderTable();
        updateFilterChips();
      }
      const row = event.target.closest('[data-row-id]');
      if (row && !event.target.matches('input[type="checkbox"]')) {
        selectRow(row.dataset.rowId);
      }
    });

    document.getElementById('btn-clear-filters').addEventListener('click', clearFilters);


    ['search', 'zone-filter', 'type-filter'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderTable);
    });

    ['kit-client', 'kit-contact', 'settings-terms'].forEach(id => {
      document.getElementById(id).addEventListener('input', renderKitPreview);
    });

    ['kit-duration', 'kit-zone'].forEach(id => {
      document.getElementById(id).addEventListener('change', renderKitBuilder);
    });
    document.getElementById('kit-search').addEventListener('input', renderKitBuilder);

    document.addEventListener('click', event => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      const step = target.dataset.step;

      const actions = {
        'copy-kit': () => { const kit = state.savedKits.find(k => k.id === id); if (kit) navigator.clipboard?.writeText(new URL(Shared.getMediaKitUrl(kit.id), location.href).href).then(() => Shared.showToast('Link copiado')).catch(() => Shared.showToast('No se pudo copiar')); },
        'download-kit': () => {
          const kit = state.savedKits.find(k => k.id === id);
          if (kit) { downloadKitJson(kit); Shared.showToast('JSON descargado'); }
        },
        'duplicate-kit': () => {
          const kit = state.savedKits.find(k => k.id === id);
          if (kit) {
            const copy = { ...kit, id: `kit-copy-${Date.now()}`, status: KIT_STATUS.DRAFT, createdAt: new Date().toISOString() };
            state.savedKits = [copy, ...state.savedKits];
            renderKitHistory();
            debouncedPersist('Media kit duplicado');
          }
        },
        'archive-kit': () => {
          state.savedKits = state.savedKits.map(k => k.id === id ? { ...k, archived: true, archivedAt: new Date().toISOString() } : k);
          renderKitHistory();
          debouncedPersist('Media kit archivado');
        },
        'restore-kit': () => {
          state.savedKits = state.savedKits.map(k => k.id === id ? { ...k, archived: false, restoredAt: new Date().toISOString() } : k);
          renderKitHistory();
          debouncedPersist('Media kit restaurado');
        },
        'edit-kit': () => editKit(id)
      };
      if (action === 'set-kit-step') setKitStep(Number(step));
      if (actions[action]) actionsaction;
    });

    document.addEventListener('change', event => {
      const target = event.target.closest('[data-kit-screen]');
      if (!target) return;
      const id = Number(target.dataset.kitScreen);
      if (target.checked) state.kitSelected.add(id);
      else state.kitSelected.delete(id);
      renderKitPreview();
    });

    document.getElementById('editor-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const isNew = state.selectedId === null;
      const row = isNew ? {} : state.rows.find(item => item.id === state.selectedId);
      if (!isNew && !row) return;

      const submitButton = event.target.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Guardando...';

      const updatedRowData = {
        ...row,
        n: document.getElementById('edit-name').value.trim() || row.n,
        b: document.getElementById('edit-zone').value.trim() || row.b,
        aud: document.getElementById('edit-audience').value.trim(),
        precio: Number(document.getElementById('edit-price').value) || row.precio,
        note: document.getElementById('edit-note').value.trim(),
        status: document.getElementById('edit-status').value,
        id: isNew ? Date.now() : row.id, // Asigna un nuevo ID si es nuevo
        e: (document.getElementById('edit-name').value.trim() || 'NN').substring(0, 2).toUpperCase()
      };

      if (isNew) {
        state.rows.unshift(updatedRowData);
      } else {
        Object.assign(row, updatedRowData);
      }

      await updateScreenAPI(updatedRowData);

      submitButton.disabled = false;
      submitButton.textContent = 'Guardado ✓';
      setTimeout(() => {
        submitButton.textContent = 'Guardar Pantalla';
      }, 2000);

      document.getElementById('last-action').textContent = isNew ? `Creada #${updatedRowData.id}` : `Actualizada #${updatedRowData.id}`;
      updateKpis();
      fillFilters();
      selectRow(updatedRowData.id);
      renderKitBuilder();
    });

    document.getElementById('export-btn').addEventListener('click', exportCsv);
    document.getElementById('btn-save-kit').addEventListener('click', saveKit);

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
      if (window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
        Shared.clearAllData();
      }
    });
  }
  
  function bindStepperEvents() {
    document.getElementById('btn-to-step-2').addEventListener('click', () => {
      if (validateKitStep(2)) setKitStep(2);
    });
    document.getElementById('btn-to-step-3').addEventListener('click', () => {
      if (validateKitStep(3)) setKitStep(3);
    });
  }

  async function init() {
    // --- Login Eliminado ---
    // Se asume una sesión iniciada. Se crea un token simulado si no existe
    // para asegurar que las llamadas a la API (authedFetch) funcionen.
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      console.warn('Login omitido: Creando token de sesión simulado.');
      const fakeToken = `dev-token.${btoa(JSON.stringify({ userId: 'dev-user', role: 'admin' }))}.dev-signature`;
      localStorage.setItem(AUTH_TOKEN_KEY, fakeToken);
    }

    document.getElementById('app').style.display = 'grid';
    document.body.style.visibility = 'visible';
    await loadInitialData();
    applyBrand();
    fillFilters();
    updateKpis();
    bindEvents();
    bindStepperEvents();

    document.getElementById('settings-brand').value = state.brand.name;
    document.getElementById('settings-logo').value = state.brand.logo;
    document.getElementById('settings-whatsapp').value = state.brand.whatsapp || '';
    document.getElementById('settings-terms').value = state.brand.terms || '';
    document.getElementById('settings-validity').value = state.brand.validity || '15 dias';

    renderKitHistory();
    renderKitBuilder();
    selectRow(state.selectedId);
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', DashboardApp.init);