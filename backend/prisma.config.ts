import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 6 configuration for the Nameplate backend.
 *
 * Runtime traffic may use a pooled DATABASE_URL while migration and Studio
 * use DIRECT_URL when Supabase provides one. Local development can omit
 * DIRECT_URL and safely fall back to DATABASE_URL.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL'),
    directUrl: process.env.DIRECT_URL ?? env('DATABASE_URL'),
  },
});
