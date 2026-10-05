import { defineConfig } from 'drizzle-kit';

import { env } from './env.ts';

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  schema: 'src/db/schema/*.ts',
  out: 'src/db/migrations',
  casing: 'snake_case',
});
