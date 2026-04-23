import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomInt } from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { signAccessToken, signRefreshToken } from '../utils/tokens';
import { env } from '../config/env';
import { normalizeAuthRole, requireAuth } from '../middlewares/auth.middleware';
import { syncTenantRecord } from '../utils/tenants';

export const authRouter = Router();

function normalizeRole(role?: string): 'admin' | 'organizer' | 'promoter' | 'attendee' {
  return normalizeAuthRole(role);
}

function resolveTenantId(role: 'admin' | 'organizer' | 'promoter' | 'attendee', tenantId?: string) {
  const normalizedTenantId = tenantId?.trim();
  if (normalizedTenantId) {
    return normalizedTenantId;
  }

  if (role === 'admin' || role === 'organizer') {
    return 'default-tenant';
  }

  return undefined;
}

function toFrontendUser(user: {
  _id: unknown;
  fullName: string;
  email: string;
  role?: string;
  tenantId?: string;
  campusId?: string;
  phone?: string;
  city?: string;
  createdAt?: Date;
}) {
  const normalizedRole = normalizeRole(user.role);

  return {
    id: String(user._id),
    fullName: user.fullName,
    full_name: user.fullName,
    email: user.email,
    phone: user.phone,
    city: user.city,
    role: normalizedRole,
    canonical_role: normalizedRole,
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

function sanitizeRole(role?: string): 'attendee' | 'organizer' {
  if (role === 'organizer' || role === 'movie_team') return 'organizer';
  return 'attendee';
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
  role: z.enum(['admin', 'organizer', 'promoter', 'attendee', 'admin_team', 'movie_team', 'user']).optional(),
  tenantId: z.string().optional(),
  campusId: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const otpRequestSchema = z.object({
  email: z.string().email(),
  type: z.enum(['signup', 'email', 'recovery']).optional(),
  options: z
    .object({
      shouldCreateUser: z.boolean().optional(),
    })
    .optional(),
});

const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/).optional(),
  token: z.string().regex(/^\d{6}$/).optional(),
  type: z.enum(['signup', 'email', 'recovery']).optional(),
});

type OtpFlowType = 'signup' | 'email' | 'recovery';

let smtpTransporter: Transporter | null = null;

function isSmtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

function isSmtpSecure() {
  const secureRaw = (env.SMTP_SECURE || '').toLowerCase();
  return secureRaw === 'true' || secureRaw === '1' || env.SMTP_PORT === 465;
}

async function getSmtpTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (smtpTransporter) {
    return smtpTransporter;
  }

  smtpTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: isSmtpSecure(),
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  return smtpTransporter;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveOtpType(inputType?: string, shouldCreateUser?: boolean): OtpFlowType {
  if (inputType === 'signup' || inputType === 'email' || inputType === 'recovery') {
    return inputType;
  }
  return shouldCreateUser === false ? 'recovery' : 'signup';
}

function buildOtpHash(email: string, otp: string) {
  return createHash('sha256')
    .update(`${normalizeEmail(email)}:${otp}:${env.JWT_ACCESS_SECRET}`)
    .digest('hex');
}

function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function sendOtpEmail(email: string, otp: string, type: OtpFlowType) {
  const transporter = await getSmtpTransporter();
  if (!transporter) {
    return false;
  }

  const subject = type === 'recovery' ? 'CONVENEHUB password reset code' : 'CONVENEHUB verification code';
  const actionText = type === 'recovery' ? 'reset your password' : 'verify your account';

  await transporter.sendMail({
    from: env.SMTP_FROM_EMAIL || env.SMTP_USER,
    to: email,
    subject,
    text: `Your CONVENEHUB OTP is ${otp}. It expires in ${env.OTP_TTL_MINUTES} minutes. Use this to ${actionText}.`,
    html: `<p>Your CONVENEHUB OTP is <strong>${otp}</strong>.</p><p>This code expires in ${env.OTP_TTL_MINUTES} minutes.</p><p>Use this to ${actionText}.</p>`,
  });

  return true;
}

async function handleRegister(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid input' });
  }

  const fullName = parsed.data.fullName || parsed.data.full_name;
  if (!fullName) {
    return res.status(400).json({ success: false, message: 'fullName is required' });
  }

  const { password, tenantId, campusId, phone, city } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const role = normalizeRole(parsed.data.role);
  const resolvedTenantId = resolveTenantId(role, tenantId);
  const existing = await UserModel.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ fullName, email, passwordHash, role, tenantId: resolvedTenantId, campusId, phone, city });

  await syncTenantRecord({
    tenantId: resolvedTenantId,
    campusId,
    adminId: role === 'admin' ? String(user._id) : undefined,
    organizerId: role === 'organizer' ? String(user._id) : undefined,
  });

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
      role: movieTeam ? 'organizer' : role,
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
    const requestedBackendRole = normalizedRole === 'organizer' ? 'organizer' : 'attendee';
    const movieTeamFlow = oauthState.movieTeam === true || normalizedRole === 'organizer';

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
        tenantId: resolveTenantId(requestedBackendRole),
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
        user.tenantId = resolveTenantId('organizer', user.tenantId);
        shouldSave = true;
      }

      if (!user.tenantId && (user.role === 'admin' || user.role === 'organizer')) {
        user.tenantId = resolveTenantId(user.role, user.tenantId);
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

    await syncTenantRecord({
      tenantId: user.tenantId,
      campusId: user.campusId,
      adminId: user.role === 'admin' ? String(user._id) : undefined,
      organizerId: user.role === 'organizer' ? String(user._id) : undefined,
    });

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

  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'No account found for this email. Please sign up first.' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password. Please try again.' });
  }

  const normalizedRole = normalizeRole(user.role);
  const payload = { sub: String(user._id), role: normalizedRole, tenantId: user.tenantId };
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
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; role?: string; tenantId?: string };
    const accessToken = signAccessToken({
      sub: decoded.sub,
      role: normalizeRole(decoded.role),
      tenantId: decoded.tenantId,
    });
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

