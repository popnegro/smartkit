import { Shared } from './shared.js';

/**
 * @module state
 * Módulo para gestionar el estado de la aplicación del brochure.
 */

const state = {
  sourceScreens: [],
  activeScreens: [],
  brand: { ...Shared.DEFAULT_BRAND },
  map: null,
  activeZone: 'Todos',
  activeSort: 'recommended',
  markers: {},
  selectedScreens: [],
  quoteDuration: '1s',
  activeScreenId: null,
  zones: ['Todos'],
  activeMetrics: { totalReach: 0 }
};

export const appState = {
  /**
   * Obtiene una copia del estado actual.
   * @returns {object}
   */
  get: () => ({ ...state }),

  /**
   * Inicializa el estado con los datos de las pantallas.
   * @param {Array} screens - El array de pantallas del inventario.
   */
  initializeScreens(screens) {
    state.sourceScreens = screens;
    state.activeScreens = screens.filter(s => s.status ? s.status === 'Activo' : (s.active !== false));
    state.zones = ['Todos', ...new Set(state.activeScreens.map(s => s.b))];
    state.activeMetrics.totalReach = state.activeScreens.reduce((acc, s) => acc + Shared.impNum(s), 0);
  },

  /**
   * Establece la zona activa para el filtro.
   * @param {string} zone 
   */
  setActiveZone(zone) {
    state.activeZone = zone;
  },

  /**
   * Establece el orden activo.
   * @param {string} sort 
   */
  setActiveSort(sort) {
    state.activeSort = sort;
  },

  /**
   * Añade o quita una pantalla de la cotización.
   * @param {number} screenId 
   * @returns {boolean} - `true` si la pantalla fue añadida, `false` si fue quitada.
   */
  toggleQuoteScreen(screenId) {
    const wasSelected = state.selectedScreens.includes(screenId);
    if (wasSelected) {
      state.selectedScreens = state.selectedScreens.filter(id => id !== screenId);
    } else {
      state.selectedScreens.push(screenId);
    }
    return !wasSelected;
  }
};