/**
 * api/screens/index.js
 * GET  /api/screens  → devuelve todas las pantallas activas (brochure público)
 * POST /api/screens  → crea una nueva pantalla (dashboard admin)
 */

const { handleCors } = require('../_cors');
const db = require('../db');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const screens = await db.getScreens();
      // El brochure público solo muestra activas
      const active = screens.filter(s => s.status === 'Activo');
      return res.status(200).json(active);
    } catch (err) {
      console.error('[GET /api/screens]', err);
      return res.status(500).json({ message: 'Error al obtener pantallas.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nombre, zona, tipo, impactos, precio, ...rest } = req.body || {};
      if (!nombre) {
        return res.status(400).json({ message: 'El campo "nombre" es requerido.' });
      }
      const newScreen = await db.addScreen({ nombre, zona, tipo, impactos, precio, ...rest });
      return res.status(201).json(newScreen);
    } catch (err) {
      console.error('[POST /api/screens]', err);
      return res.status(500).json({ message: 'Error al crear la pantalla.' });
    }
  }

  return res.status(405).json({ message: `Método ${req.method} no permitido.` });
};
