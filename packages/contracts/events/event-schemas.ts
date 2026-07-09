import { z } from 'zod';

import type { EventName } from '../messaging.ts';
import {
  EVENT_PAYLOAD_SCHEMAS,
  PROCESSING_EVENT_PAYLOAD_SCHEMAS,
  processingStepCompletedPayloadSchema,
  processingStepFailedPayloadSchema,
  processingStepStartedPayloadSchema,
  UPLOAD_EVENT_PAYLOAD_SCHEMAS,
  videoUploadedPayloadSchema,
} from './event-payload-schemas.ts';

export const eventMetadataSchema = z
  .object({
    messageId: z.string().uuid(),
    correlationId: z.string().min(1).optional(),
    causationId: z.string().min(1).optional(),
    occurredAt: z.string().datetime({ offset: true }),
    producer: z.string().trim().min(1),
    version: z.number().int().positive(),
  })
  .strict();

const createEventSchema = <TName extends string, TPayload extends z.ZodTypeAny>(
  name: TName,
  payload: TPayload
) =>
  z
    .object({ name: z.literal(name), payload, metadata: eventMetadataSchema })
    .strict();

const mapEventSchemas = <TSchemas extends Record<string, z.ZodTypeAny>>(
  schemas: TSchemas
) =>
  Object.fromEntries(
    Object.entries(schemas).map(([name, payload]) => [
      name,
      createEventSchema(name, payload),
    ])
  ) as {
    [TName in keyof TSchemas]: ReturnType<
      typeof createEventSchema<TName & string, TSchemas[TName]>
    >;
  };

export const EVENT_SCHEMAS = mapEventSchemas(EVENT_PAYLOAD_SCHEMAS);
export const UPLOAD_EVENT_SCHEMAS = mapEventSchemas(
  UPLOAD_EVENT_PAYLOAD_SCHEMAS
);
export const PROCESSING_EVENT_SCHEMAS = mapEventSchemas(
  PROCESSING_EVENT_PAYLOAD_SCHEMAS
);

type InferSchemaMap<T extends Record<string, z.ZodTypeAny>> = {
  [K in keyof T]: z.infer<T[K]>;
};

type InferPayloadMap<T extends Record<string, z.ZodTypeAny>> = {
  [K in keyof T]: z.infer<T[K]>;
};

export type EventMap = InferPayloadMap<typeof EVENT_PAYLOAD_SCHEMAS>;
export type DomainEventByName = InferSchemaMap<typeof EVENT_SCHEMAS>;
export type EventMetadata = z.infer<typeof eventMetadataSchema>;
export type DomainEvent<TEvent extends EventName = EventName> = {
  name: TEvent;
  payload: EventMap[TEvent];
  metadata: EventMetadata;
};
export type UploadEventPayloadByRoutingKey = InferPayloadMap<
  typeof UPLOAD_EVENT_PAYLOAD_SCHEMAS
>;
export type UploadEventByRoutingKey = InferSchemaMap<
  typeof UPLOAD_EVENT_SCHEMAS
>;
export type ProcessingEventPayloadByRoutingKey = InferPayloadMap<
  typeof PROCESSING_EVENT_PAYLOAD_SCHEMAS
>;
export type ProcessingEventByRoutingKey = InferSchemaMap<
  typeof PROCESSING_EVENT_SCHEMAS
>;

export type VideoUploadedPayload = z.infer<typeof videoUploadedPayloadSchema>;
export type ProcessingStepStartedPayload = z.infer<
  typeof processingStepStartedPayloadSchema
>;
export type ProcessingStepCompletedPayload = z.infer<
  typeof processingStepCompletedPayloadSchema
>;
export type ProcessingStepFailedPayload = z.infer<
  typeof processingStepFailedPayloadSchema
>;
