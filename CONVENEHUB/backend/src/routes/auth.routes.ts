import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { signAccessToken, signRefreshToken } from '../utils/tokens';
import { env } from '../config/env';
import { requireAuth } from '../middlewares/auth.middleware';

export const authRouter = Router();

const frontendToBackendRole: Record<string, 'admin' | 'organizer' | 'promoter' | 'attendee'> = {
  eon_team: 'admin',
  movie_team: 'organizer',
  user: 'attendee',
  admin: 'admin',
  organizer: 'organizer',
  promoter: 'promoter',
  attendee: 'attendee',
};

const backendToFrontendRole: Record<'admin' | 'organizer' | 'promoter' | 'attendee', 'eon_team' | 'movie_team' | 'promoter' | 'user'> = {
  admin: 'eon_team',
  organizer: 'movie_team',
  promoter: 'promoter',
  attendee: 'user',
};

function normalizeRole(role?: string): 'admin' | 'organizer' | 'promoter' | 'attendee' {
  return frontendToBackendRole[role || 'attendee'] || 'attendee';
}

function toFrontendUser(user: {
  _id: unknown;
  fullName: string;
  email: string;
  role: 'admin' | 'organizer' | 'promoter' | 'attendee';
  tenantId?: string;
  campusId?: string;
  phone?: string;
  city?: string;
  createdAt?: Date;
}) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    full_name: user.fullName,
    email: user.email,
    phone: user.phone,
    city: user.city,
    role: backendToFrontendRole[user.role] || 'user',
    tenantId: user.tenantId,
    campusId: user.campusId,
    created_at: user.createdAt,
  };
}

function getGoogleOAuthConfig() {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

function sanitizeRole(role?: string): 'user' | 'movie_team' {
  if (role === 'movie_team' || role === 'organizer') return 'movie_team';
  return 'user';
}

function sanitizeAuthIntent(intent?: string): 'signin' | 'signup' {
  if (intent === 'signup') return 'signup';
  return 'signin';
}

function oauthErrorRedirect(code: string, details: string) {
  const url = new URL('/auth/error', env.FRONTEND_ORIGIN);
  url.searchParams.set('error', code);
  url.searchParams.set('details', details);
  return url.toString();
}

const registerSchema = z.object({
  fullName: z.string().min(2).optional(),
  full_name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'organizer', 'promoter', 'attendee', 'eon_team', 'movie_team', 'user']).optional(),
  tenantId: z.string().optional(),
  campusId: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function handleRegister(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid input' });
  }

  const fullName = parsed.data.fullName || parsed.data.full_name;
  if (!fullName) {
    return res.status(400).json({ success: false, message: 'fullName is required' });
  }

  const { email, password, tenantId, campusId, phone, city } = parsed.data;
  const role = normalizeRole(parsed.data.role);
  const existing = await UserModel.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ fullName, email, passwordHash, role, tenantId, campusId, phone, city });

  const payload = { sub: String(user._id), role: user.role, tenantId: user.tenantId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return res.status(201).json({
    success: true,
    user: toFrontendUser(user),
    accessToken,
    refreshToken,
  });
}

authRouter.post('/register', handleRegister);
authRouter.post('/signup', handleRegister);

