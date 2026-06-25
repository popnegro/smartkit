require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { assertProductionConfig } = require('./config');

// Validar configuración antes de arrancar
assertProductionConfig();

const apiRoutes = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad y Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://cdnjs.cloudflare.com", "https://esm.run"],
            "img-src": ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://cdnjs.cloudflare.com"],
            "connect-src": ["'self'"]
        }
    }
}));

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('combined'));

// Rate Limiting para evitar ataques de fuerza bruta
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Endpoint de Salud (Health Check)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        env: config.nodeEnv
    });
});

// Rutas de API
app.use('/api', apiRoutes);

// Servir Frontend (Archivos estáticos)
app.use(express.static(__dirname));

// Middleware de manejo de errores global (Centralizado)
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error(`[ERROR] ${new Date().toISOString()}:`, err.stack);
    
    res.status(err.status || 500).json({
        error: isProduction ? 'Error interno del servidor' : err.message,
        code: err.code || 'INTERNAL_SERVER_ERROR'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 SmartKit corriendo en http://localhost:${PORT}`);
    console.log(`🔐 Modo: ${process.env.NODE_ENV || 'development'}`);
});