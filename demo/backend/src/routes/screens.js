import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  listScreens, 
  getScreenById, 
  createScreen, 
  updateScreen, 
  deleteScreen, 
  upsertScreens 
} from '../services/screens.js';
import { validate, schemas } from '../validators.js';

export const screensRouter = Router();

/**
 * @route GET /api/screens
 * @desc Listar todo el inventario
 */
screensRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ screens: await listScreens() });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/screens/:id
 */
screensRouter.get('/:id', async (req, res, next) => {
  try {
    const screen = await getScreenById(Number(req.params.id));
    if (!screen) return res.status(404).json({ error: 'Pantalla no encontrada' });
    res.json(screen);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/screens
 */
screensRouter.post('/', requireAuth, validate(schemas.screenCreate), async (req, res, next) => {
  try {
    const newScreen = await createScreen(req.body);
    res.status(201).json(newScreen);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/screens/:id
 */
screensRouter.patch('/:id', requireAuth, validate(schemas.screenUpdate), async (req, res, next) => {
  try {
    const updated = await updateScreen(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Pantalla no encontrada' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/screens/:id
 */
screensRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await deleteScreen(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Pantalla no encontrada' });
    res.json({ success: true, message: 'Pantalla eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/screens
 * @desc Bulk Upsert para el Dashboard (mantiene compatibilidad)
 */
screensRouter.put('/', requireAuth, validate(schemas.screensUpsert), async (req, res, next) => {
  try {
    res.json({ screens: await upsertScreens(req.body.screens) });
  } catch (error) {
    next(error);
  }
});
