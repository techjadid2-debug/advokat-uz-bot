import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import type { Locale } from '@/i18n';

export type User = typeof users.$inferSelect;

export async function upsertUser(args: {
  channel?: 'telegram' | 'instagram' | 'web';
  externalId: string;
  username?: string | null;
  fullName?: string | null;
  locale?: Locale;
}): Promise<User> {
  const channel = args.channel ?? 'telegram';
  const [row] = await db
    .insert(users)
    .values({
      channel,
      externalId: args.externalId,
      username: args.username ?? null,
      fullName: args.fullName ?? null,
      ...(args.locale ? { locale: args.locale } : {}),
    })
    .onConflictDoUpdate({
      target: [users.channel, users.externalId],
      // Tilni bu yerda YANGILAMAYMIZ: mijoz botda tanlagan til
      // Telegram sozlamasidan ustun turadi.
      set: {
        username: args.username ?? null,
        fullName: args.fullName ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function setLocale(userId: string, locale: Locale) {
  await db.update(users).set({ locale, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function setPhone(userId: string, phone: string) {
  await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function setClientType(userId: string, clientType: User['clientType']) {
  await db.update(users).set({ clientType, updatedAt: new Date() }).where(eq(users.id, userId));
}

export const hasFreeQuestion = (u: User, limit = 1) => u.freeQuestionsUsed < limit;

/**
 * Bepul savolni sarflash. Limit paneldan boshqariladi (standart — 1 ta).
 *
 * Shart bilan yoziladi: parallel ikki xabar kelganda ham limitdan oshib
 * ketmaydi. `true` qaytsa — shu chaqiruv sarfladi.
 */
export async function consumeFreeQuestion(userId: string, limit = 1): Promise<boolean> {
  const res = await db
    .update(users)
    .set({
      freeQuestionsUsed: sql`${users.freeQuestionsUsed} + 1`,
      freeQuestionUsedAt: sql`coalesce(${users.freeQuestionUsedAt}, now())`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), sql`${users.freeQuestionsUsed} < ${limit}`))
    .returning({ id: users.id });
  return res.length > 0;
}

export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}
