import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { UPLOAD_DIR } from './config/cloudinary';
import { notFound, errorHandler } from './middleware/error';
import { apiLimiter, authLimiter, writeLimiter } from './middleware/rateLimit';

import authRoutes from './routes/authRoutes';
import listingRoutes from './routes/listingRoutes';
import commentRoutes from './routes/commentRoutes';
import messageRoutes from './routes/messageRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import claimRoutes from './routes/claimRoutes';

export function createApp() {
  const app = express();

  // Security headers. CSP is disabled (the SPA is served separately) and image
  // resources are allowed cross-origin so /uploads loads from the client origin.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  // Behind a proxy (Render/Vercel) so rate-limit sees the real client IP.
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  // Serve locally-stored images when Cloudinary isn't configured.
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, service: 'campusfind-api', time: new Date().toISOString() })
  );

  // Rate limiting: broad backstop everywhere, stricter on auth + writes.
  app.use('/api', apiLimiter);

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/listings', writeLimiter, listingRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/conversations', writeLimiter, messageRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/claims', writeLimiter, claimRoutes);

  app.use(notFound);
  app.use(errorHandler);

  // Keep `path` referenced for platforms that tree-shake aggressively.
  void path;
  return app;
}
