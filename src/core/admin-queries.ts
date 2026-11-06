import { and, desc, eq, gte, sql, count } from 'drizzle-orm';
import { db } from '@/db';
import {
  conversations, users, messages, caseCards, orders, services,
  aiUsage, funnelEvents, aiAnswers,
} from '@/db/schema';

export type InboxFilter = 'hammasi' | 'advokat_kutmoqda' | 'tolov_kutilmoqda' | 'ai' | 'yopilgan';

/**
 * Inbox ro'yxati: suhbat + mijoz + oxirgi xabar parchasi.
 *
 * Hammasi bir marta olinadi, filtrlash klientda — bosilishi bilan darhol,
 * serverga qayta bormasdan. Telegram ham shunday ishlaydi.
 */
export async function inbox(limit = 200) {
  return db
    .select({
      id: conversations.id,
      status: conversations.status,
      funnelStage: conversations.funnelStage,
      lastMessageAt: conversations.lastMessageAt,
      userName: users.fullName,
      userPhone: users.phone,
      userLocale: users.locale,
      clientType: users.clientType,
      summary: caseCards.summary,
      legalArea: caseCards.legalArea,
      lastBody: sql<string>`(
        select m.body from messages m
        where m.conversation_id = ${conversations.id}
        order by m.created_at desc limit 1
      )`,
      unpaidReceipts: sql<number>`(
        select count(*)::int from orders o
        where o.conversation_id = ${conversations.id} and o.status = 'chek_yuborildi'
      )`,
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .leftJoin(caseCards, eq(caseCards.conversationId, conversations.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
}

export async function conversationDetail(id: string) {
  const [head] = await db
    .select({ conversation: conversations, user: users, card: caseCards })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .leftJoin(caseCards, eq(caseCards.conversationId, conversations.id))
    .where(eq(conversations.id, id))
    .limit(1);
  if (!head) return null;

  const [thread, payments, classification] = await Promise.all([
    db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt),
    db
      .select({ order: orders, service: services })
      .from(orders)
      .leftJoin(services, eq(orders.serviceCode, services.code))
      .where(eq(orders.userId, head.user.id))
      .orderBy(desc(orders.createdAt)),
    db
      .select()
      .from(aiAnswers)
      .where(eq(aiAnswers.conversationId, id))
      .orderBy(desc(aiAnswers.createdAt))
      .limit(1),
  ]);

  return { ...head, thread, payments, latestAi: classification[0] ?? null };
}

/** Chek tasdiqlash navbati. */
export async function pendingPayments() {
  return db
    .select({ order: orders, service: services, user: users })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(services, eq(orders.serviceCode, services.code))
    .where(eq(orders.status, 'chek_yuborildi'))
    .orderBy(desc(orders.receiptAt));
}

export async function recentPayments(limit = 40) {
  return db
    .select({ order: orders, service: services, user: users })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(services, eq(orders.serviceCode, services.code))
    .where(sql`${orders.status} in ('tolandi','rad_etildi')`)
    .orderBy(desc(orders.confirmedAt))
    .limit(limit);
}

/** Voronka va daromad statistikasi. */
export async function stats(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);

  // Sanoqlar Drizzle'ning tipli count() bilan olinadi.
  // Xom sql`` shabloniga Date qo'yib bo'lmaydi: u yerda ustun turi ma'lum emas,
  // shuning uchun postgres.js Date'ni serializatsiya qila olmay yiqiladi.
  const [
    [{ n: usersCount }],
    [{ n: conversationsCount }],
    [{ n: freeAnswersCount }],
    stages,
    revenueRows,
    [ai],
    areas,
  ] = await Promise.all([
    db.select({ n: count() }).from(users).where(gte(users.createdAt, since)),
    db.select({ n: count() }).from(conversations).where(gte(conversations.createdAt, since)),
    db
      .select({ n: count() })
      .from(aiAnswers)
      .where(and(gte(aiAnswers.createdAt, since), eq(aiAnswers.outOfScope, false))),
    db
      .select({ stage: funnelEvents.toStage, n: count() })
      .from(funnelEvents)
      .where(gte(funnelEvents.createdAt, since))
      .groupBy(funnelEvents.toStage),
    db
      .select({
        serviceCode: orders.serviceCode,
        currency: orders.currency,
        n: count(),
        total: sql<number>`coalesce(sum(${orders.amountMinor}),0)::bigint`,
      })
      .from(orders)
      .where(and(eq(orders.status, 'tolandi'), gte(orders.createdAt, since)))
      .groupBy(orders.serviceCode, orders.currency),
    db
      .select({
        calls: count(),
        costMicroUsd: sql<number>`coalesce(sum(${aiUsage.costMicroUsd}),0)::bigint`,
        avgLatency: sql<number>`coalesce(avg(${aiUsage.latencyMs}),0)::int`,
        failures: sql<number>`count(*) filter (where ok = false)::int`,
      })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, since)),
    db
      .select({ area: aiAnswers.legalArea, n: count() })
      .from(aiAnswers)
      .where(and(gte(aiAnswers.createdAt, since), eq(aiAnswers.outOfScope, false)))
      .groupBy(aiAnswers.legalArea)
      .orderBy(desc(count()))
      .limit(8),
  ]);

  return {
    totals: {
      users: usersCount,
      conversations: conversationsCount,
      freeAnswers: freeAnswersCount,
    },
    stages,
    revenueRows,
    ai,
    areas,
    since,
  };
}

/** Bitta chek — tasdiqlash ekranida ko'rsatiladi. */
export async function paymentDetail(orderId: string) {
  const [row] = await db
    .select({ order: orders, service: services, user: users })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .leftJoin(services, eq(orders.serviceCode, services.code))
    .where(eq(orders.id, orderId))
    .limit(1);
  return row ?? null;
}
