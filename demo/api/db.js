/**
 * db.js — Capa de persistencia usando Vercel Blob Storage
 *
 * Reemplaza la base de datos en memoria de index.js.
 * Cada colección se almacena como un JSON en Vercel Blob.
 *
 * INSTALACIÓN: npm install @vercel/blob
 */

const { put, get, list } = require('@vercel/blob');

// ── Datos iniciales (seed) ──────────────────────────────────────────────────
const INITIAL_SCREENS = [
  { id:'sc-01', nombre:'Sarmiento y 9 de Julio', zona:'Centro', tipo:'Peatonal', impactos:14200, precio:95000, status:'Activo', lat:-32.8894, lng:-68.8458, nota:'Esquina comercial de máximo tránsito peatonal.' },
  { id:'sc-02', nombre:'Palmares Open Mall', zona:'Palmares', tipo:'Mixto', impactos:22500, precio:145000, status:'Activo', lat:-32.9121, lng:-68.8306, nota:'Acceso principal al shopping. Vehicular y peatonal.' },
  { id:'sc-03', nombre:'Las Heras y Mitre', zona:'Las Heras', tipo:'Peatonal', impactos:8800, precio:68000, status:'Activo', lat:-32.8716, lng:-68.8388, nota:'Zona comercial barrial. Alto tráfico local.' },
  { id:'sc-04', nombre:'Av. Aristides frente al Parque', zona:'Ciudad', tipo:'Vehicular', impactos:31000, precio:185000, status:'Activo', lat:-32.8908, lng:-68.8762, nota:'Avenida principal. Ideal autos y commuters.' },
  { id:'sc-05', nombre:'Guaymallén Centro', zona:'Guaymallén', tipo:'Peatonal', impactos:11400, precio:78000, status:'Activo', lat:-32.8955, lng:-68.8212, nota:'Centro comercial de Guaymallén.' },
  { id:'sc-06', nombre:'Maipú Ruta 7', zona:'Maipú', tipo:'Vehicular', impactos:19600, precio:112000, status:'Activo', lat:-32.9812, lng:-68.7757, nota:'Tránsito hacia bodegas y aeropuerto.' },
  { id:'sc-07', nombre:'Villanueva Gomensoro', zona:'Las Heras', tipo:'Mixto', impactos:9300, precio:72000, status:'Activo', lat:-32.8658, lng:-68.8415, nota:'Zona residencial-comercial en crecimiento.' },
  { id:'sc-08', nombre:'Godoy Cruz Belgrano', zona:'Godoy Cruz', tipo:'Vehicular', impactos:25800, precio:155000, status:'Activo', lat:-32.9246, lng:-68.8488, nota:'Corredor vehicular de alto volumen.' },
  { id:'sc-09', nombre:'Chacras de Coria Acceso', zona:'Luján', tipo:'Vehicular', impactos:16700, precio:125000, status:'Activo', lat:-33.0158, lng:-68.8642, nota:'Acceso a Chacras. Ideal turismo y bodegas.' },
  { id:'sc-10', nombre:'Terminal Buses Mendoza', zona:'Centro', tipo:'Peatonal', impactos:18400, precio:118000, status:'Activo', lat:-32.8868, lng:-68.8284, nota:'Alta rotación. Público diverso 24h.' },
];

const INITIAL_CONFIG = {
  brand: 'SmartKit',
  logo: 'SK',
  whatsapp: '5492616000000',
  heroTitle: 'Pantallas DOOH · Mendoza',
  terms: 'Inicio de campaña sujeto a disponibilidad y aprobación de piezas creativas. Valores expresados en ARS. Propuesta válida por 15 días.',
  validityDays: 15,
};

const INITIAL_CLIENTS = {
  'cli-demo-1': { id:'cli-demo-1', name:'Bodega Catena Zapata', contact:'Laura Catena', email:'laura@catenazapata.com', phone:'5492614555666', createdAt:'2026-06-20T10:00:00.000Z' },
  'cli-demo-2': { id:'cli-demo-2', name:'Palmares Open Mall', contact:'Marcos Galperin', email:'marcos@palmares.com', phone:'5492614777888', createdAt:'2026-06-18T11:30:00.000Z' },
  'cli-demo-3': { id:'cli-demo-3', name:'Gobierno de Mendoza', contact:'Alfredo Cornejo', email:'cornejo@mendoza.gov.ar', phone:'5492614999000', createdAt:'2026-05-15T09:00:00.000Z' },
};

