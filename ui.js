import { Shared } from './shared.js';

/**
 * @module ui
 * Módulo responsable de todas las manipulaciones del DOM y renderizado.
 */

const { formatMoney: fmt, escapeHtml: h } = Shared;

/**
 * Renderiza una única card de pantalla.
 * @param {object} screen - El objeto de la pantalla.
 * @param {boolean} isSelected - Si la pantalla está en la cotización.
 * @returns {string} El HTML de la card.
 */
function renderBrochureCard(screen, isSelected) {
  const availability = { label: 'Consultar', tone: 'neutral' }; // Lógica simplificada
  const badgeText = isSelected ? 'Seleccionada' : h(screen.tipo);
  const badgeClass = isSelected ? 'badge-selected' : '';

  return `
    <article class="card video-card ${isSelected ? 'selected' : ''}">
      ${Shared.mediaHtml(screen, 'thumb', { preload: false })}
      <div class="card-body">
        <div class="row card-head">
          <span class="muted small card-zone">${h(screen.b)}</span>
          <span class="badge media-badge ${badgeClass}" style="background:${Shared.TIPO_COL[screen.tipo]}22;color:${Shared.TIPO_COL[screen.tipo]}">${badgeText}</span>
        </div>
        <h3 class="card-title">${h(screen.n)}</h3>
        <p class="muted small card-address">${h(screen.dir)}</p>
        <div class="price card-price">${fmt(screen.precio)}<span class="muted small"> / semana</span></div>
        <div class="card-actions button-group">
          <button class="btn primary quote-add ${isSelected ? 'selected' : ''}" data-action="toggle-quote" data-screen-id="${screen.id}">${isSelected ? 'Agregado' : 'Agregar'}</button>
        </div>
      </div>
    </article>`;
}

/**
 * Renderiza los filtros de zona y orden.
 * @param {object} state - El estado actual de la aplicación.
 */
function renderFilters(state) {
  document.getElementById('zone-filters').innerHTML = state.zones.map(z =>
    `<button class="chip ${z === state.activeZone ? 'on' : ''}" data-action="set-zone" data-zone="${h(z)}">${h(z)}</button>`
  ).join('');

  const sortOptions = [
    { key: 'recommended', label: 'Recomendadas' },
    { key: 'impact', label: 'Mayor impacto' },
    { key: 'price', label: 'Menor precio' },
  ];
  document.getElementById('sort-filters').innerHTML = sortOptions.map(opt =>
    `<button class="chip ${opt.key === state.activeSort ? 'on' : ''}" data-action="set-sort" data-sort="${h(opt.key)}">${h(opt.label)}</button>`
  ).join('');
}

/**
 * Función principal de renderizado. Actualiza la UI basada en el estado.
 * @param {object} state - El estado completo de la aplicación.
 */
export function render(state) {
  // Renderizar estadísticas del Hero
  const minPrice = state.activeScreens.reduce((min, s) => Math.min(min, s.precio), Infinity);
  document.getElementById('hero-stats').innerHTML = `
    <div class="stat"><b>${state.activeScreens.length}</b><span>Pantallas activas</span></div>
    <div class="stat"><b>${Math.round(state.activeMetrics.totalReach / 1000)}k</b><span>Impactos/día</span></div>
    <div class="stat"><b>${Number.isFinite(minPrice) ? fmt(minPrice) : '$0'}</b><span>Desde / semana</span></div>
    <div class="stat"><b>${state.zones.length - 1}</b><span>Zonas</span></div>`;

  // Renderizar filtros
  renderFilters(state);

  // Lógica de ordenamiento y filtrado
  const list = state.activeScreens
    .filter(s => state.activeZone === 'Todos' || s.b === state.activeZone)
    .sort((a, b) => {
      if (state.activeSort === 'impact') return Shared.impNum(b) - Shared.impNum(a);
      if (state.activeSort === 'price') return a.precio - b.precio;
      return 0; // 'recommended' y otros órdenes se pueden implementar aquí
    });

  // Renderizar contador de catálogo
  const catalogCount = document.getElementById('catalog-count');
  if (catalogCount) {
    catalogCount.textContent = `${list.length} ${list.length === 1 ? 'pantalla' : 'pantallas'}`;
  }

  // Renderizar cards
  const cardsContainer = document.getElementById('cards');
  if (list.length) {
    cardsContainer.innerHTML = list.map(s => renderBrochureCard(s, state.selectedScreens.includes(s.id))).join('');
  } else {
    cardsContainer.innerHTML = `<div class="empty-state">No hay pantallas activas en ${state.activeZone}.</div>`;
  }

  // Renderizar cotizador (simplificado)
  const quoteCountEl = document.getElementById('quote-count');
  if (quoteCountEl) {
    quoteCountEl.textContent = state.selectedScreens.length;
  }
}

export function showToast(message) {
  Shared.showToast(message);
}