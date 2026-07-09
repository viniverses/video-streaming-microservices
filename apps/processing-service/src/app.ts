import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';
import { registerAppShutdown } from '@repo/broker';
import { Elysia } from 'elysia';

import { broker } from '@/broker/broker.ts';
import { registerConsumers } from '@/broker/register-consumers.ts';
import { processingRoutes } from '@/http/routes/processing.ts';

import { env } from './config/env.ts';
import { flowProducer } from './flow-producer.ts';
import { redis } from './infra/redis.ts';
import { worker } from './worker.ts';

const subscriptions = await registerConsumers();

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const corsOrigins =
  env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? defaultCorsOrigins;

console.log('Workers and consumer are running...');

export const app = new Elysia({ adapter: node() });

app.use(
  cors({
    origin: corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.get('/health', ({ status }) => {
  return status(200, 'OK');
});

app.use(processingRoutes);

app.listen(3334, ({ hostname, port }) => {
  console.log(
    '\x1b[32m[Processing]\x1b[0m HTTP server running at %s:%s',
    hostname,
    port
  );
});

registerAppShutdown({
  broker,
  subscriptions,
  worker,
  beforeExit: async () => {
    await flowProducer.close();
    await redis.quit();
  },
});
