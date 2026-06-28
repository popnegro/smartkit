require('dotenv').config(); // Carga las variables de entorno desde .env
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors()); // Permite peticiones desde otros dominios (tu index.html)
app.use(express.json()); // Permite al servidor entender JSON en el body de las peticiones

/*
================================================================
  SIMULACIÓN DE BASE DE DATOS EN MEMORIA
================================================================
*/

let db;

function initializeDatabase() {
  db = {
    screens: [
      {id:'sc-01',nombre:'Sarmiento y 9 de Julio',zona:'Centro',tipo:'Peatonal',impactos:14200,precio:95000,status:'Activo',lat:-32.8894,lng:-68.8458,nota:'Esquina comercial de máximo tránsito peatonal.'},
      {id:'sc-02',nombre:'Palmares Open Mall',zona:'Palmares',tipo:'Mixto',impactos:22500,precio:145000,status:'Activo',lat:-32.9121,lng:-68.8306,nota:'Acceso principal al shopping. Vehicular y peatonal.'},
      {id:'sc-03',nombre:'Las Heras y Mitre',zona:'Las Heras',tipo:'Peatonal',impactos:8800,precio:68000,status:'Activo',lat:-32.8716,lng:-68.8388,nota:'Zona comercial barrial. Alto tráfico local.'},
      {id:'sc-04',nombre:'Av. Aristides frente al Parque',zona:'Ciudad',tipo:'Vehicular',impactos:31000,precio:185000,status:'Activo',lat:-32.8908,lng:-68.8762,nota:'Avenida principal. Ideal autos y commuters.'},
      {id:'sc-05',nombre:'Guaymallén Centro',zona:'Guaymallén',tipo:'Peatonal',impactos:11400,precio:78000,status:'Activo',lat:-32.8955,lng:-68.8212,nota:'Centro comercial de Guaymallén.'},
      {id:'sc-06',nombre:'Maipú Ruta 7',zona:'Maipú',tipo:'Vehicular',impactos:19600,precio:112000,status:'Activo',lat:-32.9812,lng:-68.7757,nota:'Tránsito hacia bodegas y aeropuerto.'},
      {id:'sc-07',nombre:'Villanueva Gomensoro',zona:'Las Heras',tipo:'Mixto',impactos:9300,precio:72000,status:'Activo',lat:-32.8658,lng:-68.8415,nota:'Zona residencial-comercial en crecimiento.'},
      {id:'sc-08',nombre:'Godoy Cruz Belgrano',zona:'Godoy Cruz',tipo:'Vehicular',impactos:25800,precio:155000,status:'Activo',lat:-32.9246,lng:-68.8488,nota:'Corredor vehicular de alto volumen.'},
      {id:'sc-09',nombre:'Chacras de Coria Acceso',zona:'Luján',tipo:'Vehicular',impactos:16700,precio:125000,status:'Activo',lat:-33.0158,lng:-68.8642,nota:'Acceso a Chacras. Ideal turismo y bodegas.'},
      {id:'sc-10',nombre:'Terminal Buses Mendoza',zona:'Centro',tipo:'Peatonal',impactos:18400,precio:118000,status:'Activo',lat:-32.8868,lng:-68.8284,nota:'Alta rotación. Público diverso 24h.'},
    ],
    config: {
      brand: 'SmartKit',
      logo: 'SK',
      whatsapp: '5492616000000',
      heroTitle: 'Pantallas DOOH · Mendoza',
      terms: 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas creativas. Valores expresados en ARS. Propuesta válida por 15 días.',
    },
    kits: {},
    clients: {
      'cli-demo-1': { id: 'cli-demo-1', name: 'Bodega Catena Zapata', contact: 'Laura Catena', email: 'laura@catenazapata.com', phone: '5492614555666', createdAt: '2026-06-20T10:00:00.000Z', kitCount: 2 },
      'cli-demo-2': { id: 'cli-demo-2', name: 'Palmares Open Mall', contact: 'Marcos Galperin', email: 'marcos@palmares.com', phone: '5492614777888', createdAt: '2026-06-18T11:30:00.000Z', kitCount: 1 },
      'cli-demo-3': { id: 'cli-demo-3', name: 'Gobierno de Mendoza', contact: 'Alfredo Cornejo', email: 'cornejo@mendoza.gov.ar', phone: '5492614999000', createdAt: '2026-05-15T09:00:00.000Z', kitCount: 5 },
      'cli-demo-4': { id: 'cli-demo-4', name: 'Aeropuertos Argentina 2000', contact: 'Martín Eurnekian', email: 'martin@aa2000.com.ar', phone: '549114111222', createdAt: '2026-06-22T14:00:00.000Z', kitCount: 0 },
      'cli-demo-5': { id: 'cli-demo-5', name: 'Vistalba Food Trucks', contact: 'Juan Pérez', email: 'juan@vistalbafood.com', phone: '5492614333444', createdAt: '2026-06-25T18:00:00.000Z', kitCount: 3 }
    }
  };
  console.log('Base de datos en memoria inicializada.');
}

