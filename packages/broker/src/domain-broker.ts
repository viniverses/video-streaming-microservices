import type {
  DomainEvent,
  EventMap,
  EventMetadata,
  EventName,
} from '@repo/contracts';

export type EventHandler<TEvent extends EventName> = (
  event: DomainEvent<TEvent>
) => Promise<void> | void;

export type Unsubscribe = () => Promise<void> | void;

export type SubscribeOptions = {
  consumerName: string;
  maxRetries?: number;
  retryDelayMs?: number;
};

export interface DomainBroker {
  publish<TEvent extends EventName>(
    name: TEvent,
    payload: EventMap[TEvent],
    metadata?: Partial<EventMetadata>
  ): Promise<void>;

  subscribe<TEvent extends EventName>(
    name: TEvent,
    handler: EventHandler<TEvent>,
    options: SubscribeOptions
  ): Promise<Unsubscribe>;
}
