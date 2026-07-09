import {
  type DomainEvent,
  EVENT_SCHEMAS,
  type EventMap,
  type EventMetadata,
  type EventName,
} from '@repo/contracts';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';

import type {
  DomainBroker,
  EventHandler,
  SubscribeOptions,
  Unsubscribe,
} from './domain-broker.ts';
import { buildEvent } from './utils.ts';

export type RabbitMQBrokerOptions = {
  url: string;
  exchange: string;
  producer: string;
  version?: number;
  exchangeType?: 'topic' | 'direct' | 'fanout';
  queuePrefix?: string;
};

export class RabbitMQDomainBroker implements DomainBroker {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<ConfirmChannel>;
  private closing?: Promise<void>;
  private intentionalClose = false;

  constructor(private readonly options: RabbitMQBrokerOptions) {}

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    if (this.connecting) return this.connecting;

    this.connecting = this.connect();
    try {
      return await this.connecting;
    } finally {
      this.connecting = undefined;
    }
  }

  private async connect(): Promise<ConfirmChannel> {
    const connection = await amqp.connect(this.options.url);
    const channel = await connection.createConfirmChannel();

    connection.on('error', (error) =>
      console.error('[Broker] connection error:', error)
    );
    connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
      if (!this.intentionalClose) {
        console.error('[Broker] connection unexpectedly closed; terminating');
        process.exit(1);
      }
    });

    await channel.assertExchange(
      this.options.exchange,
      this.options.exchangeType ?? 'topic',
      { durable: true }
    );
    channel.prefetch(1);
    this.connection = connection;
    this.channel = channel;
    return channel;
  }

  async publish<TEvent extends EventName>(
    name: TEvent,
    payload: EventMap[TEvent],
    metadata: Partial<EventMetadata> = {}
  ): Promise<void> {
    const channel = await this.getChannel();
    const event = buildEvent(name, payload, {
      producer: this.options.producer,
      version: this.options.version ?? 1,
      ...metadata,
    });
    const validatedEvent = EVENT_SCHEMAS[name].parse(event);

    channel.publish(
      this.options.exchange,
      name,
      Buffer.from(JSON.stringify(validatedEvent)),
      {
        contentType: 'application/json',
        persistent: true,
        messageId: event.metadata.messageId,
        timestamp: Date.now(),
        type: event.name,
        correlationId: event.metadata.correlationId,
        headers: {
          producer: event.metadata.producer,
          version: event.metadata.version,
          causationId: event.metadata.causationId,
          occurredAt: event.metadata.occurredAt,
        },
      }
    );
    await channel.waitForConfirms();
  }

  async subscribe<TEvent extends EventName>(
    name: TEvent,
    handler: EventHandler<TEvent>,
    options: SubscribeOptions
  ): Promise<Unsubscribe> {
    const channel = await this.getChannel();
    const prefix = this.options.queuePrefix ?? 'app';
    const queue = `${prefix}.${options.consumerName}.${name}`;
    const retryExchange = `${queue}.retry.exchange`;
    const retryQueue = `${queue}.retry`;
    const retryReturnExchange = `${queue}.retry-return.exchange`;
    const deadLetterExchange = `${queue}.dead-letter.exchange`;
    const deadLetterQueue = `${queue}.dead-letter`;
    const maxRetries = options.maxRetries ?? 3;
    const retryDelayMs = options.retryDelayMs ?? 5_000;

    await channel.assertExchange(retryExchange, 'direct', { durable: true });
    await channel.assertExchange(retryReturnExchange, 'direct', {
      durable: true,
    });
    await channel.assertExchange(deadLetterExchange, 'direct', {
      durable: true,
    });
    await channel.assertQueue(queue, { durable: true });
    await channel.assertQueue(retryQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': retryDelayMs,
        'x-dead-letter-exchange': retryReturnExchange,
        'x-dead-letter-routing-key': name,
      },
    });
    await channel.assertQueue(deadLetterQueue, { durable: true });
    await channel.bindQueue(queue, this.options.exchange, name);
    await channel.bindQueue(queue, retryReturnExchange, name);
    await channel.bindQueue(retryQueue, retryExchange, name);
    await channel.bindQueue(deadLetterQueue, deadLetterExchange, name);

    const retryOrDeadLetter = async (msg: ConsumeMessage, error: unknown) => {
      const retryCount = Number(msg.properties.headers?.['x-retry-count'] ?? 0);
      const targetExchange =
        retryCount < maxRetries ? retryExchange : deadLetterExchange;
      const nextRetryCount = retryCount + 1;

      console.error(
        `[Broker] consumer ${options.consumerName} failed for ${name}:`,
        error
      );
      channel.publish(targetExchange, name, msg.content, {
        ...msg.properties,
        persistent: true,
        headers: { ...msg.properties.headers, 'x-retry-count': nextRetryCount },
      });
      await channel.waitForConfirms();
      channel.ack(msg);
    };

    const { consumerTag } = await channel.consume(
      queue,
      (msg) => {
        if (!msg) return;
        void (async () => {
          try {
            const raw: unknown = JSON.parse(msg.content.toString());
            const parsed = EVENT_SCHEMAS[name].safeParse(raw);
            if (!parsed.success) throw parsed.error;
            await handler(parsed.data as DomainEvent<TEvent>);
            channel.ack(msg);
          } catch (error) {
            try {
              await retryOrDeadLetter(msg, error);
            } catch (publishError) {
              console.error(
                '[Broker] failed to route rejected message:',
                publishError
              );
              channel.nack(msg, false, true);
            }
          }
        })();
      },
      { noAck: false }
    );

    return async () => {
      if (this.channel) await this.channel.cancel(consumerTag);
    };
  }

  async close(): Promise<void> {
    if (this.closing) return this.closing;
    this.closing = (async () => {
      this.intentionalClose = true;
      const channel = this.channel;
      const connection = this.connection;
      this.channel = undefined;
      this.connection = undefined;
      if (channel) await channel.close();
      if (connection) await connection.close();
    })();
    try {
      await this.closing;
    } finally {
      this.closing = undefined;
    }
  }
}
