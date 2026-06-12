import fs from 'node:fs';
import path from 'node:path';

/**
 * Script de automatización para generar la carpeta /dist
 * Sincroniza los archivos del root necesarios para el despliegue estático.
 */
const DIST_DIR = path.resolve('dist');
const FILES_TO_COPY = [
  'index.html',
  'dashboard.html',
  'mediakit.html',
  'styles.css',
  'app.js',
  'shared.js',
  'mediakit.js',
  'config.js',
  'screens-data.js',
  'production-manifest.json',
  'readme.md'
];

const DIRS_TO_COPY = ['assets', 'data'];

async function build() {
  console.log('🏗️  Iniciando build de SmartKit...');

  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR);

  FILES_TO_COPY.forEach(file => {
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(DIST_DIR, file));
  });

  DIRS_TO_COPY.forEach(dir => {
    if (fs.existsSync(dir)) fs.cpSync(dir, path.join(DIST_DIR, dir), { recursive: true });
  });

  console.log('✅ Carpeta /dist generada exitosamente.');
}

build().catch(console.error);