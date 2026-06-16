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

  // Verificación de integridad contra el esquema real del manifiesto
  console.log('🔍 Verificando integridad de /dist...');
  const manifestPath = path.join(DIST_DIR, 'production-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Combinamos entryPoints y assets para validar
    const expectedFiles = [...Object.values(manifest.entryPoints), ...manifest.assets];
    const missing = expectedFiles.filter(f => !fs.existsSync(path.join(DIST_DIR, f)));
    
    if (missing.length > 0) {
      console.error('❌ Error de integración: Faltan archivos definidos en el manifiesto:', missing);
      process.exit(1);
    }
    console.log('✅ Verificación exitosa: Todos los archivos críticos están presentes.');
  } else {
    console.warn('⚠️ No se encontró production-manifest.json para validación final.');
  }

  console.log('🚀 Build completado con éxito.');
}

build().catch(console.error);