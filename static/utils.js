/* ══════════════════════════════════════════════
   utils.js — Funciones de ayuda compartidas
═══════════════════════════════════════════════ */

/**
 * Shorthand for document.getElementById.
 * @param {string} id The ID of the element to get.
 * @returns {HTMLElement|null}
 */
const $ = id => document.getElementById(id);

/**
 * Formats a number as ARS currency.
 * @param {number} n The number to format.
 * @returns {string}
 */
const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');

/**
 * Formats a number of impacts, using 'k' for thousands.
 * @param {number} n The number to format.
 * @returns {string}
 */
const fmtImp = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);

/**
 * Escapes a string for safe insertion into HTML.
 * @param {string|number|null|undefined} s The content to escape.
 * @returns {string}
 */
const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed.
 * @param {Function} func The function to debounce.
 * @param {number} delay The number of milliseconds to delay.
 * @returns {Function}
 */
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}