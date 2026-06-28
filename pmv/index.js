require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs'); // <-- Añadir el módulo File System
const path = require('path'); // <-- Añadir el módulo Path
const helmet = require('helmet'); // <-- Añadir Helmet
const { body, validationResult, param } = require('express-validator');
const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuración de Seguridad ---
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 'https://tu-dominio-frontend.com' : 'http://localhost:8080' // Ajusta el puerto si es necesario
};

// Middleware
app.use(helmet()); // Establece cabeceras de seguridad
app.use(cors(corsOptions)); // Configuración de CORS más restrictiva
app.use(express.json()); // Permite procesar JSON en el cuerpo de las peticiones

// --- Base de Datos Simulada con JSON ---
// En Vercel, __dirname apunta a /var/task/api, pero el archivo está en /var/task/
// Por eso, subimos un nivel para encontrar inventory.json
const DB_PATH = path.join(__dirname, '..', 'inventory.json');

// Función para leer la base de datos desde el archivo
const readDB = () => {
  if (!fs.existsSync(DB_PATH)) {
    // Si el archivo no existe, crea uno con datos iniciales.
    fs.writeFileSync(DB_PATH, JSON.stringify([{ id: 1, name: 'Lujan Central', location: 'Mendoza, AR', price: 45000, status: 'Active' }, { id: 2, name: 'Palmares Mall', location: 'Godoy Cruz', price: 62000, status: 'Active' }, { id: 3, name: 'Rivadavia Plaza', location: 'Mendoza, AR', price: 38000, status: 'Inactive' }]));
  }
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
};

// Función para escribir en la base de datos
const writeDB = (data) => {
  // En un entorno serverless de solo lectura como Vercel, esta operación fallará.
  // Para una demo, los cambios solo existirán en memoria durante la vida de la función.
  // No lanzamos un error para permitir que la demo funcione, aunque no persista.
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } catch (e) { console.warn('Could not write to DB file in this environment.'); }
};

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
  const inventory = readDB();
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
    let inventory = readDB();
    const { name, price } = req.body;

    const index = inventory.findIndex(item => item.id === parseInt(id));

    if (index === -1) {
      return res.status(404).json({ message: 'Screen not found' });
    }

    // Actualizamos los campos validados
    inventory[index] = { ...inventory[index], name, price };

    writeDB(inventory); // Guardar cambios en el archivo
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
    let inventory = readDB();
    const initialLength = inventory.length;
    inventory = inventory.filter(item => item.id !== parseInt(id));

    if (inventory.length === initialLength) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    
    writeDB(inventory); // Guardar cambios en el archivo
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
    let inventory = readDB();
    const { name, location, price } = req.body;

    // Encontrar el ID más alto y sumarle 1
    const nextId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
    
    const newItem = {
      id: nextId++, // Usar el contador y luego incrementarlo
      name,
      location,
      price,
      status: 'Active' // Estado por defecto
    };

    inventory.push(newItem);
    writeDB(inventory); // Guardar cambios en el archivo
    res.status(201).json(newItem);
  }
);

// --- Endpoint Simulado para Pagos ---
app.post('/payments/process', (req, res) => {
  console.log('Procesando pago simulado con datos:', req.body);

  // Simular un tiempo de procesamiento de la pasarela de pago
  setTimeout(() => {
    // En una demo, siempre devolvemos éxito.
    res.status(200).json({
      status: 'approved',
      message: 'Payment processed successfully (DEMO)',
    });
  }, 1500); // Espera 1.5 segundos
});
// --- Middleware de Manejo de Errores Centralizado ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Evitar filtrar detalles internos en producción
  const errorResponse = {
    message: process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message
  };
  res.status(500).json(errorResponse);
});

app.listen(PORT, () => {
  console.log(`SmartKit Server running at http://localhost:${PORT}`);
});

// Exportar la app para Vercel
module.exports = app;