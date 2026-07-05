// /nav.js

/**
 * Genera y gestiona un menú de navegación compartido para todas las páginas públicas.
 * Se inyecta en el elemento <header> de la página.
 */
const createSharedNav = () => {
  const header = document.querySelector('header.top');
  if (!header) {
    console.error('No se encontró el elemento <header> para inyectar la navegación.');
    return;
  }

  // Determina la página actual para marcar el enlace como activo.
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const navHTML = `
    <div class="brand">
      <div class="logo" id="brand-logo">SK</div>
      <strong id="brand-name">SmartKit</strong>
    </div>
    <nav class="nav">
      <a href="index.html" class="${currentPage === 'index.html' ? 'on' : ''}">Brochure</a>
      <a href="map.html" class="${currentPage === 'map.html' ? 'on' : ''}">Mapa</a>
      <a href="mediakit.html" id="nav-kit" class="${currentPage.startsWith('mediakit.html') ? 'on' : ''}">Media Kit</a>
      <a href="dashboard.html" class="cta">Dashboard</a>
    </nav>
  `;

  header.innerHTML = navHTML;

  // Lógica para actualizar la marca (logo y nombre) si está disponible en el estado compartido.
  // Esto asegura que la personalización del dashboard se refleje en todas partes.
  if (window.SmartKitShared && window.SmartKitShared.loadBrand) {
    window.SmartKitShared.loadBrand();
  }
};

// Ejecutar la creación del menú cuando el DOM esté listo.
document.addEventListener('DOMContentLoaded', createSharedNav);