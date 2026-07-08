import rateLimit from 'express-rate-limit';

/** Broad limiter for the whole API — generous, just a flood backstop.
 *  Headroom left for the client's realtime polling fallback across tabs. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests — please slow down and try again shortly.' },
});

/** Strict limiter for auth endpoints to blunt brute-force / signup spam. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
  message: {
    message: 'Too many attempts — please wait a few minutes before trying again.',
  },
});

/** Limiter for content creation (listings, comments, messages).
 *  Only counts mutating requests — reads/browsing are covered by apiLimiter. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD',
  message: { message: "You're posting too fast — take a short break." },
});
