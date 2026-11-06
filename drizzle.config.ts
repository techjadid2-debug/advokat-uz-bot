import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

config({ path: '.env.local', quiet: true });

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Migratsiya to'g'ridan-to'g'ri ulanish orqali ketadi: pooler (PgBouncer)
  // transaction rejimida ishlaydi va DDL uchun mos emas.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL! },
  casing: 'snake_case',
} satisfies Config;
