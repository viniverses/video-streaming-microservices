import '../otel.ts';

import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { swagger } from '@elysiajs/swagger';
import { opentelemetry } from '@elysiajs/opentelemetry';

import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { uploadRoutes } from './routes/upload.ts';

export const app = new Elysia({ adapter: node() });

// OpenTelemetry
app.use(
  opentelemetry({
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  })
);

// Swagger
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

app.use(uploadRoutes);

app.listen(3333, ({ hostname, port }) => {
  console.log('\x1b[32m[Upload]\x1b[0m HTTP server running at %s:%s', hostname, port);
});
