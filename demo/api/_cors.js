/**
 * cors.js — Helper de CORS para funciones serverless de Vercel
 * 
 * Uso: if (handleCors(req, res)) return;
 */

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function handleCors(req, res) {
  const origin = req.headers.origin || '';

  // En desarrollo, permitir localhost
  const isDev = process.env.NODE_ENV !== 'production';
  const isAllowed = isDev || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Responder preflight OPTIONS inmediatamente
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // indica que el handler debe retornar
  }

  return false;
}

module.exports = { handleCors };
