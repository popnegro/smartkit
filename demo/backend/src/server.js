import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertProductionConfig, config } from './config.js';
import { securityMiddleware } from './middleware/security.js';
import { authRouter } from './routes/auth.js';
import { screensRouter } from './routes/screens.js';
import { mediaKitsRouter } from './routes/mediaKits.js';
import { errorHandler, notFound } from './utils/errors.js';

assertProductionConfig();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../../..', config.publicDir);

securityMiddleware(app);
app.use(express.json({ limit: '1mb' }));

// Endpoint de salud utilizado por Docker Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true, env: config.nodeEnv }));

// Inyección de rutas (Asegúrate de que estos archivos existan en tu sistema de archivos)
if (authRouter) app.use('/api/auth', authRouter);
if (screensRouter) app.use('/api/screens', screensRouter);
if (mediaKitsRouter) app.use('/api/media-kits', mediaKitsRouter);

app.use(express.static(publicDir, { extensions: ['html'], maxAge: config.nodeEnv === 'production' ? '1h' : 0 }));
app.use('/api', notFound);
app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`SmartKit API listening on :${config.port}`);
});
