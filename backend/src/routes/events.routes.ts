import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { EventModel } from '../models/Event';
import { syncTenantRecord } from '../utils/tenants';

export const eventsRouter = Router();

function toLegacyEvent(event: any) {
  const firstTier = Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0 ? event.ticketTiers[0] : null;
  return {
    event_id: String(event._id),
    title: event.title,
    description: event.description || '',
    venue_name: event.venue,
    venue_address: event.venue,
    city: event.city || '',
    date_time: event.dateTime,
    capacity: event.capacity,
    remaining: event.remaining,
    status: event.status,
    ticket_price: firstTier?.price ?? 0,
    event_image: event.eventImage || '',
    entry_instructions: event.entryInstructions || '',
    terms: event.terms || '',
    created_at: event.createdAt,
  };
}

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  venue: z.string().min(2),
  city: z.string().optional(),
  dateTime: z.string().datetime(),
  capacity: z.number().int().positive(),
  status: z.enum(['draft', 'published', 'checkin_open', 'in_progress', 'ended']).optional(),
  eventImage: z.string().optional().nullable(),
  entryInstructions: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  campusId: z.string().optional(),
  ticketTiers: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
      })
    )
    .length(2, 'Events must include exactly two ticket tiers: VIP and General')
    .refine(
      (tiers) => {
        const names = tiers.map((tier) => tier.name.trim().toLowerCase());
        return names.includes('vip') && names.includes('general');
      },
      { message: 'Ticket tiers must include both VIP and General' }
    )
    .refine(
      (tiers) => {
        const general = tiers.find((tier) => tier.name.trim().toLowerCase() === 'general');
        const vip = tiers.find((tier) => tier.name.trim().toLowerCase() === 'vip');
        if (!general || !vip) return false;
        return general.price !== vip.price;
      },
      { message: 'VIP and General prices must be different' }
    ),
});

eventsRouter.get('/', async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : 'published';

  const query: Record<string, unknown> = {};
  if (city) query.city = city;
  if (status) query.status = status;

  const events = await EventModel.find(query).sort({ dateTime: 1 }).lean();
  res.json({ success: true, events });
});

eventsRouter.get('/public', async (req, res) => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;

    const query: Record<string, unknown> = { status: 'published' };
    if (city) query.city = city;

    const events = await EventModel.find(query).sort({ dateTime: 1 }).lean();
    return res.json({ success: true, events: events.map(toLegacyEvent) });
  } catch {
    return res.json({ success: true, events: [] });
  }
});

eventsRouter.get('/:id', async (req, res) => {
  const event = await EventModel.findById(req.params.id).lean();
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  return res.json({ success: true, event });
});

eventsRouter.post('/', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid input' });
  }

  const totalTierQty = parsed.data.ticketTiers.reduce((acc, tier) => acc + tier.quantity, 0);
  if (totalTierQty > parsed.data.capacity) {
    return res.status(400).json({ success: false, message: 'Total tier quantity cannot exceed event capacity' });
  }

  const event = await EventModel.create({
    tenantId: req.user?.tenantId || 'default-tenant',
    campusId: parsed.data.campusId,
    organizerId: req.user?.sub,
    title: parsed.data.title,
    description: parsed.data.description,
    venue: parsed.data.venue,
    city: parsed.data.city,
    dateTime: new Date(parsed.data.dateTime),
    capacity: parsed.data.capacity,
    remaining: parsed.data.capacity,
    status: parsed.data.status || 'draft',
    eventImage: parsed.data.eventImage || undefined,
    entryInstructions: parsed.data.entryInstructions || undefined,
    terms: parsed.data.terms || undefined,
    ticketTiers: parsed.data.ticketTiers.map((tier) => ({ ...tier, soldCount: 0 })),
  });

  await syncTenantRecord({
    tenantId: event.tenantId,
    campusId: event.campusId,
    adminId: req.user?.role === 'admin' ? req.user.sub : undefined,
    organizerId: event.organizerId,
  });

  return res.status(201).json({ success: true, event });
});

eventsRouter.patch('/:id', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const event = await EventModel.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  if (req.user?.role !== 'admin' && event.organizerId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const payload = req.body as Partial<{
    title: string;
    description: string;
    venue: string;
    city: string;
    status: 'draft' | 'published' | 'checkin_open' | 'in_progress' | 'ended';
    dateTime: string;
    eventImage: string | null;
    entryInstructions: string | null;
    terms: string | null;
  }>;

  if (payload.title !== undefined) event.title = payload.title;
  if (payload.description !== undefined) event.description = payload.description;
  if (payload.venue !== undefined) event.venue = payload.venue;
  if (payload.city !== undefined) event.city = payload.city;
  if (payload.status !== undefined) event.status = payload.status;
  if (payload.dateTime !== undefined) event.dateTime = new Date(payload.dateTime);
  if (payload.eventImage !== undefined) event.eventImage = payload.eventImage || undefined;
  if (payload.entryInstructions !== undefined) event.entryInstructions = payload.entryInstructions || undefined;
  if (payload.terms !== undefined) event.terms = payload.terms || undefined;

  await event.save();
  return res.json({ success: true, event });
});

eventsRouter.delete('/:id', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const event = await EventModel.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  if (req.user?.role !== 'admin' && event.organizerId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  await EventModel.findByIdAndDelete(req.params.id);
  return res.json({ success: true, message: 'Event deleted' });
});
