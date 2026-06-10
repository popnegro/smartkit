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
      <a class="btn primary" href="./index.html">Ir al brochure</a>
    </section>`;
}

function shortHash(value = '') {
  return value ? `${value.slice(0, 16)}...${value.slice(-12)}` : 'No disponible';
}

function renderSignature(signature) {
  const labels = {
    valid: ['Firma verificada', 'Autenticidad e integridad confirmadas para el contenido de esta propuesta.'],
    invalid: ['Sin firma digital', 'La propuesta incluye datos de integridad, pero no se pudo verificar con la clave actual.'],
    unsigned: ['Sin firma digital', 'Este documento no incluye firma verificable.']
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

async function renderKit(kit) {
  const brand = kit.brand || config.brand || Shared.DEFAULT_BRAND;
  const screens = kitScreens(kit);
  const total = Number(kit.total) || 0;
  const impacts = Number(kit.impacts) || screens.reduce((sum, screen) => sum + imp(screen.impactsDay) * 7, 0);
  const phone = String(brand.whatsapp || config.brand?.whatsapp || '').replace(/\D/g, '');
  const whatsappMessage = encodeURIComponent(`Hola, quiero avanzar con el media kit ${kit.id || ''} para ${kit.client || 'mi campana'}.`);
  const whatsappHref = phone ? `https://wa.me/${phone}?text=${whatsappMessage}` : './index.html';
  const date = kit.createdAt ? new Date(kit.createdAt).toLocaleDateString('es-AR') : 'Fecha a confirmar';
  const validUntil = kit.validUntil ? new Date(`${kit.validUntil}T00:00:00`).toLocaleDateString('es-AR') : (kit.validity || '15 dias');
  const signature = await Shared.verifyMediaKitSignature(kit, {
    signer: config.signature?.signer || brand.name,
    secret: config.signature?.secret || ''
  });

  document.title = `${brand.name || 'SmartKit'} - Media Kit ${kit.client || ''}`;
  Shared.applyBrandHeader(brand);
  document.getElementById('app').innerHTML = `
    <section class="mk-hero">
      <div>
        <span class="quote-eyebrow">Propuesta DOOH</span>
        <h1>${h(kit.client || 'Cliente')}</h1>
        <p>${h(kit.contact || 'Contacto a confirmar')} · ${h(kit.duration || 'Duracion a confirmar')} · ${h(date)}</p>
      </div>
      <div class="mk-summary" aria-label="Resumen de media kit">
        <div class="mk-kpi"><b>${screens.length}</b><span>Pantallas</span></div>
        <div class="mk-kpi"><b>${Math.round(impacts / 1000).toLocaleString('es-AR')}k</b><span>Impactos estimados</span></div>
        <div class="mk-kpi"><b>${fmt(total)}</b><span>Inversion</span></div>
        <div class="mk-kpi"><b>${impacts ? fmt(total / impacts * 1000) : '$0'}</b><span>CPM plan</span></div>
      </div>
    </section>
    <section class="mk-section">
      <div class="mk-section-head">
        <div>
          <span class="quote-eyebrow">Inventario seleccionado</span>
          <h2>Pantallas incluidas</h2>
        </div>
        <a class="btn primary" href="./index.html">Cotizar cambios</a>
      </div>
      <div class="mk-screen-list">
        ${screens.map(screen => `
          <article class="screen-card">
            ${Shared.mediaHtml(screen, 'media mk-media')}
            <div class="mk-screen-body">
              <h3>${h(screen.name)}</h3>
              <p class="muted">${h(screen.address)} · ${h(screen.zone)}</p>
              <div class="mk-specs">
                <div class="mk-spec"><span>Formato</span><b>${h(screen.format)}</b></div>
                <div class="mk-spec"><span>Resolucion</span><b>${h(screen.resolution)}</b></div>
                <div class="mk-spec"><span>Impactos/dia</span><b>${h(screen.impactsDay)}</b></div>
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
          <p>${h(kit.terms || 'Inicio de campana sujeto a disponibilidad y aprobacion de piezas. Valores expresados en ARS.')}</p>
        </div>
        <div class="mk-condition-box">
          <h3>Formatos y validez</h3>
          <ul>
            <li>Validez de propuesta: ${h(validUntil)}</li>
            <li>Formatos sugeridos: MP4 H.264, JPG o PNG.</li>
            <li>Entrega de piezas: 72 hs habiles antes del inicio.</li>
          </ul>
        </div>
        <div class="mk-cta">
          <h3>Reservar propuesta</h3>
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
