/**
 * api/screens/all.js
 * GET /api/screens/all → todas las pantallas sin filtrar (dashboard admin)
 * PUT /api/screens     → actualización masiva de pantallas
 */

const { handleCors } = require('../_cors');
const db = require('../db');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const screens = await db.getScreens();
      return res.status(200).json(screens);
    } catch (err) {
      console.error('[GET /api/screens/all]', err);
      return res.status(500).json({ message: 'Error al obtener pantallas.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updates = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: 'Se esperaba un array de pantallas.' });
      }
      const updated = await db.updateScreens(updates);
      return res.status(200).json({
        message: `${updates.length} pantalla(s) actualizada(s).`,
        screens: updated,
      });
    } catch (err) {
      console.error('[PUT /api/screens]', err);
      return res.status(500).json({ message: 'Error al actualizar pantallas.' });
    }
  }

  return res.status(405).json({ message: `Método ${req.method} no permitido.` });
};
