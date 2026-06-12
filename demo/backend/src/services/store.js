import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config.js';

const initialState = { screens: [], mediaKits: [] };

async function ensureFile() {
  await fs.mkdir(path.dirname(config.dataFile), { recursive: true });
  try {
    await fs.access(config.dataFile);
  } catch {
    await fs.writeFile(config.dataFile, JSON.stringify(initialState, null, 2));
  }
}

export async function readStore() {
  await ensureFile();
  const raw = await fs.readFile(config.dataFile, 'utf8');
  return { ...initialState, ...JSON.parse(raw || '{}') };
}

export async function writeStore(nextState) {
  await ensureFile();
  await fs.writeFile(config.dataFile, JSON.stringify(nextState, null, 2));
  return nextState;
}
