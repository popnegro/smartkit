/**
 * api/kits/index.js
 * GET  /api/kits → devuelve todos los kits
 * POST /api/kits → crea un nuevo kit
 */

const { handleCors } = require('../_cors');
const db = require('../db');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const kits = await db.getKits();
      return res.status(200).json(kits);
    } catch (err) {
      console.error('[GET /api/kits]', err);
      return res.status(500).json({ message: 'Error al obtener kits.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const kitData = req.body || {};
      if (!kitData.screens || !Array.isArray(kitData.screens)) {
        return res.status(400).json({ message: 'El kit debe incluir un array de "screens".' });
      }
      const newKit = await db.addKit(kitData);
      return res.status(201).json(newKit);
    } catch (err) {
      console.error('[POST /api/kits]', err);
      return res.status(500).json({ message: 'Error al guardar el kit.' });
    }
  }

  return res.status(405).json({ message: `Método ${req.method} no permitido.` });
};
