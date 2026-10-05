import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';
import { swagger } from '@elysiajs/swagger';
import { registerAppShutdown } from '@repo/broker';
import { Elysia } from 'elysia';

import { env } from '../../env.ts';
import { broker } from '../broker/broker.ts';
import { uploadRoutes } from './routes/upload.ts';

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

export const app = new Elysia({ adapter: node() });

app.use(
  cors({
    origin: corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.use(
  swagger({
    documentation: {
      info: {
        title: 'Video Upload API',
        description: 'API for uploading videos',
        version: '1.0',
      },
    },
    exclude: ['/health', '/ready'],
  })
);

app.get('/health', ({ status }) => {
  return status(200, 'OK');
});

app.get('/ready', async ({ status }) => {
  const dependencies = { broker: await broker.checkConnection() };
  const ready = Object.values(dependencies).every(Boolean);

  return status(ready ? 200 : 503, {
    status: ready ? 'ready' : 'not ready',
    dependencies,
  });
});

app.use(uploadRoutes);

app.listen(env.PORT, ({ hostname, port }) => {
  console.log(
    '\x1b[32m[Upload]\x1b[0m HTTP server running at %s:%s',
    hostname,
    port
  );
});

registerAppShutdown({
  broker,
});
