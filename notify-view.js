// Este archivo debe estar en /api/notify-view.js para que Vercel lo despliegue.
// Necesitarás instalar un cliente de email, por ejemplo, con `npm install resend`.
// También deberás configurar tus claves de API como "Environment Variables" en Vercel.

// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(request, response) {
  // 1. Seguridad: Solo permitir peticiones POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // 2. Validar el cuerpo de la petición
  const { kitId, clientName } = request.body;
  if (!kitId || !clientName) {
    return response.status(400).json({ message: 'Faltan los parámetros kitId o clientName.' });
  }

  // --- Lógica de envío de email (ejemplo con Resend) ---
  // Reemplaza esto con tu proveedor de email preferido (SendGrid, Mailgun, etc.)
  const adminEmail = process.env.ADMIN_EMAIL; // Configurar en Vercel
  if (!adminEmail) {
    console.error('La variable de entorno ADMIN_EMAIL no está configurada.');
    return response.status(500).json({ message: 'Error de configuración del servidor.' });
  }

  try {
    /*
    await resend.emails.send({
      from: 'SmartKit Notifier <notify@yourdomain.com>', // Debes verificar este dominio en tu proveedor
      to: [adminEmail],
      subject: `Tu Media Kit para "${clientName}" ha sido visto`,
      html: `
        <h1>¡Buenas noticias!</h1>
        <p>El media kit <strong>${kitId}</strong> para el cliente <strong>${clientName}</strong> acaba de ser abierto.</p>
        <p>Puede ser un buen momento para hacer un seguimiento.</p>
        <br>
        <p><em>- Notificación automática de SmartKit</em></p>
      `,
    });
    */
    console.log(`Simulando envío de email a ${adminEmail} por la vista del kit ${kitId}`);
    return response.status(200).json({ message: 'Notificación enviada correctamente.' });
  } catch (error) {
    console.error('Error al enviar el email de notificación:', error);
    return response.status(500).json({ message: 'Error al enviar la notificación.' });
  }
}