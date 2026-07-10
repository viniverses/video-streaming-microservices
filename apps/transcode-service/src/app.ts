import { node } from '@elysiajs/node';
import { registerAppShutdown } from '@repo/broker';
import { Elysia } from 'elysia';

import { broker } from '@/broker/broker.ts';
import { redis } from '@/lib/redis.ts';
import { worker } from '@/worker.ts';

console.log('Workers and consumer are running...');

export const app = new Elysia({ adapter: node() });

app.get('/health', ({ status }) => {
  return status(200, 'OK');
});

app.listen(3336, ({ hostname, port }) => {
  console.log(
    '\x1b[32m[Transcode]\x1b[0m HTTP server running at %s:%s',
    hostname,
    port
  );
});

registerAppShutdown({
  broker,
  worker,
  beforeExit: async () => {
    await redis.quit();
  },
});
