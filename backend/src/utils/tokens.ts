import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from '../middlewares/auth.middleware';

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

export function signRefreshToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}
