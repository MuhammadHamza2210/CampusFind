import { Request, Response } from 'express';
import { User, hashPassword, publicUser } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { signToken, generateOtp } from '../utils/token';
import { sendOtpEmail } from '../config/mailer';
import { env, cookieOptions } from '../config/env';

const OTP_TTL_MS = 10 * 60 * 1000;

function assertAllowedDomain(email: string) {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  // ALLOWED_EMAIL_DOMAIN may be a comma-separated list. Each entry matches the
  // domain itself OR any subdomain of it — so `bahria.edu.pk` also accepts
  // `student.bahria.edu.pk`, `faculty.bahria.edu.pk`, etc.
  const allowed = env.allowedEmailDomain
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const ok = allowed.some(
    (base) => domain === base || domain.endsWith(`.${base}`)
  );
  if (!ok) {
    throw ApiError.badRequest(
      `Please sign up with your university email (@${allowed.join(' or @')})`
    );
  }
}

/**
 * Issue a session token. We both set an httpOnly cookie (works for same-origin
 * / local dev) AND return the token in the body, so a cross-origin SPA can send
 * it back as `Authorization: Bearer …` — some hosts (e.g. Hugging Face Spaces)
 * proxy away credentialed CORS, which breaks cookie auth across domains.
 */
function issueToken(res: Response, userId: string): string {
  const token = signToken(userId);
  res.cookie('token', token, cookieOptions);
  return token;
}

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  assertAllowedDomain(email);

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.isVerified) throw ApiError.conflict('Email already registered');
    // Not verified yet — resend a fresh code instead of erroring out.
    existing.otpCode = generateOtp();
    existing.otpExpires = new Date(Date.now() + OTP_TTL_MS);
    await existing.save();
    await sendOtpEmail(email, existing.otpCode);
    return res.status(200).json({
      message: 'Account exists but is unverified — we sent a new code',
      needsVerification: true,
      email,
    });
  }

  const passwordHash = await hashPassword(password);
  const otpCode = generateOtp();
  const isAdmin = env.adminEmails.includes(email);

  await User.create({
    name,
    email,
    passwordHash,
    isAdmin,
    otpCode,
    otpExpires: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtpEmail(email, otpCode);

  res.status(201).json({
    message: 'Account created — check your email for a verification code',
    needsVerification: true,
    email,
  });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user) throw ApiError.notFound('Account not found');
  if (user.isVerified) throw ApiError.badRequest('Already verified — please log in');

  if (!user.otpCode || !user.otpExpires || user.otpExpires < new Date()) {
    throw ApiError.badRequest('Code expired — request a new one');
  }
  if (user.otpCode !== code) throw ApiError.badRequest('Incorrect code');

  user.isVerified = true;
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  const token = issueToken(res, user.id);
  res.json({ message: 'Email verified', user: publicUser(user), token });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user) throw ApiError.notFound('Account not found');
  if (user.isVerified) throw ApiError.badRequest('Already verified');

  user.otpCode = generateOtp();
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save();
  await sendOtpEmail(email, user.otpCode);

  res.json({ message: 'A new code is on its way' });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  if (!user.isVerified) {
    // Nudge the client into the verification flow.
    user.otpCode = generateOtp();
    user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save();
    await sendOtpEmail(email, user.otpCode);
    throw new ApiError(403, 'Please verify your email — we sent a fresh code', {
      needsVerification: true,
      email,
    });
  }

  const token = issueToken(res, user.id);
  res.json({ message: 'Welcome back', user: publicUser(user), token });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Logged out' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.user ? publicUser(req.user) : null });
});
