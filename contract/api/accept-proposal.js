// Este archivo debe estar en /api/accept-proposal.js para que Vercel lo despliegue.
// Necesitarás instalar un cliente de email, por ejemplo, con `npm install resend`.
// También deberás configurar tus claves de API como "Environment Variables" en Vercel.
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(request, response) {
  // 1. Seguridad: Solo permitir peticiones POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // 2. Validar el cuerpo de la petición
  const { clientName, email, contractHtml } = request.body;
  if (!clientName || !email || !contractHtml) {
    return response.status(400).json({ message: 'Los parámetros clientName, email y contractHtml son requeridos.' });
  }

  // --- Lógica de envío de email (ejemplo con Resend) ---
  const adminEmail = process.env.ADMIN_EMAIL; // Configurar en Vercel
  if (!adminEmail) {
    console.error('La variable de entorno ADMIN_EMAIL no está configurada.');
    return response.status(500).json({ message: 'Error de configuración del servidor.' });
  }

  try {
    await resend.emails.send({
      from: 'SmartKit Notifier <notify@grupocomunicarte.com.ar>', // Reemplaza con tu dominio verificado
      to: [email, adminEmail], // Enviar al cliente y copia al admin
      subject: `Copia de la Propuesta Aceptada para ${clientName}`,
      html: contractHtml || `<p>Gracias por aceptar la propuesta. Adjuntamos una copia de la misma.</p>`,
    });
    
    return response.status(200).json({ message: 'Confirmación enviada correctamente.' });
  } catch (error) {
    console.error('Error al enviar el email de confirmación:', error);
    return response.status(500).json({ message: 'Error al enviar la confirmación.' });
  }
}