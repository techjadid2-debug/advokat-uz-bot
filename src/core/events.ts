import postgres from 'postgres';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * Real-time hodisalar — Postgres LISTEN/NOTIFY orqali.
 *
 * Nega so'rov (polling) emas: advokat panelni ochiq qoldiradi, va har 5
 * soniyada bazaga so'rov yuborish ham serverni, ham batareyani behuda yeydi.
 * NOTIFY esa faqat haqiqatan biror narsa bo'lganda uyg'otadi.
 */
export const CHANNEL = 'advokat_events';

export type AppEvent =
  | { type: 'message'; conversationId: string; sender: string; preview: string; at: string }
  | { type: 'receipt'; orderId: string; conversationId: string | null; refCode: string; at: string }
  | { type: 'conversation'; conversationId: string; status: string; at: string };

/** Hodisani e'lon qilish. Xato bo'lsa asosiy amalni to'xtatmaydi. */
export async function emit(event: AppEvent): Promise<void> {
  try {
    await db.execute(sql`select pg_notify(${CHANNEL}, ${JSON.stringify(event)})`);
  } catch (e) {
    console.error('[events] e\'lon qilib bo\'lmadi:', e);
  }
}

/**
 * Tinglash uchun ALOHIDA ulanish kerak: LISTEN ushlab turadigan ulanishni
 * oddiy so'rovlar bilan bo'lishib bo'lmaydi.
 */
export function createListener() {
  /**
   * LISTEN pooler (PgBouncer) orqali ishlamaydi: u transaction rejimida
   * ulanishni har so'rovdan keyin qaytarib yuboradi va sessiya yo'qoladi.
   * Neon shuning uchun alohida "unpooled" manzil beradi.
   */
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
  return postgres(url, { max: 1, idle_timeout: 0 });
}
