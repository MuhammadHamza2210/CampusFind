import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token';
import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

function extractToken(req: Request): string | null {
  if (req.cookies?.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Session expired, please sign in again');
    }

    const user = await User.findById(payload.id);
    if (!user) throw ApiError.unauthorized();
    if (!user.isVerified)
      throw ApiError.forbidden('Please verify your email first');

    req.user = user;
    next();
  }
);

export const requireAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.isAdmin) throw ApiError.forbidden('Admin access required');
    next();
  }
);

/** Attaches user if a valid token exists, but never rejects. */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (token) {
      try {
        const payload = verifyToken(token);
        const user = await User.findById(payload.id);
        if (user) req.user = user;
      } catch {
        /* ignore */
      }
    }
    next();
  }
);
