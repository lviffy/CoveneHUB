import 'dotenv/config';

import { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';

import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/db';
import { env } from '../src/config/env';
import { UserModel } from '../src/models/User';
import { EventModel } from '../src/models/Event';
import { BookingModel } from '../src/models/Booking';
import { TicketModel } from '../src/models/Ticket';
import { CheckInModel } from '../src/models/CheckIn';
import { ReferralLinkModel } from '../src/models/ReferralLink';
import { CommissionModel } from '../src/models/Commission';
import { AttendeeModel } from '../src/models/Attendee';
import { TenantModel } from '../src/models/Tenant';

type SmokeResult = {
  name: string;
  method: string;
  path: string;
  status: number;
  ok: boolean;
  details?: string;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: any;
};

const runId = `smoke-${Date.now()}`;
const password = 'SmokeTest@123';
const resetPassword = 'ResetSmoke@123';

const createdIds = {
  userIds: new Set<string>(),
  eventIds: new Set<string>(),
  bookingIds: new Set<string>(),
  ticketIds: new Set<string>(),
  tenantIds: new Set<string>(),
};

const results: SmokeResult[] = [];

let server: Server | null = null;
let baseUrl = '';

function buildOtpHash(email: string, otp: string) {
  return createHash('sha256')
    .update(`${email.trim().toLowerCase()}:${otp}:${env.JWT_ACCESS_SECRET}`)
    .digest('hex');
}

async function startServer() {
  await connectDatabase(env.MONGODB_URI);
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server!.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopServer() {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server!.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function callApi<T = any>(
  name: string,
  method: string,
  path: string,
  options?: {
    token?: string;
    body?: unknown;
    expectedStatuses?: number[];
    redirect?: RequestRedirect;
  }
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    redirect: options?.redirect || 'follow',
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  const expectedStatuses = options?.expectedStatuses || [200];
  const ok = expectedStatuses.includes(response.status);
  results.push({
    name,
    method,
    path,
    status: response.status,
    ok,
    details: ok ? undefined : JSON.stringify(payload),
  });

  return { response, payload: payload as T, ok };
}

async function registerUser(role: 'admin' | 'organizer' | 'promoter' | 'attendee', variant: 'register' | 'signup') {
  const email = `${role}.${runId}@example.com`;
  const endpoint = variant === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/register';
  const result = await callApi<{ accessToken: string; refreshToken: string; user: any }>(
    `${variant} ${role}`,
    'POST',
    endpoint,
    {
      expectedStatuses: [201],
      body: {
        fullName: `${role} ${runId}`,
        email,
        password,
        role,
        city: 'Vijayawada',
        phone: '9876543210',
      },
    }
  );

  if (!result.ok) {
    throw new Error(`Failed to create ${role}`);
  }

  const { accessToken, refreshToken, user } = result.payload;
  createdIds.userIds.add(user.id);

  return { email, accessToken, refreshToken, user } satisfies AuthSession & { email: string };
}

async function cleanup() {
  if (createdIds.ticketIds.size > 0) {
    await TicketModel.deleteMany({ _id: { $in: Array.from(createdIds.ticketIds) } });
  }

  if (createdIds.bookingIds.size > 0) {
    await BookingModel.deleteMany({ _id: { $in: Array.from(createdIds.bookingIds) } });
  }

  if (createdIds.eventIds.size > 0) {
    await EventModel.deleteMany({ _id: { $in: Array.from(createdIds.eventIds) } });
  }

  if (createdIds.userIds.size > 0) {
    await CheckInModel.deleteMany({
      $or: [
        { attendeeId: { $in: Array.from(createdIds.userIds) } },
        { scannedBy: { $in: Array.from(createdIds.userIds) } },
      ],
    });
    await CommissionModel.deleteMany({ promoterId: { $in: Array.from(createdIds.userIds) } });
    await ReferralLinkModel.deleteMany({ promoterId: { $in: Array.from(createdIds.userIds) } });
    await AttendeeModel.deleteMany({ attendeeId: { $in: Array.from(createdIds.userIds) } });
    await UserModel.deleteMany({ _id: { $in: Array.from(createdIds.userIds) } });
  }

  if (createdIds.tenantIds.size > 0) {
    await TenantModel.deleteMany({ tenantId: { $in: Array.from(createdIds.tenantIds) } });
  }
}

async function purgePreviousSmokeData() {
  const smokeUsers = await UserModel.find({ email: /\.smoke-\d+@example\.com$/ }).select('_id').lean();
  const userIds = smokeUsers.map((user: any) => String(user._id));
  const smokeEvents = await EventModel.find({ title: /Smoke Event|Admin Event/ }).select('_id').lean();
  const eventIds = smokeEvents.map((event: any) => String(event._id));

  await Promise.all([
    CheckInModel.deleteMany({ $or: [{ attendeeId: { $in: userIds } }, { scannedBy: { $in: userIds } }, { eventId: { $in: eventIds } }] }),
    CommissionModel.deleteMany({ $or: [{ promoterId: { $in: userIds } }, { eventId: { $in: eventIds } }] }),
    ReferralLinkModel.deleteMany({ $or: [{ promoterId: { $in: userIds } }, { eventId: { $in: eventIds } }] }),
    AttendeeModel.deleteMany({ $or: [{ attendeeId: { $in: userIds } }, { eventId: { $in: eventIds } }] }),
    TicketModel.deleteMany({ $or: [{ attendeeId: { $in: userIds } }, { eventId: { $in: eventIds } }] }),
    BookingModel.deleteMany({ $or: [{ attendeeId: { $in: userIds } }, { eventId: { $in: eventIds } }] }),
    EventModel.deleteMany({ _id: { $in: eventIds } }),
    UserModel.deleteMany({ _id: { $in: userIds } }),
    TenantModel.deleteMany({ tenantId: /^smoke-.*-tenant$/ }),
  ]);
}

async function main() {
  await startServer();
  await purgePreviousSmokeData();

  const organizer = await registerUser('organizer', 'register');
  const attendee = await registerUser('attendee', 'register');
  const promoter = await registerUser('promoter', 'signup');
  const admin = await registerUser('admin', 'register');

  await callApi('root', 'GET', '/', { expectedStatuses: [200] });
  await callApi('health', 'GET', '/api/v1/health', { expectedStatuses: [200] });

  await callApi('auth google', 'GET', '/api/v1/auth/google?role=attendee&intent=signin', {
    expectedStatuses: [302],
    redirect: 'manual',
  });
  await callApi('auth google callback', 'GET', '/api/v1/auth/google/callback', {
    expectedStatuses: [302],
    redirect: 'manual',
  });

  const loginResult = await callApi<{ accessToken: string; refreshToken: string; user: any }>(
    'auth login attendee',
    'POST',
    '/api/v1/auth/login',
    {
      expectedStatuses: [200],
      body: { email: attendee.email, password },
    }
  );

  await callApi('auth refresh', 'POST', '/api/v1/auth/refresh', {
    expectedStatuses: [200],
    body: { refreshToken: loginResult.payload.refreshToken },
  });

  await callApi('auth logout', 'POST', '/api/v1/auth/logout', { expectedStatuses: [200] });
  await callApi('auth signout', 'POST', '/api/v1/auth/signout', { expectedStatuses: [200] });

  await callApi('auth send-otp', 'POST', '/api/v1/auth/send-otp', {
    expectedStatuses: [200, 500],
    body: { email: attendee.email, type: 'signup' },
  });
  await callApi('auth forgot-password', 'POST', '/api/v1/auth/forgot-password', {
    expectedStatuses: [200, 500],
    body: { email: attendee.email },
  });

  const otp = '123456';
  await UserModel.updateOne(
    { email: attendee.email },
    {
      $set: {
        otpCodeHash: buildOtpHash(attendee.email, otp),
        otpType: 'signup',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    }
  );

  const verifyOtpResult = await callApi<{ accessToken: string }>('auth verify-otp', 'POST', '/api/v1/auth/verify-otp', {
    expectedStatuses: [200],
    body: { email: attendee.email, otp, type: 'signup' },
  });

  await callApi('auth reset-password', 'POST', '/api/v1/auth/reset-password', {
    token: verifyOtpResult.payload.accessToken,
    expectedStatuses: [200],
    body: { password: resetPassword },
  });

  const relogin = await callApi<{ accessToken: string }>('auth login reset password', 'POST', '/api/v1/auth/login', {
    expectedStatuses: [200],
    body: { email: attendee.email, password: resetPassword },
  });

  await callApi('auth complete-profile', 'POST', '/api/v1/auth/complete-profile', {
    token: promoter.accessToken,
    expectedStatuses: [200],
    body: {
      phone: '9999999999',
      city: 'Hyderabad',
    },
  });

  await callApi('auth me', 'GET', '/api/v1/auth/me', {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });

  await callApi('events list initial', 'GET', '/api/v1/events', { expectedStatuses: [200] });
  await callApi('events public initial', 'GET', '/api/v1/events/public', { expectedStatuses: [200] });

  const organizerEvent = await callApi<{ event: any }>('events create organizer', 'POST', '/api/v1/events', {
    token: organizer.accessToken,
    expectedStatuses: [201],
    body: {
      title: `Smoke Event ${runId}`,
      description: 'Primary smoke test event',
      venue: 'Main Auditorium',
      city: 'Hyderabad',
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 50,
      status: 'published',
      ticketTiers: [
        { name: 'General', price: 499, quantity: 30 },
        { name: 'VIP', price: 999, quantity: 20 },
      ],
    },
  });
  createdIds.eventIds.add(organizerEvent.payload.event._id);

  const adminEvent = await callApi<{ event: any }>('events create admin', 'POST', '/api/v1/events', {
    token: admin.accessToken,
    expectedStatuses: [201],
    body: {
      title: `Admin Event ${runId}`,
      description: 'Secondary event for delete test',
      venue: 'Hall B',
      city: 'Chennai',
      dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 20,
      status: 'draft',
      ticketTiers: [{ name: 'General', price: 299, quantity: 20 }],
    },
  });
  createdIds.eventIds.add(adminEvent.payload.event._id);

  await callApi('events list', 'GET', '/api/v1/events', { expectedStatuses: [200] });
  await callApi('events public', 'GET', '/api/v1/events/public', { expectedStatuses: [200] });
  await callApi('events get by id', 'GET', `/api/v1/events/${organizerEvent.payload.event._id}`, { expectedStatuses: [200] });
  await callApi('events patch', 'PATCH', `/api/v1/events/${organizerEvent.payload.event._id}`, {
    token: organizer.accessToken,
    expectedStatuses: [200],
    body: {
      description: 'Updated smoke event description',
      city: 'Bengaluru',
    },
  });

  const promoterLink = await callApi<{ link: any }>('promoter create link', 'POST', '/api/v1/promoters/links', {
    token: promoter.accessToken,
    expectedStatuses: [201, 200],
    body: { eventId: organizerEvent.payload.event._id },
  });

  await callApi('promoter list links', 'GET', '/api/v1/promoters/links', {
    token: promoter.accessToken,
    expectedStatuses: [200],
  });

  const attendeeBooking = await callApi<{ booking: any; ticketIds: string[] }>('booking create referred', 'POST', '/api/v1/bookings', {
    token: relogin.payload.accessToken,
    expectedStatuses: [201],
    body: {
      eventId: organizerEvent.payload.event._id,
      tierName: 'General',
      ticketsCount: 2,
      referralCode: promoterLink.payload.link.code,
    },
  });
  createdIds.bookingIds.add(attendeeBooking.payload.booking._id);
  attendeeBooking.payload.ticketIds.forEach((ticketId) => createdIds.ticketIds.add(ticketId));

  await callApi('bookings list', 'GET', '/api/v1/bookings', {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });
  await callApi('bookings me', 'GET', '/api/v1/bookings/me', {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });

  const bookingTickets = await callApi<{ tickets: Array<{ ticket_id: string }> }>('booking tickets', 'GET', `/api/v1/bookings/${attendeeBooking.payload.booking._id}/tickets`, {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });

  await callApi('booking qr', 'GET', `/api/v1/bookings/${attendeeBooking.payload.booking._id}/qr`, {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });
  await callApi('booking get by id', 'GET', `/api/v1/bookings/${attendeeBooking.payload.booking._id}`, {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });

  await callApi('ticket qr', 'GET', `/api/v1/tickets/${bookingTickets.payload.tickets[0].ticket_id}/qr`, {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });

  const fullTickets = await TicketModel.find({ bookingId: attendeeBooking.payload.booking._id }).sort({ createdAt: 1 }).lean();
  fullTickets.forEach((ticket) => createdIds.ticketIds.add(String(ticket._id)));

  await callApi('checkin qr', 'POST', '/api/v1/checkins/qr', {
    token: organizer.accessToken,
    expectedStatuses: [200],
    body: { qrPayload: fullTickets[0].qrPayload },
  });

  await callApi('checkin manual', 'POST', '/api/v1/checkins/manual', {
    token: organizer.accessToken,
    expectedStatuses: [200],
    body: { ticketId: String(fullTickets[1]._id) },
  });

  await callApi('checkins by event', 'GET', `/api/v1/checkins/event/${organizerEvent.payload.event._id}`, {
    token: organizer.accessToken,
    expectedStatuses: [200],
  });

  await callApi('analytics event', 'GET', `/api/v1/analytics/event/${organizerEvent.payload.event._id}`, {
    token: organizer.accessToken,
    expectedStatuses: [200],
  });
  await callApi('analytics organizer', 'GET', `/api/v1/analytics/organizer/${organizer.user.id}`, {
    token: organizer.accessToken,
    expectedStatuses: [200],
  });

  await callApi('promoter performance', 'GET', '/api/v1/promoters/performance', {
    token: promoter.accessToken,
    expectedStatuses: [200],
  });
  await callApi('promoter commissions', 'GET', '/api/v1/promoters/commissions', {
    token: promoter.accessToken,
    expectedStatuses: [200],
  });
  await callApi('analytics promoter', 'GET', `/api/v1/analytics/promoter/${promoter.user.id}`, {
    token: promoter.accessToken,
    expectedStatuses: [200],
  });

  await callApi('admin tenants', 'GET', '/api/v1/admin/tenants', {
    token: admin.accessToken,
    expectedStatuses: [200],
  });

  const tenantId = `${runId}-tenant`;
  createdIds.tenantIds.add(tenantId);
  await callApi('admin create tenant', 'POST', '/api/v1/admin/tenants', {
    token: admin.accessToken,
    expectedStatuses: [201],
    body: {
      tenantId,
      name: `Tenant ${runId}`,
      campusId: 'campus-a',
      adminId: admin.user.id,
      organizerIds: [organizer.user.id],
    },
  });

  await callApi('admin update tenant', 'PATCH', `/api/v1/admin/tenants/${tenantId}`, {
    token: admin.accessToken,
    expectedStatuses: [200],
    body: {
      name: `Tenant ${runId} Updated`,
      organizerIds: [organizer.user.id],
    },
  });

  await callApi('admin users', 'GET', '/api/v1/admin/users', {
    token: admin.accessToken,
    expectedStatuses: [200],
  });

  await callApi('admin financial summary', 'GET', '/api/v1/admin/financial-summary', {
    token: admin.accessToken,
    expectedStatuses: [200],
  });

  await callApi('admin reconciliation', 'GET', '/api/v1/admin/reconciliation', {
    token: admin.accessToken,
    expectedStatuses: [200],
  });

  const cancelBooking = await callApi<{ booking: any; ticketIds: string[] }>('booking create cancel target', 'POST', '/api/v1/bookings', {
    token: relogin.payload.accessToken,
    expectedStatuses: [201],
    body: {
      eventId: organizerEvent.payload.event._id,
      tierName: 'VIP',
      ticketsCount: 1,
    },
  });
  createdIds.bookingIds.add(cancelBooking.payload.booking._id);
  cancelBooking.payload.ticketIds.forEach((ticketId) => createdIds.ticketIds.add(ticketId));

  await callApi('booking cancel', 'POST', `/api/v1/bookings/${cancelBooking.payload.booking._id}/cancel`, {
    token: relogin.payload.accessToken,
    expectedStatuses: [200],
  });

  await callApi('events delete', 'DELETE', `/api/v1/events/${adminEvent.payload.event._id}`, {
    token: admin.accessToken,
    expectedStatuses: [200],
  });
}

main()
  .catch((error) => {
    console.error('Smoke test failed unexpectedly:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } finally {
      await stopServer();
      const passed = results.filter((result) => result.ok);
      const failed = results.filter((result) => !result.ok);
      console.log(JSON.stringify({ runId, total: results.length, passed: passed.length, failed: failed.length, results }, null, 2));
      if (failed.length > 0 && process.exitCode !== 1) {
        process.exitCode = 1;
      }
    }
  });
