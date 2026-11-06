import { and, eq, gt, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import { entitlements } from '@/db/schema';

export type Kind = 'question' | 'document' | 'consultation';

export async function balance(userId: string, kind: Kind): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${entitlements.remaining}), 0)::int` })
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), eq(entitlements.kind, kind), gt(entitlements.remaining, 0)));
  return row?.total ?? 0;
}

export async function grant(args: {
  userId: string;
  kind: Kind;
  qty: number;
  sourceOrderId?: string | null;
}) {
  await db.insert(entitlements).values({
    userId: args.userId,
    kind: args.kind,
    remaining: args.qty,
    sourceOrderId: args.sourceOrderId ?? null,
  });
}

/**
 * Bitta huquqni sarflaydi. Eng eski partiyadan boshlab yechadi.
 * `false` qaytsa — balans yo'q, mijozdan to'lov so'raladi.
 */
export async function consume(userId: string, kind: Kind): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: entitlements.id })
      .from(entitlements)
      .where(and(eq(entitlements.userId, userId), eq(entitlements.kind, kind), gt(entitlements.remaining, 0)))
      .orderBy(desc(entitlements.createdAt))
      .limit(1)
      .for('update');
    if (!row) return false;
    await tx
      .update(entitlements)
      .set({ remaining: sql`${entitlements.remaining} - 1` })
      .where(eq(entitlements.id, row.id));
    return true;
  });
}
