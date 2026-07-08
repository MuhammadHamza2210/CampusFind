import dotenv from 'dotenv';

dotenv.config();

const bool = (v: string | undefined, fallback = false) =>
  v === undefined ? fallback : v.toLowerCase() === 'true';

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev_insecure_secret_change_me',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusfind',

  allowedEmailDomain: (process.env.ALLOWED_EMAIL_DOMAIN || 'bahria.edu.pk')
    .toLowerCase()
    .trim(),
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    get enabled() {
      return Boolean(this.cloudName && this.apiKey && this.apiSecret);
    },
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'CampusFind <no-reply@campusfind.app>',
    get enabled() {
      return Boolean(this.host && this.user && this.pass);
    },
  },

  isProd: process.env.NODE_ENV === 'production',
};

export const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: (env.cookieSecure ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
