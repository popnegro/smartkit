const redirectForms = document.querySelectorAll("[data-next]");
const uploadArea = document.querySelector("[data-upload-area]");
const uploadInput = document.querySelector("[data-upload-input]");
const uploadText = document.querySelector("[data-upload-text]");
const closeToast = document.querySelector("[data-close-toast]");
const toastSuccess = document.querySelector("[data-success-toast]");

redirectForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    window.location.href = form.dataset.next;
  });
});

if (uploadArea && uploadInput && uploadText) {
  uploadArea.addEventListener("click", () => uploadInput.click());
  uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.style.borderColor = "var(--sk-primary)";
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.borderColor = "#d4d4d4";
  });
  uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files;
    if (file) uploadText.textContent = file.name;
    uploadArea.style.borderColor = "#d4d4d4";
  });
  uploadInput.addEventListener("change", () => {
    const [file] = uploadInput.files;
    if (file) uploadText.textContent = file.name;
  });
}

if (closeToast && toastSuccess) {
  closeToast.addEventListener("click", () => {
    toastSuccess.hidden = true;
  });
}

// Integración de Mercado Pago Bricks
const mp = typeof MercadoPago !== 'undefined' ? new MercadoPago('YOUR_PUBLIC_KEY', { locale: 'es-AR' }) : null;

if (mp && document.getElementById('cardPaymentBrick_container')) {
  const bricksBuilder = mp.bricks();

  const renderCardPaymentBrick = async (bricksBuilder) => {
    const settings = {
      initialization: {
        amount: 24201206.15, // Monto total definido en el resumen
        payer: { email: "user@example.com" },
      },
      customization: {
        visual: {
          style: {
            theme: 'default', // Se adapta al diseño limpio de SmartKit
            customVariables: {
              borderRadius: '12px',
              colorPrimary: '#2563eb', // --sk-primary de tu CSS
            }
          },
        },
      },
      callbacks: {
        onReady: () => console.log("Card Brick ready"),
        onSubmit: (formData) => {
          // Aquí envías formData a tu backend para procesar el pago
          console.log("Datos para el backend:", formData);
          // Simulación de éxito para el prototipo:
          if (toastSuccess) {
            toastSuccess.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        },
        onError: (error) => console.error("Error en el Brick:", error),
      },
    };
    window.cardPaymentBrickController = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', settings);
  };

  renderCardPaymentBrick(bricksBuilder);

  // Lógica para alternar métodos de pago
  const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
  const brickCont = document.getElementById('cardPaymentBrick_container');
  const otherCont = document.getElementById('other-method-content');
  const summaryPayBtn = document.getElementById('pay-button');

  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isCard = e.target.value === 'card';
      brickCont.style.display = isCard ? 'block' : 'none';
      otherCont.style.display = isCard ? 'none' : 'block';
      if (summaryPayBtn) summaryPayBtn.style.display = isCard ? 'none' : 'block'; // El Brick tiene su propio botón
    });
  });
}
