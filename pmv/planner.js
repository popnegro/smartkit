'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // --- CONFIGURACIÓN ---
  // En una aplicación real, la clave pública debería venir del backend o de variables de entorno.
  const MERCADOPAGO_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

  /**
   * Módulo para gestionar la subida de archivos con drag & drop.
   * Se activa solo si encuentra el área de subida en la página.
   */
  const setupFileUpload = () => {
    const uploadArea = document.querySelector("[data-upload-area]");
    const uploadInput = document.querySelector("[data-upload-input]");
    const uploadText = document.querySelector("[data-upload-text]");

    if (!uploadArea || !uploadInput || !uploadText) return;

    const handleFiles = (files) => {
      const [file] = files;
      if (file) {
        uploadText.textContent = file.name;
        uploadArea.classList.add('has-file');
      }
    };

    uploadArea.addEventListener("click", () => uploadInput.click());

    uploadArea.addEventListener("dragover", (event) => {
      event.preventDefault();
      uploadArea.classList.add('is-dragging');
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove('is-dragging');
    });

    uploadArea.addEventListener("drop", (event) => {
      event.preventDefault();
      uploadArea.classList.remove('is-dragging');
      handleFiles(event.dataTransfer.files);
    });

    uploadInput.addEventListener("change", () => handleFiles(uploadInput.files));
  };

  /**
   * Módulo para gestionar la notificación (toast) de éxito.
   */
  const setupToast = () => {
    const closeToastBtn = document.querySelector("[data-close-toast]");
    const toastSuccess = document.querySelector("[data-success-toast]");

    if (closeToastBtn && toastSuccess) {
      closeToastBtn.addEventListener("click", () => {
        toastSuccess.hidden = true;
      });
    }
  };

  /**
   * Módulo para la integración de Mercado Pago Bricks.
   * Se activa solo si encuentra el contenedor del brick en la página.
   */
  const setupPaymentBrick = () => {
    const brickContainer = document.getElementById('cardPaymentBrick_container');
    if (typeof MercadoPago === 'undefined' || !brickContainer) return;

    const mp = new MercadoPago(MERCADOPAGO_PUBLIC_KEY, { locale: 'es-AR' });
    const bricksBuilder = mp.bricks();

    const renderCardPaymentBrick = async () => {
      const settings = {
        initialization: {
          amount: 24201206.15, // Idealmente, este valor debería leerse del DOM para ser dinámico.
          payer: { email: "user@example.com" },
        },
        customization: {
          visual: {
            style: {
              theme: 'default',
              customVariables: {
                borderRadius: '12px',
                colorPrimary: '#2563eb',
              }
            },
          },
        },
        callbacks: {
          onReady: () => console.log("Card Brick está listo."),
          onSubmit: (formData) => {
            console.log("Enviando datos al backend:", formData);
            // Aquí iría la lógica para enviar `formData` a tu backend.
            // Para este prototipo, simulamos un éxito.
            const toastSuccess = document.querySelector("[data-success-toast]");
            if (toastSuccess) {
              toastSuccess.hidden = false;
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          },
          onError: (error) => console.error("Error en el Card Brick:", error),
        },
      };

      try {
        window.cardPaymentBrickController = await bricksBuilder.create('cardPayment', brickContainer.id, settings);
      } catch (error) {
        console.error("No se pudo inicializar el Brick de Mercado Pago:", error);
      }
    };

    renderCardPaymentBrick();

    // Lógica para alternar métodos de pago
    const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
    const otherCont = document.getElementById('other-method-content');
    const summaryPayBtn = document.getElementById('pay-button');

    paymentRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isCard = e.target.value === 'card';
        brickContainer.hidden = !isCard;
        if (otherCont) otherCont.hidden = isCard;
        if (summaryPayBtn) summaryPayBtn.hidden = isCard; // El Brick tiene su propio botón de pago.
      });
    });
  };

  // --- INICIALIZACIÓN DE MÓDULOS ---
  setupFileUpload();
  setupToast();
  setupPaymentBrick();
});
