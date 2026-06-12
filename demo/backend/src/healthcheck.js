import http from 'node:http';

/**
 * Script de Healthcheck para Docker.
 * Realiza una petición GET al endpoint /api/health del servidor interno.
 */
const port = process.env.PORT || 8080;

const options = {
  host: 'localhost',
  port: port,
  path: '/api/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  const isOk = res.statusCode === 200;
  if (!isOk) {
    console.error(`Healthcheck falló: Status Code ${res.statusCode}`);
  }
  process.exit(isOk ? 0 : 1);
});

request.on('error', (err) => {
  console.error(`Healthcheck falló con error: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Healthcheck falló: Tiempo de espera agotado');
  request.destroy();
  process.exit(1);
});

request.end();