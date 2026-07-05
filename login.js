// /api/login.js
import jwt from 'jsonwebtoken';
import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';

// Deberías almacenar esto como una variable de entorno en Vercel (JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'un-secreto-muy-seguro-para-desarrollo';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, password } = request.body;

  if (!username || !password) {
    return response.status(400).json({ message: 'Usuario y contraseña son requeridos' });
  }

  try {
    // 1. Buscar al usuario en la base de datos KV por su clave.
    const userKey = `user:${username}`;
    const user = await kv.get(userKey);

    if (!user) {
      return response.status(401).json({ message: 'Credenciales inválidas' });
    }

    // 2. Comparar la contraseña enviada con el hash almacenado.
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatch) {
      return response.status(401).json({ message: 'Credenciales inválidas' });
    }

    // 3. Si las credenciales son válidas, generar el token.
    // El token expira en 8 horas.
    const token = jwt.sign(
      { userId: user.username, role: user.role }, // Payload
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 4. Enviar el token al cliente.
    return response.status(200).json({ token });

  } catch (error) {
    console.error('Error en el login:', error);
    return response.status(500).json({ message: 'Error interno del servidor' });
  }
}