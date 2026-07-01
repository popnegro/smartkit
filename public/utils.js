/* ══════════════════════════════════════════════
   utils.js — Módulo de utilidades de UI
═══════════════════════════════════════════════ */

const UI = {
  /**
   * Shorthand for document.querySelector.
   * @param {string} selector The CSS selector of the element to get.
   * @returns {HTMLElement|null}
   */
  $(selector) {
    return document.querySelector(selector);
  },

  /**
   * Formats a number as ARS currency.
   * @param {number} n The number to format.
   * @returns {string}
   */
  fmt(n) {
    return '$' + Math.round(n).toLocaleString('es-AR');
  },

  /**
   * Formats a number of impacts, using 'k' for thousands.
   * @param {number} n The number to format.
   * @returns {string}
   */
  fmtImp(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  },

  /**
   * Escapes a string for safe insertion into HTML.
   * @param {string|number|null|undefined} s The content to escape.
   * @returns {string}
   */
  esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  /**
   * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed.
   * @param {Function} func The function to debounce.
   * @param {number} delay The number of milliseconds to delay.
   * @returns {Function}
   */
  debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }
};