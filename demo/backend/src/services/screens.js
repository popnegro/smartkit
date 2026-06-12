import fs from 'node:fs/promises';
import { config } from '../config.js';

async function readDb() {
  try {
    const content = await fs.readFile(config.dataFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Si el archivo no existe o está corrupto, devolvemos estructura base
    return { rows: [], kits: [] };
  }
}

async function writeDb(data) {
  await fs.writeFile(config.dataFile, JSON.stringify(data, null, 2));
}

export async function listScreens() {
  const db = await readDb();
  return db.rows;
}

export async function getScreenById(id) {
  const db = await readDb();
  return db.rows.find(s => s.id === id);
}

export async function createScreen(screenData) {
  const db = await readDb();
  // Autoincrementar ID si no se proporciona uno válido
  const nextId = Math.max(0, ...db.rows.map(s => s.id)) + 1;
  const newScreen = { ...screenData, id: nextId };
  
  db.rows.push(newScreen);
  await writeDb(db);
  return newScreen;
}

export async function updateScreen(id, screenData) {
  const db = await readDb();
  const index = db.rows.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  db.rows[index] = { ...db.rows[index], ...screenData, id };
  await writeDb(db);
  return db.rows[index];
}

export async function deleteScreen(id) {
  const db = await readDb();
  const initialLength = db.rows.length;
  db.rows = db.rows.filter(s => s.id !== id);
  
  if (db.rows.length === initialLength) return null;
  
  await writeDb(db);
  return true;
}

export async function upsertScreens(screens) {
  const db = await readDb();
  // Reemplazo total de la colección de pantallas (patrón Bulk del Dashboard)
  db.rows = screens;
  await writeDb(db);
  return db.rows;
}