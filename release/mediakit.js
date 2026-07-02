document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;
  
  const params = new URLSearchParams(location.search);
  const kitId = params.get('id');
  let kit = null;

  if (kitId) {
    try {
      const response = await fetch(`./data/kits/${encodeURIComponent(kitId)}.json`);
      if (response.ok) {
        kit = await response.json();
      } else {
        // Fallback 1: Check the main dashboard state
        const dashboardState = JSON.parse(localStorage.getItem(SmartKitShared.DASHBOARD_STORAGE_KEY) || '{}');
        kit = dashboardState.kits?.find(k => k.id === kitId);
        // Fallback 2: Check the public kits from the brochure session
        if (!kit) {
          const localKits = SmartKitShared.storedPublicKits();
          kit = localKits.find(k => k.id === kitId);
        }
      }
    } catch (error) {
      console.error('Error al cargar el media kit:', error);
      // Fallback on error: check both local sources
      const dashboardState = JSON.parse(localStorage.getItem(SmartKitShared.DASHBOARD_STORAGE_KEY) || '{}');
      kit = dashboardState.kits?.find(k => k.id === kitId) || SmartKitShared.storedPublicKits().find(k => k.id === kitId);
    }
  }

  if (kit) {
    SmartKitShared.renderMediaKitPage(kit, window.CONFIG || {});
  } else {
    renderEmptyState(kitId, app);
  }

  function renderEmptyState(id, container) {
    const h = SmartKitShared.escapeHtml;
    SmartKitShared.applyBrandHeader();
    document.title += ' - Propuesta no encontrada';
    app.innerHTML = `
      <div class="mk-empty">
        <h1>Propuesta no encontrada</h1>
        <p>No se pudo encontrar el media kit con el ID "${h(id || 'ninguno')}".</p>
        <p class="muted">Si el enlace es correcto, es posible que la propuesta haya sido archivada o eliminada. Por favor, contacta a tu ejecutivo comercial.</p>
        <div style="margin-top: 24px;"><a href="./index.html" class="btn primary">Volver al cotizador</a></div>
      </div>
    `;
  }
});