require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permite que tu frontend acceda a la API
app.use(express.json()); // Permite procesar JSON en el cuerpo de las peticiones

// Datos en memoria (Simulando una base de datos)
let inventory = [
  { id: 1, name: 'Lujan Central', location: 'Mendoza, AR', price: 45000, status: 'Active' },
  { id: 2, name: 'Palmares Mall', location: 'Godoy Cruz', price: 62000, status: 'Active' },
  { id: 3, name: 'Rivadavia Plaza', location: 'Mendoza, AR', price: 38000, status: 'Inactive' }
];

// GET: Obtener todo el inventario
app.get('/inventory', (req, res) => {
  res.json(inventory);
});

// PUT: Actualizar un ítem de inventario por ID
app.put('/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  
  const index = inventory.findIndex(item => item.id === parseInt(id));
  
  if (index !== -1) {
    // Actualizamos solo los campos permitidos
    inventory[index].name = name;
    inventory[index].price = price;
    
    console.log(`Updated screen ${id}:`, inventory[index]);
    res.json({ message: 'Success', item: inventory[index] });
  } else {
    res.status(404).json({ message: 'Screen not found' });
  }
});

// DELETE: Eliminar un ítem de inventario por ID
app.delete('/inventory/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = inventory.length;
  inventory = inventory.filter(item => item.id !== parseInt(id));

  if (inventory.length < initialLength) {
    res.json({ message: 'Screen deleted successfully' });
  } else {
    res.status(404).json({ message: 'Screen not found' });
  }
});

// POST: Ejemplo para agregar (opcional para tu botón "+ Add New Screen")
app.post('/inventory', (req, res) => {
  const newItem = {
    id: inventory.length + 1,
    name: req.body.name,
    location: req.body.location || 'Unknown',
    price: req.body.price,
    status: 'Active'
  };
  inventory.push(newItem);
  res.status(201).json(newItem);
});

app.listen(PORT, () => {
  console.log(`SmartKit Server running at http://localhost:${PORT}`);
});