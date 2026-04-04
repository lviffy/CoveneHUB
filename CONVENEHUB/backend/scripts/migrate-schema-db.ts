import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { UserModel } from '../src/models/User';
import { EventModel } from '../src/models/Event';
import { BookingModel } from '../src/models/Booking';
import { TicketModel } from '../src/models/Ticket';
import { CheckInModel } from '../src/models/CheckIn';
import { ReferralLinkModel } from '../src/models/ReferralLink';
import { CommissionModel } from '../src/models/Commission';
import { OrderModel } from '../src/models/Order';
import { AttendeeModel } from '../src/models/Attendee';
import { PromoterModel } from '../src/models/Promoter';
import { AnalyticsModel } from '../src/models/Analytics';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function asKey(parts: Array<string | undefined | null>) {
  return parts.map((part) => part || '').join('::');
}

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected. Running schema/data migration...');

  const summary: Record<string, number> = {};

  // Users
  const usersRole = await UserModel.updateMany(
    { role: { $in: ['eon_team', 'convene_team'] } as any },
    { $set: { role: 'admin_team' } }
  );
  summary.usersRoleUpdated = usersRole.modifiedCount;

  const usersName = await UserModel.updateMany(
    { name: { $exists: false }, fullName: { $exists: true } } as any,
    [{ $set: { name: '$fullName' } }] as any
  );
  summary.usersNameBackfilled = usersName.modifiedCount;

  const usersPassword = await UserModel.updateMany(
    { password: { $exists: false }, passwordHash: { $exists: true } } as any,
    [{ $set: { password: '$passwordHash' } }] as any
  );
  summary.usersPasswordBackfilled = usersPassword.modifiedCount;

  // Events
  const eventsDate = await EventModel.updateMany(
    { date: { $exists: false }, dateTime: { $exists: true } } as any,
    [{ $set: { date: '$dateTime' } }] as any
  );
  summary.eventsDateBackfilled = eventsDate.modifiedCount;

  // Bookings
  const bookingsUser = await BookingModel.updateMany(
    { userId: { $exists: false }, attendeeId: { $exists: true } } as any,
    [{ $set: { userId: '$attendeeId' } }] as any
  );
  summary.bookingsUserBackfilled = bookingsUser.modifiedCount;

  const bookingsPayment = await BookingModel.updateMany(
    { paymentStatus: { $exists: false } } as any,
    { $set: { paymentStatus: 'paid' } }
  );
  summary.bookingsPaymentBackfilled = bookingsPayment.modifiedCount;

  // Tickets
  const ticketsType = await TicketModel.updateMany(
    { type: { $exists: false } } as any,
    { $set: { type: 'General' } }
  );
  summary.ticketsTypeBackfilled = ticketsType.modifiedCount;

  const ticketsQty = await TicketModel.updateMany(
    { quantity: { $exists: false } } as any,
    { $set: { quantity: 1 } }
  );
  summary.ticketsQuantityBackfilled = ticketsQty.modifiedCount;

  const ticketsNoPrice = await TicketModel.find({ price: { $exists: false } } as any)
    .select('_id bookingId')
    .lean();

  if (ticketsNoPrice.length > 0) {
    const bookingIds = Array.from(new Set(ticketsNoPrice.map((ticket) => String(ticket.bookingId))));
    const bookings = await BookingModel.find({ _id: { $in: bookingIds } } as any)
      .select('_id ticketPrice')
      .lean();

    const priceByBooking = new Map(bookings.map((booking: any) => [String(booking._id), booking.ticketPrice]));

    const ticketPriceOps = ticketsNoPrice
      .map((ticket: any) => {
        const price = priceByBooking.get(String(ticket.bookingId));
        if (typeof price !== 'number') return null;

        return {
          updateOne: {
            filter: { _id: ticket._id },
            update: { $set: { price } },
          },
        };
      })
      .filter(Boolean) as any[];

    if (ticketPriceOps.length > 0) {
      const result = await TicketModel.bulkWrite(ticketPriceOps, { ordered: false });
      summary.ticketsPriceBackfilled = result.modifiedCount || 0;
    } else {
      summary.ticketsPriceBackfilled = 0;
    }
  } else {
    summary.ticketsPriceBackfilled = 0;
  }

  // Check-ins
  const checkinsUser = await CheckInModel.updateMany(
    { userId: { $exists: false }, attendeeId: { $exists: true } } as any,
    [{ $set: { userId: '$attendeeId' } }] as any
  );
  summary.checkinsUserBackfilled = checkinsUser.modifiedCount;

  const checkinsStatus = await CheckInModel.updateMany(
    { checkInStatus: { $exists: false } } as any,
    { $set: { checkInStatus: 'checked_in' } }
  );
  summary.checkinsStatusBackfilled = checkinsStatus.modifiedCount;

  // Referral links
  const linksUser = await ReferralLinkModel.updateMany(
    { userId: { $exists: false }, promoterId: { $exists: true } } as any,
    [{ $set: { userId: '$promoterId' } }] as any
  );
  summary.referralLinksUserBackfilled = linksUser.modifiedCount;

  const linksCode = await ReferralLinkModel.updateMany(
    { referralCode: { $exists: false }, code: { $exists: true } } as any,
    [{ $set: { referralCode: '$code' } }] as any
  );
  summary.referralLinksCodeBackfilled = linksCode.modifiedCount;

  const linksCommission = await ReferralLinkModel.updateMany(
    { commission: { $exists: false } } as any,
    { $set: { commission: 0 } }
  );
  summary.referralLinksCommissionBackfilled = linksCommission.modifiedCount;

  // Commissions
  const commissionsUser = await CommissionModel.updateMany(
    { userId: { $exists: false }, promoterId: { $exists: true } } as any,
    [{ $set: { userId: '$promoterId' } }] as any
  );
  summary.commissionsUserBackfilled = commissionsUser.modifiedCount;

  // Promoters collection
  const commissionTotals = await CommissionModel.aggregate([
    {
      $group: {
        _id: {
          promoterId: '$promoterId',
          eventId: '$eventId',
          referralCode: '$referralCode',
        },
        totalCommission: { $sum: '$amount' },
      },
    },
  ]);

  const commissionTotalMap = new Map<string, number>();
  for (const row of commissionTotals) {
    const key = asKey([row?._id?.promoterId, row?._id?.eventId, row?._id?.referralCode]);
    commissionTotalMap.set(key, Number(row?.totalCommission || 0));
  }

  const referralLinks = await ReferralLinkModel.find({}).select('promoterId eventId code commission').lean();
  const promoterOps = referralLinks.map((link: any) => {
    const key = asKey([link.promoterId, link.eventId, link.code]);
    const aggregatedCommission = commissionTotalMap.get(key);
    const commission = typeof aggregatedCommission === 'number' ? aggregatedCommission : Number(link.commission || 0);

    return {
      updateOne: {
        filter: {
          userId: link.promoterId,
          eventId: link.eventId,
          referralCode: link.code,
        },
        update: {
          $set: {
            userId: link.promoterId,
            eventId: link.eventId,
            referralCode: link.code,
            commission,
          },
        },
        upsert: true,
      },
    };
  });

  if (promoterOps.length > 0) {
    const promoterResult = await PromoterModel.bulkWrite(promoterOps, { ordered: false });
    summary.promotersUpserted = (promoterResult.upsertedCount || 0) + (promoterResult.modifiedCount || 0);
  } else {
    summary.promotersUpserted = 0;
  }

  // Orders collection (derived from bookings)
  const bookings = await BookingModel.find({}).select('_id attendeeId eventId paymentStatus').lean();
  const tickets = await TicketModel.find({}).select('_id bookingId').sort({ createdAt: 1 }).lean();

  const firstTicketByBooking = new Map<string, string>();
  for (const ticket of tickets as any[]) {
    const bookingId = String(ticket.bookingId);
    if (!firstTicketByBooking.has(bookingId)) {
      firstTicketByBooking.set(bookingId, String(ticket._id));
    }
  }

  const orderOps = (bookings as any[])
    .map((booking) => {
      const bookingId = String(booking._id);
      const ticketId = firstTicketByBooking.get(bookingId);
      if (!ticketId) return null;

      return {
        updateOne: {
          filter: {
            userId: booking.attendeeId,
            eventId: booking.eventId,
            ticketId,
          },
          update: {
            $set: {
              userId: booking.attendeeId,
              eventId: booking.eventId,
              ticketId,
              paymentStatus: booking.paymentStatus || 'paid',
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean) as any[];

  if (orderOps.length > 0) {
    const orderResult = await OrderModel.bulkWrite(orderOps, { ordered: false });
    summary.ordersUpserted = (orderResult.upsertedCount || 0) + (orderResult.modifiedCount || 0);
  } else {
    summary.ordersUpserted = 0;
  }

  // Attendees collection (derived from tickets)
  const ticketsForAttendees = await TicketModel.find({})
    .select('eventId attendeeId qrPayload checkInStatus')
    .lean();

  const attendeeBulkOps = (ticketsForAttendees as any[]).map((ticket) => {
    const checkInStatus: 'pending' | 'checked_in' =
      ticket.checkInStatus === 'checked_in' ? 'checked_in' : 'pending';

    return {
      updateOne: {
        filter: {
          eventId: ticket.eventId,
          userId: ticket.attendeeId,
          qrCode: ticket.qrPayload,
        },
        update: {
          $set: {
            eventId: ticket.eventId,
            userId: ticket.attendeeId,
            qrCode: ticket.qrPayload,
            checkInStatus,
          },
        },
        upsert: true,
      },
    };
  });

  if (attendeeBulkOps.length > 0) {
    const attendeeResult = await AttendeeModel.bulkWrite(attendeeBulkOps, { ordered: false });
    summary.attendeesUpserted = (attendeeResult.upsertedCount || 0) + (attendeeResult.modifiedCount || 0);
  } else {
    summary.attendeesUpserted = 0;
  }

  // Analytics collection (derived per event)
  const allEvents = await EventModel.find({}).select('_id').lean();
  const confirmedBookings = await BookingModel.find({ bookingStatus: 'confirmed' })
    .select('eventId amount promoterId')
    .lean();
  const checkedInTickets = await TicketModel.find({ checkInStatus: 'checked_in' })
    .select('eventId')
    .lean();

  const revenueByEvent = new Map<string, number>();
  const attendanceByEvent = new Map<string, number>();
  const promoterPerfByEvent = new Map<string, Record<string, number>>();

  for (const booking of confirmedBookings as any[]) {
    const eventId = String(booking.eventId);
    revenueByEvent.set(eventId, (revenueByEvent.get(eventId) || 0) + Number(booking.amount || 0));

    if (booking.promoterId) {
      const perf = promoterPerfByEvent.get(eventId) || {};
      perf[String(booking.promoterId)] = (perf[String(booking.promoterId)] || 0) + Number(booking.amount || 0);
      promoterPerfByEvent.set(eventId, perf);
    }
  }

  for (const ticket of checkedInTickets as any[]) {
    const eventId = String(ticket.eventId);
    attendanceByEvent.set(eventId, (attendanceByEvent.get(eventId) || 0) + 1);
  }

  const analyticsOps = (allEvents as any[]).map((event) => {
    const eventId = String(event._id);
    return {
      updateOne: {
        filter: { eventId },
        update: {
          $set: {
            eventId,
            revenue: Number((revenueByEvent.get(eventId) || 0).toFixed(2)),
            attendance: attendanceByEvent.get(eventId) || 0,
            promoterPerformance: promoterPerfByEvent.get(eventId) || {},
          },
        },
        upsert: true,
      },
    };
  });

  if (analyticsOps.length > 0) {
    const analyticsResult = await AnalyticsModel.bulkWrite(analyticsOps, { ordered: false });
    summary.analyticsUpserted = (analyticsResult.upsertedCount || 0) + (analyticsResult.modifiedCount || 0);
  } else {
    summary.analyticsUpserted = 0;
  }

  console.log('Migration completed. Summary:');
  console.table(summary);
}

runMigration()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
