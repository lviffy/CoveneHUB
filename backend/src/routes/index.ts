import { Router } from 'express';
import { authRouter } from './auth.routes';
import { eventsRouter } from './events.routes';
import { bookingsRouter } from './bookings.routes';
import { ticketsRouter } from './tickets.routes';
import { checkinsRouter } from './checkins.routes';
import { promotersRouter } from './promoters.routes';
import { analyticsRouter } from './analytics.routes';
import { adminRouter } from './admin.routes';
import { uploadsRouter } from './uploads.routes';
import { organizerRouter } from './organizer.routes';
import { paymentsRouter } from './payments.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, service: 'convenehub-backend', version: '0.2.0' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use('/checkins', checkinsRouter);
apiRouter.use('/promoters', promotersRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/organizer', organizerRouter);
apiRouter.use('/uploads', uploadsRouter);
apiRouter.use('/payments', paymentsRouter);
