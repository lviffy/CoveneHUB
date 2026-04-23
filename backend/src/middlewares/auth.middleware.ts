import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

type CanonicalAuthRole = 'admin' | 'organizer' | 'promoter' | 'attendee';
type SupportedAuthRole = CanonicalAuthRole | 'admin_team' | 'movie_team' | 'user';

export interface AuthTokenPayload {
  sub: string;
  role: CanonicalAuthRole;
  tenantId?: string;
}

export function normalizeAuthRole(role?: string): CanonicalAuthRole {
  const roleMap: Record<SupportedAuthRole, CanonicalAuthRole> = {
    admin: 'admin',
    admin_team: 'admin',
    organizer: 'organizer',
    movie_team: 'organizer',
    promoter: 'promoter',
    attendee: 'attendee',
    user: 'attendee',
  };

  return roleMap[(role as SupportedAuthRole) || 'attendee'] || 'attendee';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Missing access token' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload & {
      sub?: string;
      role?: string;
      tenantId?: string;
    };

    if (!decoded.sub) {
      res.status(401).json({ success: false, message: 'Invalid access token' });
      return;
    }

    req.user = {
      sub: String(decoded.sub),
      role: normalizeAuthRole(decoded.role),
      tenantId: decoded.tenantId,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid access token' });
  }
}

export function requireRole(...allowedRoles: AuthTokenPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    next();
  };
}
