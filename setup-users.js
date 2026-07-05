// /api/setup-users.js
import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10; // Factor de coste para bcrypt

// Los usuarios que quieres agregar a tu base de datos.
const USERS_TO_SEED = [
  { username: 'admin', password: 'password123', role: 'admin' },
  { username: 'editor', password: 'password456', role: 'editor' },
];

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const pipeline = kv.pipeline();
    let count = 0;

    for (const user of USERS_TO_SEED) {
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      const userKey = `user:${user.username}`;
      const userData = {
        username: user.username,
        hashedPassword: hashedPassword,
        role: user.role,
      };
      pipeline.set(userKey, userData);
      count++;
    }

    await pipeline.exec();
    return response.status(200).json({ message: `Base de datos poblada con éxito. ${count} usuarios añadidos/actualizados.` });
  } catch (error) {
    console.error('Error poblando la base de datos:', error);
    return response.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
}