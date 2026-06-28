'use strict';

/**
 * Encapsula toda la lógica en un event listener 'DOMContentLoaded' para asegurar
 * que el DOM está completamente cargado antes de ejecutar el script.
 */
document.addEventListener('DOMContentLoaded', () => {

  // --- Constantes y Selectores del DOM ---
  const TOAST_DURATION = 2600; // Duración en ms para el toast

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const toast = document.querySelector('[data-toast]');
  const revealItems = document.querySelectorAll('.reveal');

  /**
   * Gestiona el menú de navegación móvil (hamburguesa).
   */
  const setupMenu = () => {
    if (!menuToggle || !menu) return; // Guarda contra elementos nulos

    menuToggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Cierra el menú si se hace clic en un enlace dentro de él
    menu.addEventListener('click', (event) => {
      if (event.target.matches('a')) {
        menu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  };

  /**
   * Gestiona el envío de formularios usando delegación de eventos.
   * Muestra un toast o redirige según el data-attribute del formulario.
   */
  const setupForms = () => {
    if (!toast) return;

    document.body.addEventListener('submit', (event) => {
      // Solo actuar sobre formularios dentro del body
      if (event.target.tagName === 'FORM') {
        event.preventDefault();
        const form = event.target;

        if (form.dataset.redirect) {
          window.location.href = form.dataset.redirect;
          return;
        }

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), TOAST_DURATION);
      }
    });
  };

  /**
   * Configura IntersectionObserver para revelar elementos al hacer scroll.
   * Es la forma más performante de manejar animaciones "on-scroll".
   */
  const setupRevealOnScroll = () => {
    if (revealItems.length === 0) return;

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Deja de observar el elemento una vez visible
        }
      });
    }, { threshold: 0.1 }); // El elemento se revela cuando el 10% es visible

    revealItems.forEach(item => revealObserver.observe(item));
  }

  // --- Inicialización de Módulos ---
  setupMenu();
  setupForms();
  setupRevealOnScroll();
});
