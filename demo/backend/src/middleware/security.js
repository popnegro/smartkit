import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export function securityMiddleware(app) {
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://cdnjs.cloudflare.com", "https://esm.run"],
        "style-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        "img-src": ["'self'", "data:", "https:"],
        "media-src": ["'self'", "https:"],
        "connect-src": ["'self'", "https:"],
        "frame-ancestors": ["'none'"]
      }
    }
  }));
  app.use(cors({
    origin: config.corsOrigin.split(',').map(item => item.trim()),
    credentials: true
  }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
  app.use(compression());
  app.use(cookieParser());
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}
