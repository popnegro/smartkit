/**
 * api/kits/[id].js
 * GET    /api/kits/:id → obtiene un kit por ID
 * PUT    /api/kits/:id → actualiza un kit (ej: archivar)
 * DELETE /api/kits/:id → elimina un kit permanentemente
 *
 * Vercel pasa el ID como req.query.id gracias al file-system routing [id].js
 */

const { handleCors } = require('../_cors');
const db = require('../db');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  // Vercel popula req.query.id desde el nombre de archivo [id].js
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'ID de kit requerido.' });
  }

  if (req.method === 'GET') {
    try {
      const kit = await db.getKit(id);
      if (!kit) return res.status(404).json({ message: 'Kit no encontrado.' });
      return res.status(200).json(kit);
    } catch (err) {
      console.error(`[GET /api/kits/${id}]`, err);
      return res.status(500).json({ message: 'Error al obtener el kit.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updates = req.body || {};
      const updated = await db.updateKit(id, updates);
      if (!updated) return res.status(404).json({ message: 'Kit no encontrado.' });
      return res.status(200).json(updated);
    } catch (err) {
      console.error(`[PUT /api/kits/${id}]`, err);
      return res.status(500).json({ message: 'Error al actualizar el kit.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const deleted = await db.deleteKit(id);
      if (!deleted) return res.status(404).json({ message: 'Kit no encontrado.' });
      return res.status(204).end();
    } catch (err) {
      console.error(`[DELETE /api/kits/${id}]`, err);
      return res.status(500).json({ message: 'Error al eliminar el kit.' });
    }
  }

  return res.status(405).json({ message: `Método ${req.method} no permitido.` });
};
