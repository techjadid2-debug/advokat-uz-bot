import { and, eq, ne, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { orders, entitlements } from '@/db/schema';
import { getService } from './pricing';
import { getActivePaymentAccount } from './settings';
import { emit } from './events';

export type Order = typeof orders.$inferSelect;

/** Har buyurtmaga unikal kod — mijoz to'lov izohiga yozadi, advokat tez topadi. */
async function generateRefCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const len = attempt < 8 ? 4 : 6;
    const max = 10 ** len;
    const code = String(Math.floor(Math.random() * max)).padStart(len, '0');
    const [clash] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.refCode, code))
      .limit(1);
    if (!clash) return code;
  }
  throw new Error('Unikal to\'lov kodi yaratib bo\'lmadi');
}

export type CreateOrderResult =
  | { ok: true; order: Order; card: { number: string; holder: string } }
  | { ok: false; reason: 'no_service' | 'no_payment_account' };

export async function createOrder(args: {
  userId: string;
  serviceCode: string;
  conversationId?: string | null;
}): Promise<CreateOrderResult> {
  const service = await getService(args.serviceCode);
  if (!service || !service.isActive) return { ok: false, reason: 'no_service' };

  const account = await getActivePaymentAccount(service.currency);
  if (!account) return { ok: false, reason: 'no_payment_account' };

  const refCode = await generateRefCode();
  const [order] = await db
    .insert(orders)
    .values({
      userId: args.userId,
      conversationId: args.conversationId ?? null,
      serviceCode: service.code,
      // SNAPSHOT: narx ertaga oshsa ham bu buyurtma o'zgarmaydi.
      amountMinor: service.amountMinor,
      currency: service.currency,
      cardNumber: account.cardNumber,
      cardHolder: account.holderName,
      refCode,
      provider: 'manual_card',
      status: 'kutilmoqda',
    })
    .returning();

  return { ok: true, order, card: { number: account.cardNumber, holder: account.holderName } };
}

/** Mijozning chek kutayotgan oxirgi buyurtmasi. */
export async function pendingOrder(userId: string): Promise<Order | null> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), inArray(orders.status, ['kutilmoqda'])))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return row ?? null;
}

export type ReceiptResult =
  | { ok: true; order: Order }
  | { ok: false; reason: 'no_pending' | 'duplicate' };

/**
 * Chek biriktirish. Bir xil rasm ikkinchi marta yuborilsa — rad etiladi.
 * Chek soxtalashtirishning eng arzon usuli boshqa odamning chekini qayta yuborish.
 */
export async function attachReceipt(args: {
  userId: string;
  fileId: string;
  sha256: string;
}): Promise<ReceiptResult> {
  const order = await pendingOrder(args.userId);
  if (!order) return { ok: false, reason: 'no_pending' };

  const [dup] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.receiptSha256, args.sha256), ne(orders.id, order.id)))
    .limit(1);
  if (dup) return { ok: false, reason: 'duplicate' };

  const [updated] = await db
    .update(orders)
    .set({
      receiptFileId: args.fileId,
      receiptSha256: args.sha256,
      receiptAt: new Date(),
      status: 'chek_yuborildi',
    })
    .where(eq(orders.id, order.id))
    .returning();

  // Chek kelgani — advokat uchun eng shoshilinch signal
  void emit({
    type: 'receipt',
    orderId: updated.id,
    conversationId: updated.conversationId,
    refCode: updated.refCode,
    at: new Date().toISOString(),
  });

  return { ok: true, order: updated };
}

/** Advokat tasdiqlaydi → huquq beriladi → mijozga darhol xabar ketadi. */
export async function confirmOrder(orderId: string, adminId: string): Promise<Order | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status === 'tolandi') return null;

  const service = await getService(order.serviceCode);

  const [updated] = await db.transaction(async (tx) => {
    const res = await tx
      .update(orders)
      .set({ status: 'tolandi', confirmedBy: adminId, confirmedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (service?.grantsKind) {
      await tx.insert(entitlements).values({
        userId: order.userId,
        kind: service.grantsKind,
        remaining: service.grantsQty,
        sourceOrderId: order.id,
      });
    }
    return res;
  });

  return updated ?? null;
}

export async function rejectOrder(orderId: string, adminId: string, reason: string): Promise<Order | null> {
  const [updated] = await db
    .update(orders)
    .set({ status: 'rad_etildi', confirmedBy: adminId, confirmedAt: new Date(), rejectionReason: reason })
    .where(eq(orders.id, orderId))
    .returning();
  return updated ?? null;
}

export async function listPendingReceipts(): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.status, 'chek_yuborildi'))
    .orderBy(desc(orders.receiptAt));
}
