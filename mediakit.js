document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const h = SmartKitShared.escapeHtml;
  
  const params = new URLSearchParams(location.search);
  const kitId = params.get('id');
  let kit = null;

  if (kitId) {
    try {
      const response = await fetch(`./data/kits/${encodeURIComponent(kitId)}.json`);
      if (response.ok) {
        kit = await response.json();
      } else {
        const dashboardState = window.SmartKitShared.loadDashboardState() || { kits: [] };
        kit = dashboardState.kits?.find(k => k.id === kitId);
      }
    } catch (error) {
      console.error('Error al cargar el media kit:', error);
      const dashboardState = window.SmartKitShared.loadDashboardState() || { kits: [] };
      kit = dashboardState.kits?.find(k => k.id === kitId);
    }
  }

  if (kit) {
    await SmartKitShared.renderMediaKitPage(kit, window.CONFIG || {});
    notifyAdminOfView(kit.id, kit.client);
  } else {
    renderEmptyState(kitId, app);
  }

  /**
   * Llama a un endpoint de la API para notificar que un media kit ha sido visto.
   * Solo se ejecuta una vez por sesión del navegador para evitar spam.
   * @param {string} kitId - El ID del media kit.
   * @param {string} clientName - El nombre del cliente para incluir en la notificación.
   */
  async function notifyAdminOfView(kitId, clientName) {
    const notificationKey = `sk_notified_view_${kitId}`;
    if (sessionStorage.getItem(notificationKey)) {
      console.log('Notificación para este kit ya fue enviada en esta sesión.');
      return;
    }

    try {
      const response = await fetch('/api/notify-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitId, clientName }),
      });
      if (response.ok) {
        sessionStorage.setItem(notificationKey, 'true');
      }
    } catch (error) {
      console.error('Error al intentar notificar la vista del media kit:', error);
    }
  }

  function renderEmptyState(id, container) {
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