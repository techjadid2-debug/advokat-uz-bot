import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings, paymentAccounts } from '@/db/schema';
import { cached, invalidate } from './cache';

export const SETTING_KEYS = {
  lawyerName: 'lawyer.name',
  officeAddress: 'office.address',
  officePhone: 'office.phone',
  workingHours: 'office.working_hours',
  offerUrl: 'legal.offer_url',
} as const;

const DEFAULTS: Record<string, unknown> = {
  [SETTING_KEYS.lawyerName]: 'Muzaffar Turdimatov',
  [SETTING_KEYS.officeAddress]: '',
  [SETTING_KEYS.officePhone]: '',
  [SETTING_KEYS.workingHours]: '',
  [SETTING_KEYS.offerUrl]: '',
};

export async function getSetting<T = string>(key: string): Promise<T> {
  return cached(`setting:${key}`, async () => {
    const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return (row?.value ?? DEFAULTS[key] ?? '') as T;
  });
}

export async function setSetting(key: string, value: unknown, updatedBy?: string) {
  await db
    .insert(settings)
    .values({ key, value, updatedBy: updatedBy ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    });
  invalidate(`setting:${key}`);
}

export const getLawyerName = () => getSetting<string>(SETTING_KEYS.lawyerName);

/**
 * Aktiv to'lov kartasi. Karta bloklanishi yoki bank almashishi odatiy hol —
 * shuning uchun raqam kodda emas, bazada va paneldan bir daqiqada almashtiriladi.
 */
export async function getActivePaymentAccount(currency = 'UZS') {
  return cached(`payacc:${currency}`, async () => {
    const rows = await db
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.isActive, true));
    return rows.find((r) => r.currency === currency) ?? rows[0] ?? null;
  });
}

export const invalidatePaymentAccounts = () => invalidate('payacc:');
