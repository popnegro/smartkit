import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createMediaKit, getMediaKit, listMediaKits, setMediaKitArchived } from '../services/mediaKits.js';
import { validate, schemas } from '../validators.js';

export const mediaKitsRouter = Router();

mediaKitsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    res.json({ mediaKits: await listMediaKits() });
  } catch (error) {
    next(error);
  }
});

mediaKitsRouter.post('/', requireAuth, validate(schemas.mediaKitCreate), async (req, res, next) => {
  try {
    res.status(201).json({ mediaKit: await createMediaKit(req.body) });
  } catch (error) {
    next(error);
  }
});

mediaKitsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json({ mediaKit: await getMediaKit(req.params.id) });
  } catch (error) {
    next(error);
  }
});

mediaKitsRouter.patch('/:id/archive', requireAuth, async (req, res, next) => {
  try {
    res.json({ mediaKit: await setMediaKitArchived(req.params.id, Boolean(req.body.archived)) });
  } catch (error) {
    next(error);
  }
});
