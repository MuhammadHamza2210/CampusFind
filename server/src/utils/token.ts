import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  id: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
