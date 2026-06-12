import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { readStore, writeStore } from './store.js';
import { AppError } from '../utils/errors.js';

/**
 * Genera una representación canónica del objeto para asegurar que el hash 
 * sea consistente independientemente del orden de las propiedades en el JSON.
 */
function canonicalKit(kit) {
  const { digitalSignature, ...payload } = kit;
  return JSON.stringify(payload, Object.keys(payload).sort());
}

/**
 * Firma el Media Kit utilizando HMAC-SHA256 para prevenir manipulaciones.
 */
export function signKit(kit) {
  if (!config.signatureSecret) return { state: 'unsigned' };
  const hash = crypto.createHash('sha256').update(canonicalKit(kit)).digest('hex');
  const value = crypto.createHmac('sha256', config.signatureSecret).update(hash).digest('hex');
  return { 
    state: 'valid', 
    signer: 'SmartKit API', 
    algorithm: 'HMAC-SHA256', 
    signedAt: new Date().toISOString(), 
    hash, 
    value 
  };
}

export async function listMediaKits() {
  const store = await readStore();
  return store.mediaKits || [];
}

export async function createMediaKit(payload) {
  const store = await readStore();
  const kit = {
    ...payload,
    id: payload.id || `kit-${nanoid(10)}`,
    status: payload.status || 'Borrador',
    archived: false,
    createdAt: payload.createdAt || new Date().toISOString()
  };

  kit.digitalSignature = signKit(kit);
  
  if (!store.mediaKits) store.mediaKits = [];
  store.mediaKits = [kit, ...store.mediaKits.filter(item => item.id !== kit.id)];
  
  await writeStore(store);
  return kit;
}

export async function getMediaKit(id) {
  const store = await readStore();
  const kit = store.mediaKits?.find(item => item.id === id);
  if (!kit) throw new AppError(404, 'Media Kit no encontrado');
  return kit;
}

export async function setMediaKitArchived(id, archived) {
  const store = await readStore();
  let found = false;
  store.mediaKits = (store.mediaKits || []).map(kit => {
    if (kit.id !== id) return kit;
    found = true;
    return { ...kit, archived, archivedAt: archived ? new Date().toISOString() : null };
  });
  if (!found) throw new AppError(404, 'Media Kit no encontrado');
  await writeStore(store);
  return store.mediaKits.find(kit => kit.id === id);
}
