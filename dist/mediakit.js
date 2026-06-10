const Shared = window.SmartKitShared;
const config = window.APP_CONFIG || {};
const h = Shared.escapeHtml;
const fmt = Shared.formatMoney;
const params = new URLSearchParams(location.search);
const id = params.get('id') || '';
const imp = screen => parseInt(String(screen.imp || screen || '0').replace(/\./g, ''), 10) || 0;

async function fetchKit(kitId) {
  if (!kitId) return null;
  try {
    const response = await fetch(`./data/kits/${encodeURIComponent(kitId)}.json`, { cache: 'no-store' });
    if (response.ok) return await response.json();
  } catch {}
  return null;
}

function kitScreens(kit) {
  if (Array.isArray(kit.screenSnapshots) && kit.screenSnapshots.length) return kit.screenSnapshots;
  return (kit.screenIds || []).map(screenId => {
    const screen = SCREENS.find(item => item.id === screenId);
    return screen ? Shared.screenSnapshot(screen) : null;
  }).filter(Boolean);
}

function renderEmpty() {
  document.getElementById('app').innerHTML = `
    <section class="mk-empty">
      <span class="quote-eyebrow">Media Kit</span>
      <h1>Crea tu media kit</h1>
      <p class="muted">Selecciona pantallas desde el brochure, ajusta la duración y genera una propuesta con inversión, impactos, videos y condiciones lista para compartir.</p>
      <div class="mk-empty-actions">
        <a class="btn primary" href="./index.html">Ir al brochure</a>
        <a class="btn" href="./mediakit.html?id=demo-trapiche">Ver demo</a>
      </div>
    </section>`;
}

function shortHash(value = '') {
  return value ? `${value.slice(0, 16)}...${value.slice(-12)}` : 'No disponible';
}

function renderSignature(signature) {
  const labels = {
    valid: ['Firma verificada', 'Autenticidad e integridad confirmadas para el contenido de esta propuesta.'],
    invalid: ['Firma inválida', 'El contenido no coincide con la firma registrada. Solicita una nueva propuesta.'],
    unsigned: ['Sin firma digital', 'Este documento muestra huella de integridad, pero no incluye firma verificable.']
  };
  const [title, copy] = labels[signature.state] || labels.unsigned;
  const signedAt = signature.signedAt ? new Date(signature.signedAt).toLocaleString('es-AR') : 'No informado';
  return `
    <section class="mk-section mk-signature" data-signature-state="${h(signature.state)}">
      <div class="mk-section-head">
        <div>
          <span class="quote-eyebrow">Autenticidad e integridad</span>
          <h2>Firma digital</h2>
        </div>
        <span class="mk-signature-badge">${h(title)}</span>
      </div>
      <div class="mk-signature-grid">
        <div class="mk-condition-box">
          <h3>${h(title)}</h3>
          <p>${h(copy)}</p>
        </div>
        <details class="mk-signature-details">
          <summary>Ver datos técnicos</summary>
          <dl class="mk-signature-data">
            <div><dt>Firmante</dt><dd>${h(signature.signer || 'SmartKit')}</dd></div>
            <div><dt>Algoritmo</dt><dd>${h(signature.algorithm || 'SHA-256')}</dd></div>
            <div><dt>Fecha de firma</dt><dd>${h(signedAt)}</dd></div>
            <div><dt>Huella SHA-256</dt><dd>${h(shortHash(signature.hash))}</dd></div>
            <div><dt>Firma</dt><dd>${h(shortHash(signature.value))}</dd></div>
          </dl>
        </details>
      </div>
    </section>`;
}

function executiveSummary(kit, screens, total, impacts) {
  if (kit.executiveSummary) return kit.executiveSummary;
  return `Plan recomendado de ${screens.length} ${screens.length === 1 ? 'pantalla' : 'pantallas'} durante ${kit.duration || 'la duración seleccionada'}, con ${Math.round(impacts).toLocaleString('es-AR')} impactos estimados y una inversión de ${fmt(total)}.`;
}

function renderNextSteps(kit) {
  const steps = Array.isArray(kit.nextSteps) && kit.nextSteps.length
    ? kit.nextSteps
    : ['Validar disponibilidad de pantallas y fechas de campaña.', 'Confirmar inversión y orden de compra.', 'Enviar piezas finales 72 hs hábiles antes del inicio.'];
  return steps.map(step => `<li>${h(step)}</li>`).join('');
}

function proposalState(kit) {
  const validDate = kit.validUntil ? new Date(`${kit.validUntil}T23:59:59`) : null;
  if (validDate && validDate < new Date()) return { label: 'Vencido', tone: 'danger' };
  if (kit.status === 'Aprobado') return { label: 'Aprobado', tone: 'success' };
  if (kit.status === 'Enviado') return { label: 'Enviado', tone: 'info' };
  return { label: kit.status || 'Borrador', tone: 'neutral' };
}

