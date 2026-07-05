// /footer.js

/**
 * Genera y gestiona un pie de página compartido para las páginas públicas.
 * Se inyecta en el elemento <footer> de la página.
 */
const createSharedFooter = () => {
  const footer = document.querySelector('footer.site-footer');
  if (!footer) {
    // No hacer nada si la página no tiene un elemento de pie de página.
    return;
  }

  const year = new Date().getFullYear();
  // Usar el nombre de la marca desde el estado compartido si está disponible, si no, un valor por defecto.
  const brandName = window.SmartKitShared?.DEFAULT_BRAND?.name || 'SmartKit';

  const footerHTML = `
    <div class="wrap">
      <p>&copy; ${year} ${brandName}. Todos los derechos reservados.</p>
      <p>Una solución para gestión de circuitos DOOH.</p>
    </div>
  `;

  footer.innerHTML = footerHTML;
};

document.addEventListener('DOMContentLoaded', createSharedFooter);