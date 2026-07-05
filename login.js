// /api/login.js
import jwt from 'jsonwebtoken';

// Deberías almacenar esto como una variable de entorno en Vercel (JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'un-secreto-muy-seguro-para-desarrollo';

// En un caso real, esto vendría de una base de datos.
const VALID_USERS = [
  { username: 'admin', password: 'password123', role: 'admin' },
  { username: 'editor', password: 'password456', role: 'editor' },
];

export default function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, password } = request.body;

  if (!username || !password) {
    return response.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }

  const user = VALID_USERS.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return response.status(401).json({ message: 'Credenciales inválidas.' });
  }

  // Si las credenciales son válidas, genera el token.
  // El token expira en 8 horas.
  const token = jwt.sign(
    { userId: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  // Envía el token al cliente.
  return response.status(200).json({ token });
}