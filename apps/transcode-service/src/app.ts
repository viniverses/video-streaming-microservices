import { node } from '@elysiajs/node';
import { registerAppShutdown } from '@repo/broker';
import { Elysia } from 'elysia';

import { broker } from '@/broker/broker.ts';
import { redis } from '@/lib/redis.ts';
import { worker } from '@/worker.ts';

import { env } from '../env.ts';

console.log('Workers and consumer are running...');

export const app = new Elysia({ adapter: node() });

app.get('/health', ({ status }) => {
  return status(200, 'OK');
});

app.get('/ready', async ({ status }) => {
  const [brokerReady, redisReady] = await Promise.all([
    broker.checkConnection(),
    redis.status === 'ready'
      ? redis.ping().then(
          () => true,
          () => false
        )
      : false,
  ]);
  const dependencies = { broker: brokerReady, redis: redisReady };
  const ready = Object.values(dependencies).every(Boolean);

  return status(ready ? 200 : 503, {
    status: ready ? 'ready' : 'not ready',
    dependencies,
  });
});

app.listen(env.PORT, ({ hostname, port }) => {
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
