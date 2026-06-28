require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { body, validationResult, param } = require('express-validator');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permite que tu frontend acceda a la API
app.use(express.json()); // Permite procesar JSON en el cuerpo de las peticiones

// --- Base de Datos en Memoria Mejorada ---
let nextId = 4; // Contador para el siguiente ID, asegurando unicidad.


// Datos en memoria (Simulando una base de datos)
let inventory = [
  { id: 1, name: 'Lujan Central', location: 'Mendoza, AR', price: 45000, status: 'Active' },
  { id: 2, name: 'Palmares Mall', location: 'Godoy Cruz', price: 62000, status: 'Active' },
  { id: 3, name: 'Rivadavia Plaza', location: 'Mendoza, AR', price: 38000, status: 'Inactive' }
];

// --- Middleware de Validación ---
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET: Obtener todo el inventario
app.get('/inventory', (req, res) => {
  res.json(inventory);
});

// PUT: Actualizar un ítem de inventario por ID
app.put(
  '/inventory/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    body('name').notEmpty().trim().escape().withMessage('Name is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a number greater than 0'),
  ],
  validate,
  (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;

    const index = inventory.findIndex(item => item.id === parseInt(id));

    if (index === -1) {
      return res.status(404).json({ message: 'Screen not found' });
    }

    // Actualizamos los campos validados
    inventory[index] = { ...inventory[index], name, price };

    console.log(`Updated screen ${id}:`, inventory[index]);
    res.json(inventory[index]);
  }
);

// DELETE: Eliminar un ítem de inventario por ID
app.delete(
  '/inventory/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')],
  validate,
  (req, res) => {
    const { id } = req.params;
    const initialLength = inventory.length;
    inventory = inventory.filter(item => item.id !== parseInt(id));

    if (inventory.length === initialLength) {
      return res.status(404).json({ message: 'Screen not found' });
    }

    res.status(204).send(); // 204 No Content: éxito sin devolver datos
  }
);

// POST: Agregar una nueva pantalla
app.post(
  '/inventory',
  [
    body('name').notEmpty().trim().escape().withMessage('Name is required'),
    body('location').notEmpty().trim().escape().withMessage('Location is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a number greater than 0'),
  ],
  validate,
  (req, res) => {
    const { name, location, price } = req.body;

    const newItem = {
      id: nextId++, // Usar el contador y luego incrementarlo
      name,
      location,
      price,
      status: 'Active' // Estado por defecto
    };

    inventory.push(newItem);
    res.status(201).json(newItem);
  }
);

// --- Middleware de Manejo de Errores Centralizado ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`SmartKit Server running at http://localhost:${PORT}`);
});