initializeDatabase();

/*
================================================================
  API ENDPOINTS
================================================================
*/

// --- PANTALLAS (Screens) ---

// GET /api/screens/all -> Devuelve todas las pantallas para el dashboard
app.get('/api/screens/all', (req, res) => {
  if (!db) initializeDatabase();
  res.json(db.screens);
});

// GET /api/screens -> Devuelve todas las pantallas para el brochure (antes solo activas)
app.get('/api/screens', (req, res) => {
  if (!db) initializeDatabase();
  res.json(db.screens);
});

// PUT /api/screens -> Actualiza una o más pantallas
app.put('/api/screens', (req, res) => {
  const screensToUpdate = req.body; // Se espera un array de pantallas
  if (!db) initializeDatabase();
  screensToUpdate.forEach(updatedScreen => {
    const index = db.screens.findIndex(s => s.id === updatedScreen.id);
    if (index !== -1) {
      db.screens[index] = { ...db.screens[index], ...updatedScreen };
    }
  });
  res.json({ message: `${screensToUpdate.length} pantalla(s) actualizada(s).` });
});

// POST /api/screens -> Crea una nueva pantalla
app.post('/api/screens', (req, res) => {
  const newScreenData = req.body;
  if (!newScreenData || !newScreenData.nombre) {
    return res.status(400).json({ message: 'El nombre de la pantalla es requerido.' });
  }
  if (!db) initializeDatabase();
  const newScreen = {
    id: 'sc-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    ...newScreenData,
  };
  db.screens.push(newScreen);
  res.status(201).json(newScreen);
});

// --- CONFIGURACIÓN (Config) ---

// GET /api/config -> Devuelve la configuración
app.get('/api/config', (req, res) => {
  if (!db) initializeDatabase();
  res.json(db.config);
});

// PUT /api/config -> Actualiza la configuración
app.put('/api/config', (req, res) => {
  const newConfig = req.body;
  if (!db) initializeDatabase();
  db.config = { ...db.config, ...newConfig };
  res.json({ message: 'Configuración actualizada.' });
});

// --- MEDIA KITS ---

// GET /api/kits -> Devuelve todos los kits
app.get('/api/kits', (req, res) => {
  if (!db) initializeDatabase();
  res.json(db.kits);
});

// GET /api/kits/:id -> Devuelve un kit específico
app.get('/api/kits/:id', (req, res) => {
  const { id } = req.params;
  if (!db) initializeDatabase();
  const kit = db.kits[id];
  if (kit) {
    res.json(kit);
  } else {
    res.status(404).json({ message: 'Kit no encontrado.' });
  }
});

// POST /api/kits -> Guarda un nuevo kit
app.post('/api/kits', (req, res) => {
  const kitData = req.body;
  if (!db) initializeDatabase();
  const newId = 'kit-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  const newKit = { ...kitData, id: newId };
  db.kits[newId] = newKit;
  res.status(201).json(newKit);
});

// PUT /api/kits/:id -> Actualiza un kit existente (ej: para archivar)
app.put('/api/kits/:id', (req, res) => {
  const { id } = req.params;
  const dataToUpdate = req.body;
  if (!db) initializeDatabase();
  if (db.kits[id]) {
    db.kits[id] = { ...db.kits[id], ...dataToUpdate };
    res.json(db.kits[id]);
  } else {
    res.status(404).json({ message: 'Kit no encontrado.' });
  }
});

// DELETE /api/kits/:id -> Elimina un kit
app.delete('/api/kits/:id', (req, res) => {
  const { id } = req.params;
  if (!db) initializeDatabase();
  if (db.kits[id]) {
    delete db.kits[id];
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Kit no encontrado.' });
  }
});

// --- CLIENTES (CRM) ---

// GET /api/clients -> Devuelve todos los clientes
app.get('/api/clients', (req, res) => {
  if (!db) initializeDatabase();
  res.json(Object.values(db.clients));
});

// POST /api/clients -> Crea un nuevo cliente
app.post('/api/clients', (req, res) => {
  const clientData = req.body;
  if (!clientData || !clientData.name) {
    return res.status(400).json({ message: 'El nombre del cliente es requerido.' });
  }
  if (!db) initializeDatabase();
  const newId = 'cli-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  const newClient = {
    id: newId,
    ...clientData,
    createdAt: new Date().toISOString(),
  };
  db.clients[newId] = newClient;
  res.status(201).json(newClient);
});

// Exportar la app para Vercel
module.exports = app;