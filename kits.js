const fs = require('node:fs/promises');
const path = require('node:path');
const { config } = require('./config');

const KITS_DIR = path.join(config.publicDir, 'data', 'kits');

async function ensureKitsDir() {
  await fs.mkdir(KITS_DIR, { recursive: true });
}

async function listKits() {
  await ensureKitsDir();
  const files = await fs.readdir(KITS_DIR);
  const kitFiles = files.filter(file => file.endsWith('.json'));
  const kits = await Promise.all(kitFiles.map(async (file) => {
    const content = await fs.readFile(path.join(KITS_DIR, file), 'utf-8');
    return JSON.parse(content);
  }));
  return kits;
}

async function getKitById(id) {
  await ensureKitsDir();
  const kitPath = path.join(KITS_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(kitPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function saveKit(kit) {
  await ensureKitsDir();
  const kitPath = path.join(KITS_DIR, `${kit.id}.json`);
  await fs.writeFile(kitPath, JSON.stringify(kit, null, 2));
  return kit;
}

module.exports = { listKits, getKitById, saveKit };