// /api/screens.js
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(request, response) {
  // Solo permitir peticiones GET
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // La ruta al archivo screens.json.
    // En Vercel, los archivos en el directorio raíz están disponibles en `process.cwd()`.
    const filePath = path.join(process.cwd(), 'screens.json');
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Enviar los datos como respuesta JSON
    return response.status(200).json(data);
  } catch (error) {
    console.error('Error al leer o parsear screens.json:', error);
    return response.status(500).json({ message: 'Error interno del servidor al cargar el inventario.' });
  }
}