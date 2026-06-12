import dotenv from 'dotenv';

dotenv.config();

const required = ['JWT_SECRET'];

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  jwtSecret: process.env.JWT_SECRET || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@smartkit.local',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  dataFile: process.env.DATA_FILE || './backend/data/smartkit-db.json',
  publicDir: process.env.PUBLIC_DIR || './dist',
  signatureSecret: process.env.SIGNATURE_SECRET || ''
};

export function assertProductionConfig() {
  if (config.nodeEnv !== 'production') return;
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
  }
  if (!config.adminPasswordHash) {
    throw new Error('Missing ADMIN_PASSWORD_HASH for production admin login');
  }
}
