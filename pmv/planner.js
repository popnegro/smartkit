'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // --- CONFIGURACIÓN ---
  // La clave pública se lee desde un atributo data-* en el body para mayor flexibilidad.
  const MERCADOPAGO_PUBLIC_KEY = document.body.dataset.mpPublicKey || 'YOUR_PUBLIC_KEY_FALLBACK';
  const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://api.tu-dominio.com';


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
      // TODO: Leer el monto dinámicamente del resumen de la campaña.
      const amountElement = document.querySelector('.amounts strong');
      const amountText = amountElement ? amountElement.textContent.replace(/[^0-9,.-]+/g,"").replace(/[.,]/g, "") : '0';
      const amount = parseFloat(amountText) / 100;

      const settings = {
        initialization: {
          amount: amount || 100, // Usar el monto dinámico o un fallback.
          payer: { email: "test_user@test.com" }, // TODO: Usar el email del usuario logueado.
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
          onSubmit: async (formData) => {
            // Deshabilitar el botón de pago para evitar envíos múltiples
            const payButton = document.querySelector('#cardPaymentBrick_container .mp-bricks-form__submit-button');
            if (payButton) payButton.disabled = true;

            // Lógica para enviar datos al backend
            try {
              const response = await fetch(`${API_BASE_URL}/payments/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
              });

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.message || 'Payment processing failed.');
              }

              // Éxito: mostrar notificación y/o redirigir
              const toastSuccess = document.querySelector("[data-success-toast]");
              if (toastSuccess) toastSuccess.hidden = false;
              window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (error) {
              console.error("Error sending payment to backend:", error);
              alert(`Error: ${error.message}`);
            } finally {
              if (payButton) payButton.disabled = false; // Reactivar el botón
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
