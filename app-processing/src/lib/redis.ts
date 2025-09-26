import { Redis } from 'ioredis';
import 'dotenv/config';

export const redis = new Redis({
  maxRetriesPerRequest: null,
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD,
});