function zoneCoverage(screens) {
  return Object.entries(screens.reduce((acc, screen) => {
    acc[screen.zone || 'Sin zona'] = (acc[screen.zone || 'Sin zona'] || 0) + 1;
    return acc;
  }, {})).map(([zone, count]) => `${zone} (${count})`).join(' · ');
}

function typeMix(screens) {
  return Object.entries(screens.reduce((acc, screen) => {
    acc[screen.type || 'Sin tipo'] = (acc[screen.type || 'Sin tipo'] || 0) + 1;
    return acc;
  }, {})).map(([type, count]) => `${type}: ${count}`).join(' · ');
}

function screenSubtotal(screen, kit) {
  if (Number(screen.subtotal)) return Number(screen.subtotal);
  const durationWeeks = Math.max(1, Math.round((Number(kit.days) || 7) / 7));
  return Number(screen.priceWeek || 0) * durationWeeks;
}

window.copyMediaKitLink = function copyMediaKitLink() {
  navigator.clipboard?.writeText(location.href).then(() => {
    const button = document.querySelector('[data-copy-link]');
    if (!button) return;
    const previous = button.textContent;
    button.textContent = 'Link copiado';
    setTimeout(() => { button.textContent = previous; }, 1400);
  }).catch(() => {});
};

async function renderKit(kit) {
  const brand = kit.brand || config.brand || Shared.DEFAULT_BRAND;
  const screens = kitScreens(kit);
  const total = Number(kit.total) || 0;
  const impacts = Number(kit.impacts) || screens.reduce((sum, screen) => sum + imp(screen.impactsDay) * 7, 0);
  const phone = String(brand.whatsapp || config.brand?.whatsapp || '').replace(/\D/g, '');
  const whatsappMessage = encodeURIComponent(`Hola, quiero avanzar con el media kit ${kit.id || ''} para ${kit.client || 'mi campaña'}.`);
  const whatsappHref = phone ? `https://wa.me/${phone}?text=${whatsappMessage}` : './index.html';
  const date = kit.createdAt ? new Date(kit.createdAt).toLocaleDateString('es-AR') : 'Fecha a confirmar';
  const validUntil = kit.validUntil ? new Date(`${kit.validUntil}T00:00:00`).toLocaleDateString('es-AR') : (kit.validity || '15 días');
  const state = proposalState(kit);
  const avgDailyReach = screens.length ? Math.round(impacts / (Number(kit.days) || 7)) : 0;
  const signature = await Shared.verifyMediaKitSignature(kit, {
    signer: config.signature?.signer || brand.name,
    secret: config.signature?.secret || ''
  });

  document.title = `${brand.name || 'SmartKit'} - Media Kit ${kit.client || ''}`;
  Shared.applyBrandHeader(brand);
  document.getElementById('app').innerHTML = `
    <div class="mk-action-bar" aria-label="Acciones del media kit">
      <div>
        <strong>${h(kit.client || 'Cliente')}</strong>
        <span>${h(state.label)} · Válido hasta ${h(validUntil)}</span>
      </div>
      <div class="mk-action-buttons">
        <a class="btn primary" href="${whatsappHref}" target="_blank" rel="noopener">Contactar</a>
        <button class="btn" type="button" onclick="window.print()">PDF</button>
        <button class="btn" type="button" data-copy-link onclick="copyMediaKitLink()">Copiar link</button>
      </div>
    </div>
    <section class="mk-hero">
      <div>
        <span class="quote-eyebrow">Propuesta DOOH</span>
        <h1>${h(kit.client || 'Cliente')}</h1>
        <p>${h(kit.contact || 'Contacto a confirmar')} · ${h(kit.duration || 'Duración a confirmar')} · ${h(date)}</p>
        <div class="mk-hero-meta">
          <span class="mk-state mk-state-${h(state.tone)}">${h(state.label)}</span>
          <span>Válido hasta ${h(validUntil)}</span>
          <span>ID ${h(kit.id || 'media-kit')}</span>
        </div>
        <div class="mk-hero-actions">
          <a class="btn primary" href="${whatsappHref}" target="_blank" rel="noopener">Avanzar con la reserva</a>
          <button class="btn" type="button" onclick="copyMediaKitLink()">Copiar link</button>
        </div>
      </div>
      <div class="mk-summary" aria-label="Resumen de media kit">
        <div class="mk-kpi"><b>${screens.length}</b><span>Pantallas</span></div>
        <div class="mk-kpi"><b>${Math.round(impacts / 1000).toLocaleString('es-AR')}k</b><span>Impactos estimados</span></div>
        <div class="mk-kpi"><b>${fmt(total)}</b><span>Inversión</span></div>
        <div class="mk-kpi"><b>${impacts ? fmt(total / impacts * 1000) : '$0'}</b><span>CPM plan</span></div>
      </div>
    </section>
    <section class="mk-section mk-executive">
      <div class="mk-section-head">
        <div>
          <span class="quote-eyebrow">Resumen ejecutivo</span>
          <h2>Propuesta comercial</h2>
        </div>
        <span class="mk-proposal-id">${h(kit.id || 'media-kit')}</span>
      </div>
      <div class="mk-executive-grid">
        <div class="mk-condition-box">
          <h3>Objetivo del plan</h3>
          <p>${h(executiveSummary(kit, screens, total, impacts))}</p>
        </div>
        <div class="mk-condition-box">
          <h3>Cobertura y eficiencia</h3>
          <ul>
            <li>Cobertura: ${h(zoneCoverage(screens) || 'A confirmar')}</li>
            <li>Mix de tránsito: ${h(typeMix(screens) || 'A confirmar')}</li>
            <li>Alcance diario promedio: ${avgDailyReach.toLocaleString('es-AR')} impactos.</li>
            <li>CPM estimado: ${impacts ? fmt(total / impacts * 1000) : '$0'} por mil impactos.</li>
          </ul>
        </div>
        <div class="mk-condition-box">
          <h3>Próximos pasos</h3>
          <ol class="mk-steps">${renderNextSteps(kit)}</ol>
        </div>
      </div>
    </section>
    <section class="mk-section">
      <div class="mk-section-head">
        <div>
          <span class="quote-eyebrow">Inventario seleccionado</span>
          <h2>Pantallas incluidas</h2>
        </div>
        <a class="btn primary" href="./index.html">Ajustar selección</a>
      </div>
      <div class="mk-screen-list">
        ${screens.map(screen => `
          <article class="screen-card">
            ${Shared.mediaHtml(screen, 'media mk-media')}
            <div class="mk-screen-body">
              <h3>${h(screen.name)}</h3>
              <p class="muted">${h(screen.address)} · ${h(screen.zone)}</p>
              <div class="product-tags">
                <span class="product-tag">${h(screen.zone)}</span>
                <span class="product-tag">${h(screen.type || 'DOOH')}</span>
              </div>
              <div class="mk-specs">
                <div class="mk-spec"><span>Formato</span><b>${h(screen.format)}</b></div>
                <div class="mk-spec"><span>Resolución</span><b>${h(screen.resolution)}</b></div>
                <div class="mk-spec"><span>Impactos/día</span><b>${h(screen.impactsDay)}</b></div>
                <div class="mk-spec"><span>Impactos plan</span><b>${(imp(screen.impactsDay) * (Number(kit.days) || 7)).toLocaleString('es-AR')}</b></div>
                <div class="mk-spec"><span>Subtotal</span><b>${fmt(screenSubtotal(screen, kit))}</b></div>
              </div>
            </div>
          </article>`).join('')}
      </div>
    </section>
    <section class="mk-section">
      <div class="mk-section-head">
        <div>
          <span class="quote-eyebrow">Condiciones</span>
          <h2>Detalle comercial</h2>
        </div>
      </div>
      <div class="mk-conditions">
        <div class="mk-condition-box">
          <h3>Condiciones de campaña</h3>
          <p>${h(kit.terms || 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas. Valores expresados en ARS.')}</p>
        </div>
        <div class="mk-condition-box">
          <h3>Formatos y validez</h3>
          <ul>
            <li>Validez de propuesta: ${h(validUntil)}</li>
            <li>Formatos sugeridos: MP4 H.264, JPG o PNG.</li>
            <li>Entrega de piezas: 72 hs hábiles antes del inicio.</li>
          </ul>
        </div>
        <div class="mk-cta">
          <h3>Avanzar con la reserva</h3>
          <p>Confirma disponibilidad, fechas y piezas finales con el equipo comercial.</p>
          <div class="mk-cta-actions">
            <a class="btn primary" href="${whatsappHref}" target="_blank" rel="noopener">Contactar por WhatsApp</a>
            <button class="btn" type="button" onclick="window.print()">Guardar PDF</button>
          </div>
        </div>
      </div>
    </section>
    ${renderSignature(signature)}`;
}

(async function init() {
  Shared.updateMediaKitLinks(Shared.latestMediaKitId(id));
  const remoteKit = await fetchKit(id);
  const kits = Shared.storedPublicKits();
  const kit = remoteKit || (id ? kits.find(item => item.id === id) : null);
  if (kit?.id) Shared.updateMediaKitLinks(kit.id);
  if (kit) await renderKit(kit);
  else renderEmpty();
})();
