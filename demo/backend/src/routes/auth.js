import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { config } from '../config.js';
import { signSession } from '../middleware/auth.js';
import { validate, schemas } from '../validators.js';
import { AppError } from '../utils/errors.js';

export const authRouter = Router();

authRouter.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const ok = config.adminPasswordHash && await bcrypt.compare(req.body.password, config.adminPasswordHash);
    if (req.body.email !== config.adminEmail || !ok) throw new AppError(401, 'Invalid credentials');
    const token = signSession({ email: config.adminEmail, role: 'admin' });
    res.cookie('sk_session', token, { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', maxAge: 8 * 60 * 60 * 1000 });
    res.json({ token, user: { email: config.adminEmail, role: 'admin' } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('sk_session');
  res.status(204).end();
});
