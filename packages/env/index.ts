import 'dotenv/config';

import { z } from 'zod';

export const brokerEnvSchema = {
  BROKER_URL: z.string().url(),
} as const;

export const redisEnvSchema = {
  REDIS_URL: z.string().url(),
} as const;

export const databaseEnvSchema = {
  DATABASE_URL: z.string().url(),
} as const;

export const storageEnvSchema = {
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_ENDPOINT_URL: z.string().url().optional(),
  AWS_S3_BUCKET: z.string().min(1),
} as const;

export const httpEnvSchema = {
  CORS_ORIGIN: z.string().optional(),
} as const;

export const parseEnv = <TShape extends z.ZodRawShape>(
  shape: TShape,
  runtimeEnv: NodeJS.ProcessEnv = process.env
): z.infer<z.ZodObject<TShape>> => {
  const normalizedEnv = Object.fromEntries(
    Object.entries(runtimeEnv).map(([key, value]) => [
      key,
      value === '' ? undefined : value,
    ])
  );

  return z.object(shape).parse(normalizedEnv);
};