// ── Helpers de Blob ─────────────────────────────────────────────────────────
const BLOB_KEYS = {
  screens: 'smartkit/screens.json',
  config:  'smartkit/config.json',
  kits:    'smartkit/kits.json',
  clients: 'smartkit/clients.json',
};

/**
 * Lee un JSON desde Vercel Blob. Si no existe, inicializa con el valor por defecto.
 */
async function readBlob(key, defaultValue) {
  try {
    const { blobs } = await list({ prefix: key });
    if (!blobs.length) return defaultValue;

    // Vercel Blob devuelve una URL pública; fetcheamos el contenido
    const response = await fetch(blobs[0].url);
    if (!response.ok) return defaultValue;
    return await response.json();
  } catch (err) {
    console.error(`[db] Error leyendo ${key}:`, err.message);
    return defaultValue;
  }
}

/**
 * Escribe un valor JSON en Vercel Blob (overwrite).
 */
async function writeBlob(key, value) {
  const content = JSON.stringify(value, null, 2);
  await put(key, content, {
    access: 'public',           // Necesario para poder leerlo con fetch
    contentType: 'application/json',
    addRandomSuffix: false,     // Mantiene la misma URL/key
    allowOverwrite: true,       // Reemplaza el archivo existente
  });
}

// ── API pública del módulo ──────────────────────────────────────────────────

// SCREENS
async function getScreens() {
  return readBlob(BLOB_KEYS.screens, INITIAL_SCREENS);
}

async function saveScreens(screens) {
  await writeBlob(BLOB_KEYS.screens, screens);
}

async function updateScreens(updates) {
  const screens = await getScreens();
  const updatedScreens = screens.map(screen => {
    const update = updates.find(u => u.id === screen.id);
    return update ? { ...screen, ...update } : screen;
  });
  await saveScreens(updatedScreens);
  return updatedScreens;
}

async function addScreen(screenData) {
  const screens = await getScreens();
  const newScreen = {
    id: 'sc-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    status: 'Activo',
    ...screenData,
  };
  screens.push(newScreen);
  await saveScreens(screens);
  return newScreen;
}

// CONFIG
async function getConfig() {
  return readBlob(BLOB_KEYS.config, INITIAL_CONFIG);
}

async function saveConfig(updates) {
  const current = await getConfig();
  const merged = { ...current, ...updates };
  await writeBlob(BLOB_KEYS.config, merged);
  return merged;
}

// KITS
async function getKits() {
  return readBlob(BLOB_KEYS.kits, {});
}

async function getKit(id) {
  const kits = await getKits();
  return kits[id] || null;
}

async function addKit(kitData) {
  const kits = await getKits();
  const id = 'kit-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  const newKit = { ...kitData, id };
  kits[id] = newKit;
  await writeBlob(BLOB_KEYS.kits, kits);
  return newKit;
}

async function updateKit(id, updates) {
  const kits = await getKits();
  if (!kits[id]) return null;
  kits[id] = { ...kits[id], ...updates };
  await writeBlob(BLOB_KEYS.kits, kits);
  return kits[id];
}

async function deleteKit(id) {
  const kits = await getKits();
  if (!kits[id]) return false;
  delete kits[id];
  await writeBlob(BLOB_KEYS.kits, kits);
  return true;
}

// CLIENTS
async function getClients() {
  const clients = await readBlob(BLOB_KEYS.clients, INITIAL_CLIENTS);
  return Object.values(clients);
}

async function addClient(clientData) {
  const clientsMap = await readBlob(BLOB_KEYS.clients, INITIAL_CLIENTS);
  const id = 'cli-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  const newClient = { id, createdAt: new Date().toISOString(), ...clientData };
  clientsMap[id] = newClient;
  await writeBlob(BLOB_KEYS.clients, clientsMap);
  return newClient;
}

module.exports = {
  getScreens,
  saveScreens,
  updateScreens,
  addScreen,
  getConfig,
  saveConfig,
  getKits,
  getKit,
  addKit,
  updateKit,
  deleteKit,
  getClients,
  addClient,
};
