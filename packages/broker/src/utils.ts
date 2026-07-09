import { randomUUID } from 'node:crypto';

import type {
  DomainEvent,
  EventMap,
  EventMetadata,
  EventName,
} from '@repo/contracts';

export const buildEvent = <TEvent extends EventName>(
  name: TEvent,
  payload: EventMap[TEvent],
  metadata: Partial<EventMetadata> = {}
): DomainEvent<TEvent> => ({
  name,
  payload,
  metadata: {
    messageId: metadata.messageId ?? randomUUID(),
    occurredAt: metadata.occurredAt ?? new Date().toISOString(),
    producer: metadata.producer ?? 'unknown',
    version: metadata.version ?? 1,
    ...(metadata.correlationId
      ? { correlationId: metadata.correlationId }
      : {}),
    ...(metadata.causationId ? { causationId: metadata.causationId } : {}),
  },
});
