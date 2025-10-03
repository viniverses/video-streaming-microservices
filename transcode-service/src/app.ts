import '@/lib/opentelemetry.ts';
import '@/worker.ts';

console.log('Workers and consumer are running...');

import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';

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
