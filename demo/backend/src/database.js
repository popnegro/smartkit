import Database from 'better-sqlite3';
import { config } from './config.js';

let db = null;

export function getDb() {
  if (db) return db;

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL'); // Optimización de rendimiento

  // Inicializar esquema
  db.exec(`
    CREATE TABLE IF NOT EXISTS screens (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'Activo'
    );

    CREATE TABLE IF NOT EXISTS mediakits (
      id TEXT PRIMARY KEY,
      client TEXT,
      total REAL,
      data TEXT NOT NULL,
      archived INTEGER DEFAULT 0
    );
  `);

  return db;
}