import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { schema } from './schema/index.ts';

export const db = drizzle(process.env.DATABASE_URL!, {
  schema,
  casing: 'snake_case',
});
