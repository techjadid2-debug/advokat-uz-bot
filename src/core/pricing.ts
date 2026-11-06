import { eq, asc } from 'drizzle-orm';
import { db } from '@/db';
import { services, priceHistory } from '@/db/schema';
import { cached, invalidate } from './cache';

/** Xizmat kodlari — kod ichida faqat shular ishlatiladi, narxlar bazada. */
export const SERVICE = {
  QUESTION_PAID: 'question_paid',
  DOCUMENT_PREPARE: 'document_prepare',
  LAWYER_INDIVIDUAL: 'lawyer_individual',
  LAWYER_COMPANY: 'lawyer_company',
  LAWYER_FOREIGN: 'lawyer_foreign',
  PHONE_CONSULT: 'phone_consult',
  DOC_REVIEW_SMALL: 'doc_review_small',
  DOC_REVIEW_LARGE: 'doc_review_large',
  OFFICE_VISIT: 'office_visit',
} as const;

export type ServiceCode = (typeof SERVICE)[keyof typeof SERVICE];
export type Service = typeof services.$inferSelect;

export async function getService(code: string): Promise<Service | null> {
  return cached(`service:${code}`, async () => {
    const [row] = await db.select().from(services).where(eq(services.code, code)).limit(1);
    return row ?? null;
  });
}

export async function listServices(kind?: Service['kind']): Promise<Service[]> {
  const all = await cached('services:all', async () =>
    db.select().from(services).orderBy(asc(services.sortOrder)),
  );
  return all.filter((s) => s.isActive && (!kind || s.kind === kind));
}

/**
 * Narxni o'zgartirish. Har o'zgarish tarixga yoziladi va kesh tozalanadi —
 * bot keyingi xabardayoq yangi narxni ko'rsatadi.
 *
 * Eski buyurtmalarga tegilmaydi: `orders.amountMinor` snapshot bo'lgani uchun
 * kecha chek yuborgan mijozdan qo'shimcha talab qilinmaydi.
 */
export async function updateServicePrice(args: {
  code: string;
  newAmountMinor: number;
  currency?: string;
  changedBy?: string;
}) {
  const current = await getService(args.code);
  if (!current) throw new Error(`Xizmat topilmadi: ${args.code}`);
  const currency = args.currency ?? current.currency;

  await db.transaction(async (tx) => {
    await tx
      .update(services)
      .set({ amountMinor: args.newAmountMinor, currency, updatedAt: new Date() })
      .where(eq(services.code, args.code));
    await tx.insert(priceHistory).values({
      serviceCode: args.code,
      oldAmountMinor: current.amountMinor,
      newAmountMinor: args.newAmountMinor,
      currency,
      changedBy: args.changedBy ?? null,
    });
  });

  invalidate('service:');
  invalidate('services:');
}

export function invalidateServices() {
  invalidate('service:');
  invalidate('services:');
}

/** Mijoz turiga qarab "advokatga ulanish" narxi. */
export function lawyerServiceFor(clientType: 'jismoniy' | 'yuridik' | 'chet_el' | null | undefined): ServiceCode {
  if (clientType === 'yuridik') return SERVICE.LAWYER_COMPANY;
  if (clientType === 'chet_el') return SERVICE.LAWYER_FOREIGN;
  return SERVICE.LAWYER_INDIVIDUAL;
}
