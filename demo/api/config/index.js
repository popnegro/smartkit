/**
 * api/config/index.js
 * GET /api/config → devuelve la configuración global
 * PUT /api/config → actualiza la configuración global
 */

const { handleCors } = require('../_cors');
const db = require('../db');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const config = await db.getConfig();
      return res.status(200).json(config);
    } catch (err) {
      console.error('[GET /api/config]', err);
      return res.status(500).json({ message: 'Error al obtener configuración.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updates = req.body || {};
      // Campos permitidos para actualizar (whitelist de seguridad)
      const allowed = ['brand', 'logo', 'whatsapp', 'heroTitle', 'terms', 'validityDays'];
      const sanitized = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowed.includes(key))
      );
      const updated = await db.saveConfig(sanitized);
      return res.status(200).json({ message: 'Configuración actualizada.', config: updated });
    } catch (err) {
      console.error('[PUT /api/config]', err);
      return res.status(500).json({ message: 'Error al guardar configuración.' });
    }
  }

  return res.status(405).json({ message: `Método ${req.method} no permitido.` });
};
