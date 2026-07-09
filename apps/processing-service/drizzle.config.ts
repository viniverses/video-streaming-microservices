import 'dotenv/config';

import { databaseEnvSchema, parseEnv } from '@repo/env';
import { defineConfig } from 'drizzle-kit';

const env = parseEnv(databaseEnvSchema);

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  schema: 'src/db/schema/*.ts',
  out: 'src/db/migrations',
  casing: 'snake_case',
});
