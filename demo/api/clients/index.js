/**
 * api/clients/index.js
 * GET  /api/clients → devuelve todos los clientes
 * POST /api/clients → crea un nuevo cliente
 */

const { handleCors } = require('../_cors');
const db = require('../db');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const clients = await db.getClients();
      return res.status(200).json(clients);
    } catch (err) {
      console.error('[GET /api/clients]', err);
      return res.status(500).json({ message: 'Error al obtener clientes.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, contact, email, phone } = req.body || {};
      if (!name) {
        return res.status(400).json({ message: 'El campo "name" es requerido.' });
      }
      const newClient = await db.addClient({ name, contact, email, phone });
      return res.status(201).json(newClient);
    } catch (err) {
      console.error('[POST /api/clients]', err);
      return res.status(500).json({ message: 'Error al crear el cliente.' });
    }
  }

  return res.status(405).json({ message: `Método ${req.method} no permitido.` });
};