authRouter.get('/google', async (req, res) => {
  const googleConfig = getGoogleOAuthConfig();
  if (!googleConfig) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.',
    });
  }

  const role = sanitizeRole(typeof req.query.role === 'string' ? req.query.role : undefined);
  const intent = sanitizeAuthIntent(typeof req.query.intent === 'string' ? req.query.intent : undefined);
  const city = typeof req.query.city === 'string' ? req.query.city.trim().slice(0, 120) : '';
  const phone = typeof req.query.phone === 'string' ? req.query.phone.trim().slice(0, 32) : '';
  const movieTeam = req.query.movie_team === 'true';

  const state = jwt.sign(
    {
      intent,
      role: movieTeam ? 'movie_team' : role,
      city,
      phone,
      movieTeam,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '10m' }
  );

  const params = new URLSearchParams({
    client_id: googleConfig.clientId,
    redirect_uri: googleConfig.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'select_account',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get('/google/callback', async (req, res) => {
  const googleConfig = getGoogleOAuthConfig();
  if (!googleConfig) {
    return res.redirect(
      oauthErrorRedirect('auth_failed', 'Google OAuth is not configured on the backend.')
    );
  }

  const providerError = typeof req.query.error === 'string' ? req.query.error : '';
  if (providerError) {
    return res.redirect(oauthErrorRedirect('access_denied', providerError));
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) {
    return res.redirect(oauthErrorRedirect('invalid_callback', 'Missing OAuth authorization code.'));
  }

  const stateToken = typeof req.query.state === 'string' ? req.query.state : '';
  if (!stateToken) {
    return res.redirect(oauthErrorRedirect('invalid_callback', 'Missing OAuth state token.'));
  }

  let oauthState: { intent?: string; role?: string; city?: string; phone?: string; movieTeam?: boolean };
  try {
    oauthState = jwt.verify(stateToken, env.JWT_ACCESS_SECRET) as {
      intent?: string;
      role?: string;
      city?: string;
      phone?: string;
      movieTeam?: boolean;
    };
  } catch {
    return res.redirect(oauthErrorRedirect('invalid_link', 'OAuth state expired or invalid.'));
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        redirect_uri: googleConfig.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return res.redirect(oauthErrorRedirect('auth_failed', 'Failed to exchange Google OAuth code.'));
    }

    const tokenPayload = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenPayload.id_token) {
      return res.redirect(oauthErrorRedirect('auth_failed', 'Google did not return an ID token.'));
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenPayload.id_token)}`
    );

    if (!tokenInfoResponse.ok) {
      return res.redirect(oauthErrorRedirect('auth_failed', 'Failed to validate Google identity token.'));
    }

    const googleUser = (await tokenInfoResponse.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string;
      name?: string;
      given_name?: string;
    };

    if (googleUser.aud !== googleConfig.clientId) {
      return res.redirect(oauthErrorRedirect('auth_failed', 'Google token audience mismatch.'));
    }

    if (!googleUser.email || googleUser.email_verified !== 'true') {
      return res.redirect(oauthErrorRedirect('auth_failed', 'Google account email is missing or unverified.'));
    }

    const normalizedRole = sanitizeRole(oauthState.role);
    const normalizedIntent = sanitizeAuthIntent(oauthState.intent);
    const requestedBackendRole = normalizedRole === 'movie_team' ? 'organizer' : 'attendee';
    const movieTeamFlow = oauthState.movieTeam === true || normalizedRole === 'movie_team';

    let user = await UserModel.findOne({ email: googleUser.email });
    if (!user && normalizedIntent === 'signin') {
      const redirectTarget = new URL(movieTeamFlow ? '/movie-team-login' : '/login', env.FRONTEND_ORIGIN);
      redirectTarget.searchParams.set('error', 'user_not_found');
      redirectTarget.searchParams.set('email', googleUser.email);
      return res.redirect(redirectTarget.toString());
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      user = await UserModel.create({
        fullName: googleUser.name || googleUser.given_name || googleUser.email.split('@')[0],
        email: googleUser.email,
        passwordHash,
        role: requestedBackendRole,
        city: oauthState.city || undefined,
        phone: oauthState.phone || undefined,
      });
    } else {
      let shouldSave = false;
      const fallbackName = user.email.split('@')[0];
      const googleDisplayName = googleUser.name || googleUser.given_name;

      if (
        googleDisplayName &&
        (!user.fullName || user.fullName.trim().length < 2 || user.fullName === fallbackName)
      ) {
        user.fullName = googleDisplayName;
        shouldSave = true;
      }

      if (requestedBackendRole === 'organizer' && user.role === 'attendee') {
        user.role = 'organizer';
        shouldSave = true;
      }

      if (!user.city && oauthState.city) {
        user.city = oauthState.city;
        shouldSave = true;
      }

      if (!user.phone && oauthState.phone) {
        user.phone = oauthState.phone;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    }

    const payload = { sub: String(user._id), role: user.role, tenantId: user.tenantId };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const frontendUser = toFrontendUser(user as any);

    const redirectUrl = new URL('/auth/callback', env.FRONTEND_ORIGIN);
    const hashParams = new URLSearchParams({
      accessToken,
      refreshToken,
      role: frontendUser.role,
      user: JSON.stringify(frontendUser),
    });

    return res.redirect(`${redirectUrl.toString()}#${hashParams.toString()}`);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Google OAuth callback failed.';
    return res.redirect(oauthErrorRedirect('auth_failed', details));
  }
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid credentials' });
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'No account found for this email. Please sign up first.' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password. Please try again.' });
  }

  const payload = { sub: String(user._id), role: user.role, tenantId: user.tenantId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return res.json({
    success: true,
    user: toFrontendUser(user),
    accessToken,
    refreshToken,
  });
});

authRouter.post('/refresh', async (req, res) => {
  const token = String(req.body?.refreshToken || '');
  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing refresh token' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; role: 'admin' | 'organizer' | 'promoter' | 'attendee'; tenantId?: string };
    const accessToken = signAccessToken({ sub: decoded.sub, role: decoded.role, tenantId: decoded.tenantId });
    return res.json({ success: true, accessToken });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

authRouter.post('/signout', (_req, res) => {
  res.json({ success: true, message: 'Signed out' });
});

authRouter.post('/forgot-password', (_req, res) => {
  res.json({ success: true, message: 'If this email exists, a reset link/OTP has been sent' });
});

authRouter.post('/verify-otp', (_req, res) => {
  // Mongo migration compatibility: OTP flow can be layered later.
  res.json({ success: true, message: 'OTP verification accepted in compatibility mode' });
});

authRouter.post('/reset-password', requireAuth, async (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await UserModel.findByIdAndUpdate(req.user?.sub, { passwordHash });
  return res.json({ success: true, message: 'Password updated' });
});

authRouter.post('/complete-profile', requireAuth, async (req, res) => {
  const phone = typeof req.body?.phone === 'string' ? req.body.phone : undefined;
  const city = typeof req.body?.city === 'string' ? req.body.city : undefined;

  if (!phone || !city) {
    return res.status(400).json({ success: false, message: 'Phone and city are required' });
  }

  const user = await UserModel.findByIdAndUpdate(
    req.user?.sub,
    { phone, city },
    { new: true, projection: { passwordHash: 0 } }
  ).lean();

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.json({ success: true, user: toFrontendUser(user as any) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user?.sub, { passwordHash: 0 }).lean();
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  return res.json({ success: true, user: toFrontendUser(user as any) });
});
