const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');
const examplePath = path.join(__dirname, '.env.example');

async function runSetup() {
  console.log('\x1b[36m%s\x1b[0m', '🚀 SmartKit: Configuración de Producción');
  
  const password = await new Promise(resolve => {
    rl.question('Defina la contraseña para el Administrador: ', (ans) => {
      resolve(ans.trim());
    });
  });

  if (!password) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error: La contraseña no puede estar vacía.');
    process.exit(1);
  }

  console.log('Generando hashes y secretos...');
  const saltRounds = 10;
  const adminHash = bcrypt.hashSync(password, saltRounds);
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  const signatureSecret = crypto.randomBytes(64).toString('hex');

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    console.log('Actualizando archivo .env existente...');
  } else if (fs.existsSync(examplePath)) {
    envContent = fs.readFileSync(examplePath, 'utf-8');
    console.log('Creando .env a partir de .env.example...');
  } else {
    envContent = [
      'PORT=3000',
      'NODE_ENV=production',
      'JWT_SECRET=',
      'SIGNATURE_SECRET=',
      'ADMIN_PASSWORD_HASH=',
      'CORS_ORIGIN=http://localhost:3000',
      'DATA_PATH=./data'
    ].join('\n');
    console.log('Creando nuevo archivo .env...');
  }

  const config = {
    'JWT_SECRET': jwtSecret,
    'SIGNATURE_SECRET': signatureSecret,
    'ADMIN_PASSWORD_HASH': adminHash,
    'NODE_ENV': 'production'
  };

  let lines = envContent.split('\n');
  for (const key in config) {
    const index = lines.findIndex(line => line.startsWith(`${key}=`));
    if (index !== -1) {
      lines[index] = `${key}=${config[key]}`;
    } else {
      lines.push(`${key}=${config[key]}`);
    }
  }

  fs.writeFileSync(envPath, lines.join('\n').trim() + '\n');
  
  // Asegurar que la carpeta de datos existe
  const dataPath = path.join(__dirname, 'data', 'kits');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ ¡Listo! El archivo .env ha sido configurado con éxito.');
  console.log('Se han generado secretos robustos y se ha hasheado la contraseña.');
  rl.close();
}

runSetup().catch(err => {
  console.error('Error durante la configuración:', err);
  process.exit(1);
});