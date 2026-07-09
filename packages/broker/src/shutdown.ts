import type { Unsubscribe } from './domain-broker.ts';

type Closeable = { close(): Promise<unknown> | unknown };

export const registerAppShutdown = ({
  broker,
  subscriptions = [],
  worker,
  beforeExit,
}: {
  broker: Closeable;
  subscriptions?: Unsubscribe[];
  worker?: Closeable;
  beforeExit?: () => void | Promise<void>;
}) => {
  let shutdownPromise: Promise<void> | undefined;
  const handleShutdown = async () => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      const errors: unknown[] = [];

      try {
        const subscriptionResults = await Promise.allSettled(
          subscriptions.map((unsubscribe) => unsubscribe())
        );
        for (const result of subscriptionResults) {
          if (result.status === 'rejected') errors.push(result.reason);
        }

        try {
          await worker?.close();
        } catch (error) {
          errors.push(error);
        }

        try {
          await beforeExit?.();
        } catch (error) {
          errors.push(error);
        }
      } finally {
        try {
          await broker.close();
        } catch (error) {
          errors.push(error);
        }
      }

      if (errors.length > 0) {
        console.error(
          '[Broker] shutdown completed with errors:',
          new AggregateError(errors, 'Failed to close one or more resources')
        );
        process.exitCode = 1;
      }
    })();
    return shutdownPromise;
  };
  process.once('SIGINT', () => void handleShutdown());
  process.once('SIGTERM', () => void handleShutdown());
  return handleShutdown;
};
