import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { UserModel } from '../src/models/User';
import { EventModel } from '../src/models/Event';
import { BookingModel } from '../src/models/Booking';
import { TicketModel } from '../src/models/Ticket';
import { AttendeeModel } from '../src/models/Attendee';
import { ReferralLinkModel } from '../src/models/ReferralLink';
import { TenantModel } from '../src/models/Tenant';
import { syncTenantRecord } from '../src/utils/tenants';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function backfillTenants() {
  const [users, events] = await Promise.all([
    UserModel.find({}, { _id: 1, role: 1, tenantId: 1, campusId: 1 }).lean(),
    EventModel.find({}, { organizerId: 1, tenantId: 1, campusId: 1 }).lean(),
  ]);

  const orphanRoleUserIds = users
    .filter((user) => (user.role === 'admin' || user.role === 'organizer') && !user.tenantId)
    .map((user) => user._id);

  if (orphanRoleUserIds.length > 0) {
    await UserModel.updateMany(
      { _id: { $in: orphanRoleUserIds } },
      { $set: { tenantId: 'default-tenant' } }
    );
  }

  const normalizedUsers = users.map((user) => ({
    ...user,
    tenantId: user.tenantId || (user.role === 'admin' || user.role === 'organizer' ? 'default-tenant' : undefined),
  }));

  for (const user of normalizedUsers) {
    await syncTenantRecord({
      tenantId: user.tenantId,
      campusId: user.campusId,
      adminId: user.role === 'admin' ? String(user._id) : undefined,
      organizerId: user.role === 'organizer' ? String(user._id) : undefined,
    });
  }

  for (const event of events) {
    await syncTenantRecord({
      tenantId: event.tenantId,
      campusId: event.campusId,
      organizerId: event.organizerId,
    });
  }

  return { usersProcessed: users.length, eventsProcessed: events.length };
}

async function backfillAttendees() {
  const bookings = await BookingModel.find({ bookingStatus: 'confirmed' })
    .select('_id eventId attendeeId bookingCode')
    .sort({ createdAt: 1 })
    .lean();

  let upserted = 0;

  for (const booking of bookings) {
    const relatedBookings = await BookingModel.find({
      eventId: booking.eventId,
      attendeeId: booking.attendeeId,
      bookingStatus: 'confirmed',
    })
      .select('_id bookingCode')
      .sort({ createdAt: 1 })
      .lean();

    const bookingIds = relatedBookings.map((item) => String(item._id));
    const tickets = await TicketModel.find({ bookingId: { $in: bookingIds } })
      .select('qrPayload checkInStatus')
      .sort({ createdAt: 1 })
      .lean();

    const primaryQr = tickets[0]?.qrPayload || booking.bookingCode;
    const checkInStatus = tickets.some((ticket) => ticket.checkInStatus === 'checked_in')
      ? 'checked_in'
      : 'pending';

    await AttendeeModel.findOneAndUpdate(
      { eventId: booking.eventId, attendeeId: booking.attendeeId },
      {
        eventId: booking.eventId,
        attendeeId: booking.attendeeId,
        qrCode: primaryQr,
        checkInStatus,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    upserted += 1;
  }

  return { bookingsProcessed: bookings.length, attendeeRecordsUpserted: upserted };
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected. Backfilling role-flow data...');

  await Promise.all([
    AttendeeModel.syncIndexes(),
    ReferralLinkModel.syncIndexes(),
    TenantModel.syncIndexes(),
  ]);
  console.log('Indexes synced for attendee, referral link, and tenant collections.');

  const [tenantSummary, attendeeSummary] = await Promise.all([
    backfillTenants(),
    backfillAttendees(),
  ]);

  console.log('Backfill complete.');
  console.log({ tenantSummary, attendeeSummary });
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Backfill failed:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
