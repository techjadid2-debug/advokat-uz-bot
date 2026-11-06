import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import postgres from 'postgres';
import ws from 'ws';
import * as schema from './schema';

/**
 * Baza ulanishi ikki muhitga moslashadi.
 *
 * Serverless (Vercel) — Neon'ning WebSocket drayveri. `postgres.js` har
 * chaqiruvda yangi TCP+TLS ulanish quradi; o'lchovda bu sovuq so'rovni
 * 46 soniyaga, issiqni 3.6 soniyaga cho'zdi. Neon drayveri serverless uchun
 * yozilgan va tranzaksiyalarni qo'llab-quvvatlaydi (bizda 5 joyda kerak,
 * shuning uchun tezroq HTTP drayveri yaramaydi).
 *
 * O'z serverimiz (lokal, VPS) — `postgres.js`. Doimiy jarayonda ulanish
 * havzasi tirik qoladi, bu eng tez variant.
 */
export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Db };

function createDb(): Db {
  if (process.env.VERCEL) {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    // Ikki drayverning tiplari boshqa, lekin API yuzasi bir xil
    return drizzleNeon(pool, { schema, casing: 'snake_case' }) as unknown as Db;
  }

  const sql = postgres(process.env.DATABASE_URL!, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzlePg(sql, { schema, casing: 'snake_case' });
}

function getDb(): Db {
  if (!globalForDb.__db) globalForDb.__db = createDb();
  return globalForDb.__db;
}

export const db = getDb();
export { schema };
