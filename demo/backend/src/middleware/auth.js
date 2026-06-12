import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';

export function signSession(user) {
  return jwt.sign({ sub: user.email, role: user.role }, config.jwtSecret, { expiresIn: '8h' });
}

export function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.sk_session;
  if (!token) return next(new AppError(401, 'Authentication required'));
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired session'));
  }
}
