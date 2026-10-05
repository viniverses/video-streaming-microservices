import { drizzle } from 'drizzle-orm/node-postgres';

import { env } from '../../env.ts';
import { schema } from './schema/index.ts';

export const db = drizzle(env.DATABASE_URL, {
  schema,
  casing: 'snake_case',
});
