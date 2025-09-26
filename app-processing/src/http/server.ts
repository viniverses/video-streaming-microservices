import '../otel.ts';
import '../broker/consumer.ts';

import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { swagger } from '@elysiajs/swagger';
import { opentelemetry } from '@elysiajs/opentelemetry';

import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

export const app = new Elysia({ adapter: node() })
  .use(
    opentelemetry({
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    })
  )
  .listen(3334, ({ hostname, port }) => {
    console.log(
      '\x1b[32m[Processing]\x1b[0m HTTP server running at %s:%s',
      hostname,
      port
    );
  });

app.use(
  swagger({
    documentation: {
      info: {
        title: 'Video Upload API',
        description: 'API for uploading videos',
        version: '1.0',
      },
    },
    exclude: ['/health'],
  })
);

app.get('/health', ({ status }) => {
  return status(200, 'OK');
});
