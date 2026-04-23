import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/db';

async function bootstrap() {
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`ConveneHub backend running at http://localhost:${env.PORT}`);
  });

  connectDatabase(env.MONGODB_URI)
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('MongoDB connected');
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('MongoDB connection failed; running API in degraded mode:', error?.message || error);
    });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend:', error);
  process.exit(1);
});
