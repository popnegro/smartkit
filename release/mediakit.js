document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const h = SmartKitShared.escapeHtml;
  const fmt = SmartKitShared.formatMoney;
  const params = new URLSearchParams(location.search);
  const kitId = params.get('id');

  let kit = null;

  if (kitId) {
    try {
      // 1. Intentar cargar desde un archivo JSON público
      const response = await fetch(`./data/kits/${encodeURIComponent(kitId)}.json`);
      if (response.ok) {
        kit = await response.json();
      } else {
        // 2. Fallback a localStorage si el archivo no existe
        const localKits = SmartKitShared.storedPublicKits();
        kit = localKits.find(k => k.id === kitId);
      }
    } catch (error) {
      console.error('Error al cargar el media kit:', error);
      const localKits = SmartKitShared.storedPublicKits();
      kit = localKits.find(k => k.id === kitId);
    }
  }

  if (kit) {
    renderMediaKit(kit);
  } else {
    renderEmptyState(kitId);
  }

  async function renderMediaKit(k) {
    const brand = { ...SmartKitShared.DEFAULT_BRAND, ...(k.brand || {}) };
    SmartKitShared.applyBrandHeader(brand);
    document.title = `${brand.name} - Media Kit: ${k.client}`;

    const signature = await SmartKitShared.verifyMediaKitSignature(k, {
      signer: CONFIG.signature?.signer || brand.name,
      secret: CONFIG.signature?.secret || ''
    });

    const whatsappMsg = `Hola, quiero consultar por la propuesta para ${k.client} con ID ${k.id}.`;
    const whatsappUrl = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(whatsappMsg)}`;

    app.innerHTML = `
      <header class="mk-hero">
        <div>
          <span class="eyebrow">Propuesta para</span>
          <h1>${h(k.client)}</h1>
          <p>Campaña de ${h(k.duration.toLowerCase())}, válida hasta el ${h(new Date(k.validUntil).toLocaleDateString())}.</p>
        </div>
        <div class="mk-summary">
          <div class="mk-kpi"><b>${k.screens}</b><span>Pantallas</span></div>
          <div class="mk-kpi"><b>${Math.round(k.impacts / 1000)}k</b><span>Impactos</span></div>
          <div class="mk-kpi"><b>${fmt(k.total)}</b><span>Inversión</span></div>
          <div class="mk-kpi"><b>${fmt(k.cpm)}</b><span>CPM</span></div>
        </div>
      </header>

      <section class="mk-section">
        <div class="mk-section-head">
          <h2>Detalle de pantallas</h2>
          <button class="btn" onclick="window.print()">Guardar como PDF</button>
        </div>
        <div class="mk-screen-list">
          ${k.screenSnapshots.map(s => `
            <div class="screen-card">
              ${SmartKitShared.mediaHtml(s, 'mk-media', { preload: 'auto' })}
              <div class="mk-screen-body">
                <h3>${h(s.name)}</h3>
                <p class="muted small">${h(s.address)}</p>
                <div class="mk-specs">
                  <div class="mk-spec"><span>Formato</span><b>${h(s.format)}</b></div>
                  <div class="mk-spec"><span>Tipo</span><b>${h(s.type)}</b></div>
                  ${s.audience ? `<div class="mk-spec"><span>Audiencia</span><b>${h(s.audience)}</b></div>` : ''}
                  <div class="mk-spec"><span>Impactos/día</span><b>${h(s.impactsDay)}</b></div>
                  <div class="mk-spec"><span>Precio/semana</span><b>${fmt(s.priceWeek)}</b></div>
                  <div class="mk-spec"><span>Subtotal</span><b>${fmt(s.subtotal)}</b></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="mk-section mk-signature" data-signature-state="${signature.state}">
        <div class="mk-signature-grid">
          <div class="mk-cta">
            <h3>¿Listo para empezar?</h3>
            <p>Contacta a nuestro equipo comercial para validar disponibilidad y reservar tu campaña.</p>
            <div class="mk-cta-actions">
              <a href="${whatsappUrl}" class="btn success" target="_blank" rel="noopener">Contactar por WhatsApp</a>
              <button class="btn" onclick="window.print()">Guardar como PDF</button>
            </div>
          </div>
          <div class="mk-signature-details">
            <span class="mk-signature-badge">
              ${signature.state === 'valid' ? 'Propuesta verificada' : signature.state === 'invalid' ? 'Propuesta modificada' : 'Propuesta sin verificar'}
            </span>
            <p class="muted small" style="margin-top:8px;">
              ${signature.state === 'valid' ? 'El contenido de esta propuesta no ha sido alterado desde su creación.' : 'El contenido puede haber sido modificado. Contacta a tu ejecutivo para confirmar los detalles.'}
            </p>
            <details>
              <summary>Detalles de la firma digital</summary>
              <div class="mk-signature-data">
                <div><dt>Estado</dt><dd>${h(signature.state)}</dd></div>
                <div><dt>Algoritmo</dt><dd>${h(signature.algorithm || 'N/A')}</dd></div>
                <div><dt>Firmante</dt><dd>${h(signature.signer || 'N/A')}</dd></div>
                <div><dt>Fecha</dt><dd>${h(signature.signedAt ? new Date(signature.signedAt).toLocaleString() : 'N/A')}</dd></div>
                <div><dt>Hash</dt><dd>${h(signature.hash || 'N/A')}</dd></div>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section class="mk-section">
        <div class="mk-conditions">
          <div class="mk-condition-box">
            <h3>Condiciones Comerciales</h3>
            <p>${h(k.terms)}</p>
          </div>
          <div class="mk-condition-box">
            <h3>Próximos Pasos</h3>
            <ul>
              ${(k.nextSteps || []).map(step => `<li>${h(step)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>
    `;
  }

  function renderEmptyState(id) {
    SmartKitShared.applyBrandHeader();
    document.title += ' - Propuesta no encontrada';
    app.innerHTML = `
      <div class="mk-empty">
        <h1>Propuesta no encontrada</h1>
        <p>No se pudo encontrar el media kit con el ID "${h(id || 'ninguno')}".</p>
        <p class="muted">Si el enlace es correcto, es posible que la propuesta haya sido archivada o eliminada. Por favor, contacta a tu ejecutivo comercial.</p>
        <div style="margin-top: 24px;">
          <a href="./index.html" class="btn primary">Volver al cotizador</a>
        </div>
      </div>
    `;
  }
});