async function sendOtpHandler(req: Request, res: Response, forcedType?: OtpFlowType) {
  const parsed = otpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid OTP request' });
  }

  const email = normalizeEmail(parsed.data.email);
  const type = forcedType || resolveOtpType(parsed.data.type, parsed.data.options?.shouldCreateUser);
  const user = await UserModel.findOne({ email });

  if (!user) {
    if (type === 'recovery') {
      return res.json({ success: true, message: 'If this email exists, a verification code has been sent' });
    }
    return res.status(404).json({ success: false, message: 'No account found for this email. Please sign up first.' });
  }

  const otp = generateOtpCode();
  user.otpCodeHash = buildOtpHash(email, otp);
  user.otpType = type;
  user.otpExpiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000);
  await user.save();

  try {
    const sent = await sendOtpEmail(email, otp, type);
    if (!sent) {
      return res.status(500).json({
        success: false,
        message: 'SMTP is not configured on the backend. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM_EMAIL.',
      });
    }
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
  }

  return res.json({ success: true, message: 'OTP sent successfully' });
}

authRouter.post('/send-otp', async (req, res) => {
  return sendOtpHandler(req, res);
});

authRouter.post('/forgot-password', async (req, res) => {
  return sendOtpHandler(req, res, 'recovery');
});

authRouter.post('/verify-otp', async (req, res) => {
  const parsed = otpVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid OTP payload' });
  }

  const email = normalizeEmail(parsed.data.email);
  const otp = parsed.data.otp || parsed.data.token;
  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP code is required' });
  }

  const user = await UserModel.findOne({ email });
  if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
    return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    user.otpCodeHash = undefined;
    user.otpType = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    return res.status(401).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }

  const expectedHash = buildOtpHash(email, otp);
  if (user.otpCodeHash !== expectedHash) {
    return res.status(401).json({ success: false, message: 'Invalid OTP code' });
  }

  const effectiveType: OtpFlowType = parsed.data.type || user.otpType || 'signup';
  if (effectiveType !== 'recovery') {
    user.emailVerified = true;
  }

  user.otpCodeHash = undefined;
  user.otpType = undefined;
  user.otpExpiresAt = undefined;
  user.otpVerifiedAt = new Date();
  await user.save();

  const normalizedRole = normalizeRole(user.role);
  const payload = { sub: String(user._id), role: normalizedRole, tenantId: user.tenantId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const frontendUser = toFrontendUser(user);

  return res.json({
    success: true,
    message: 'OTP verified successfully',
    user: frontendUser,
    role: frontendUser.role,
    accessToken,
    refreshToken,
  });
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
  const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : undefined;
  const campusId = typeof req.body?.campusId === 'string' ? req.body.campusId.trim() : undefined;

  if (!phone || !city) {
    return res.status(400).json({ success: false, message: 'Phone and city are required' });
  }

  const currentUser = await UserModel.findById(req.user?.sub).lean();
  if (!currentUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const resolvedTenantId = resolveTenantId(normalizeRole(currentUser.role), tenantId || currentUser.tenantId);

  const user = await UserModel.findByIdAndUpdate(
    req.user?.sub,
    {
      phone,
      city,
      ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
      ...(campusId ? { campusId } : {}),
    },
    { new: true, projection: { passwordHash: 0 } }
  ).lean();

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  await syncTenantRecord({
    tenantId: user.tenantId,
    campusId: user.campusId,
    adminId: normalizeRole(user.role) === 'admin' ? String(user._id) : undefined,
    organizerId: normalizeRole(user.role) === 'organizer' ? String(user._id) : undefined,
  });

  return res.json({ success: true, user: toFrontendUser(user as any) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user?.sub, { passwordHash: 0 }).lean();
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const normalizedRole = normalizeRole(user.role);
  const accessToken = signAccessToken({
    sub: String(user._id),
    role: normalizedRole,
    tenantId: user.tenantId,
  });
  const refreshToken = signRefreshToken({
    sub: String(user._id),
    role: normalizedRole,
    tenantId: user.tenantId,
  });

  return res.json({
    success: true,
    user: toFrontendUser(user as any),
    accessToken,
    refreshToken,
  });
});
