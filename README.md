<img width="1558" height="1061" alt="thumb-microservices" src="https://github.com/user-attachments/assets/02df3708-01ca-4062-9b27-3b9b9d1a9e6e" />

# Video Streaming Microservices

**Event-driven streaming platform** — presigned S3 uploads, RabbitMQ + BullMQ orchestration, and parallel ffmpeg transcoding to multiple renditions — in a TypeScript monorepo **designed to scale out horizontally**: stateless HTTP edges, competing consumers on shared queues, and Redis/RabbitMQ/Postgres as the coordination backbone so you add more instances, not bigger boxes.

## Tech Stack

- **Runtime/Language:** Node.js 22, TypeScript 5, bundles ESM com tsup
- **HTTP/API:** Elysia + `@elysiajs/node`, Swagger
- **Messaging:** RabbitMQ (AMQP topic exchanges) via `amqplib`
- **Jobs:** BullMQ (flow producer/children) + Redis (`ioredis`)
- **Data:** PostgreSQL + Drizzle ORM / drizzle-kit
- **Storage:** AWS S3 (`@aws-sdk/client-s3`, `lib-storage` streaming upload, `s3-request-presigner`)
- **Media:** `fluent-ffmpeg` + `ffmpeg-static` / `ffprobe-static`
- **IaC:** Pulumi (AWS + LocalStack) for S3, IAM, Lambda and Bucket Notifications
- **Monorepo/DX:** pnpm workspaces, Turborepo, ESLint 10, Prettier e Zod
- **Local infra:** Docker Compose (RabbitMQ, Redis, Postgres, Jaeger, LocalStack)

## Architecture Overview

Event-driven design with two complementary transport layers: **RabbitMQ** for typed service-to-service domain events and **BullMQ** for job orchestration inside the processing pipeline. The **upload-service** issues presigned URLs; after the `PUT` to S3, a **Lambda** (provisioned via Pulumi) triggers a webhook that publishes `video.uploaded`, consumed by the **processing-service**, which persists state in Postgres and creates a **BullMQ flow** with parent/children (metadata + N parallel transcodes). Specialized workers (**metadata-service**, **transcode-service**) consume Redis-backed queues, perform end-to-end streaming S3↔ffmpeg↔S3 (no full-file buffering), and publish the `processing.step.*` event family back to RabbitMQ. Event names, payload schemas and S3 keys live in `@repo/contracts`; `@repo/broker` provides typed publishing, subscriptions, validation, retries and dead-letter routing.

**Horizontal scaling:** services are **stateless** at the process boundary (session and heavy work live in S3, Redis queues, RabbitMQ, and Postgres). You can run **multiple replicas** of upload, processing, metadata and transcode workers; **RabbitMQ** and **BullMQ** distribute work across consumers, so throughput grows with instance count rather than vertical CPU/RAM alone.

## Features

- **Decoupled presigned-URL upload**: the HTTP API never touches the binary; confirmation arrives via S3 → Lambda → webhook, preventing inconsistent state.
- **BullMQ-orchestrated flow**: a parent `orchestrator` job with children (`metadata` + `encode@1080/720/480`), per-step exponential backoff retries, and aggregated completion persisted in Postgres.
- **End-to-end ffmpeg streaming**: `transcodeToMp4Stream` pipes `PassThrough` + `@aws-sdk/lib-storage` (`frag_keyframe+empty_moov`) to chain S3 download → ffmpeg → S3 upload without materializing the file on disk.
- **Typed, centralized contracts** (`@repo/contracts`): event names and payloads, BullMQ queue names and S3 key builders eliminate magic strings across services.
- **IaC dev/prod parity**: the same Pulumi stack (S3 + IAM + Lambda + BucketNotification) runs against **LocalStack** in development.
- **Horizontal scalability**: scale out API and worker replicas; shared queues and brokers fan out work — no sticky sessions or in-memory job state required for correctness.

## Getting Started

Prerequisites: Node ≥22, pnpm 10, Docker.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm setup:local                         # RabbitMQ, Redis, Jaeger, PostgreSQL + migrations
pnpm localstack:up                       # LocalStack (S3, Lambda, IAM)
pnpm build                               # services, Lambda and web
pnpm --filter @repo/pulumi up:dev        # bucket + Lambda
pnpm dev                                 # all applications in watch mode

# Reiniciar tudo (Pulumi destroy → docker down → subir de novo):
# PowerShell: $env:PULUMI_CONFIG_PASSPHRASE=""   # ou sua senha do stack
pnpm reset:local
```

Useful endpoints: `POST :3333/upload/request` (presigned URL), Swagger at `:3333/swagger`, Jaeger at `:16686`, RabbitMQ at `:15672`.

Service health checks: upload `:3333/health`, processing `:3334/health`, metadata `:3335/health`, transcode `:3336/health`.

### Docker

Build from the repository root (monorepo context required for workspace dependencies):

```bash
docker build -f docker/Dockerfile.service --build-arg SERVICE=upload-service --build-arg PORT=3333 -t app-upload .
docker build -f docker/Dockerfile.service --build-arg SERVICE=processing-service --build-arg PORT=3334 -t app-processing .
docker build -f docker/Dockerfile.service --build-arg SERVICE=metadata-service --build-arg PORT=3335 -t app-metadata .
docker build -f docker/Dockerfile.service --build-arg SERVICE=transcode-service --build-arg PORT=3336 -t app-transcode .
```

## Key Technical Highlights

- **Two transports, one design**: RabbitMQ for typed domain events and BullMQ for CPU-bound jobs with controlled parallelism (`concurrency: 3` for transcode, `2` for metadata); both scale horizontally through shared infrastructure.
- **Monorepo with Turborepo pipeline**: `check-types` and `lint` across every package/app with granular caching and `dependsOn` (`^check-types`), avoiding redundant builds.
- **Capability-scoped env validation** (`@repo/env`) via Zod — each service validates only the variables it consumes.
- **Reliable messaging**: publisher confirms, runtime contract validation, three delayed retries and a dead-letter queue per consumer/event subscription.
- **Object Ownership enforced + bucket policy**: uploads without per-object ACLs; public read is scoped to the `videos/*` prefix, everything else stays private (signed URLs).
- **Idempotency at the boundary**: the S3 webhook validates the key (`ORIGINAL_UPLOAD_KEY_PATTERN`) and discards events outside the original-upload scope — prevents duplicate pipelines.
- **Clean shutdown**: every service handles `SIGINT/SIGTERM` and attempts to close subscriptions, workers, auxiliary resources and the broker before exit.
- **Internal publishable packages** (`@repo/broker`, `@repo/queue`, `@repo/storage`, `@repo/ffmpeg`): each cross-cutting capability is a small, replaceable package.

## TODO

- [ ] Integrate OpenTelemetry across HTTP, RabbitMQ and BullMQ
- [ ] Propagate correlation IDs and publish Jaeger dashboards
- [ ] Implement authentication and protected user dashboards
- [ ] Publish a live demo environment and monitoring dashboard
- [ ] Implement cancellation flow for in-progress pipelines
- [ ] Add dead-letter replay tooling
- [ ] Add API Gateway with Kong for auth, routing and rate limiting
