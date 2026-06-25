const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./auth');
const { config } = require('./config');
const crypto = require('crypto');
const screensService = require('./screens');
const kitsService = require('./kits');
const { screenSchema, mediaKitSchema } = require('./validators');

const router = express.Router();

// Middleware de validación de Zod
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ message: 'Error de validación', errors: error.errors });
  }
};

// Función auxiliar para canonicalizar y verificar HMAC en servidor
function verifySignature(kit, secret) {
  const { digitalSignature, ...content } = kit;
  if (!digitalSignature) return false;

  const payload = JSON.stringify(content, Object.keys(content).sort());
  const hmac = crypto.createHmac('sha256', secret || digitalSignature.signer)
                     .update(payload)
                     .digest('hex');
  return hmac === digitalSignature.value;
}

// --- Auth Routes ---
router.post('/auth/login', async (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'La contraseña es requerida.' });
  }

  try {
    // En un entorno real, buscarías el hash de la contraseña del usuario en una DB
    // Por ahora, usamos el ADMIN_PASSWORD_HASH del .env
    if (config.adminPasswordHash === '$2a$10$EjemploDeHashBcryptGeneradoConScript' && config.nodeEnv === 'production') {
        throw new Error('Inseguro: Se detectó hash por defecto en producción.');
    }

    const isMatch = await bcrypt.compare(password, config.adminPasswordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    const token = jwt.sign({ id: 'admin', role: 'admin' }, config.jwtSecret, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

// --- Signature Verification ---
router.post('/kits/verify', async (req, res, next) => {
  const { kit } = req.body;
  if (!kit) return res.status(400).json({ error: 'Kit data required' });
  
  try {
    const isValid = verifySignature(kit, config.signatureSecret);
    res.json({ 
      state: isValid ? 'valid' : 'invalid', 
      verifiedAt: new Date().toISOString() 
    });
  } catch (err) {
    next(err);
  }
});

// --- Screens Routes (Protected) ---
router.get('/screens', async (req, res, next) => {
  try {
    const screens = await screensService.listScreens();
    res.json(screens);
  } catch (error) {
    next(error);
  }
});

router.get('/screens/:id', async (req, res, next) => {
  try {
    const screen = await screensService.getScreenById(Number(req.params.id));
    if (!screen) {
      return res.status(404).json({ error: 'Pantalla no encontrada.' });
    }
    res.json(screen);
  } catch (error) {
    next(error);
  }
});

router.post('/screens', authMiddleware, validate(screenSchema), async (req, res, next) => {
  try {
    const newScreen = await screensService.createScreen(req.body);
    res.status(201).json(newScreen);
  } catch (error) {
    console.error('Error al crear pantalla:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear pantalla.' });
  }
});

router.put('/screens/:id', authMiddleware, validate(screenSchema), async (req, res, next) => {
  try {
    const updatedScreen = await screensService.updateScreen(Number(req.params.id), req.body);
    if (!updatedScreen) {
      return res.status(404).json({ error: 'Pantalla no encontrada para actualizar.' });
    }
    res.json(updatedScreen);
  } catch (error) {
    next(error);
  }
});

router.post('/screens/bulk', authMiddleware, async (req, res, next) => {
  try {
    // Assuming req.body is an array of screens to upsert
    const updatedScreens = await screensService.upsertScreens(req.body);
    res.json(updatedScreens);
  } catch (error) {
    console.error('Error al realizar upsert de pantallas:', error);
    res.status(500).json({ error: 'Error interno del servidor al realizar upsert de pantallas.' });
  }
});

// --- Media Kits Routes ---
router.post('/kits', authMiddleware, validate(mediaKitSchema), async (req, res, next) => {
  try {
    const savedKit = await kitsService.saveKit(req.body);
    res.status(201).json(savedKit);
  } catch (error) {
    console.error('Error al guardar media kit:', error);
    res.status(500).json({ error: 'Error interno del servidor al guardar media kit.' });
  }
});

router.get('/kits/:id', async (req, res, next) => {
  try {
    const kit = await kitsService.getKitById(req.params.id);
    if (!kit) {
      return res.status(404).json({ error: 'Media kit no encontrado.' });
    }
    res.json(kit);
  } catch (error) {
    console.error('Error al obtener media kit por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener media kit.' });
  }
});

module.exports = router;