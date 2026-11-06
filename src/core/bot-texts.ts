import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { cached, invalidate } from './cache';
import { t as baseT, type Locale, type MessageKey, type Vars, type T } from '@/i18n';

/**
 * Bot xabarlarining paneldan tahrirlanadigan variantlari.
 *
 * Kodda 60 ta standart xabar turadi; advokat ulardan istaganini o'zgartira
 * oladi. Bo'sh qoldirilsa — kodda turgan matn ishlatiladi, ya'ni noto'g'ri
 * tahrir hech qachon botni jim qoldirmaydi.
 */
export const TEXTS_KEY = 'bot.texts';

export type TextOverrides = Partial<Record<MessageKey, Partial<Record<Locale, string>>>>;

export async function getTextOverrides(): Promise<TextOverrides> {
  return cached(`setting:${TEXTS_KEY}`, async () => {
    const [row] = await db.select().from(settings).where(eq(settings.key, TEXTS_KEY)).limit(1);
    return (row?.value ?? {}) as TextOverrides;
  });
}

export async function saveTextOverrides(patch: TextOverrides, updatedBy?: string) {
  const current = await getTextOverrides();
  const next: TextOverrides = { ...current };

  for (const [key, byLocale] of Object.entries(patch)) {
    const merged = { ...(next[key as MessageKey] ?? {}), ...byLocale };
    // Bo'sh satr = "standartga qaytar", shuning uchun saqlanmaydi
    for (const loc of Object.keys(merged) as Locale[]) {
      if (!merged[loc]?.trim()) delete merged[loc];
    }
    if (Object.keys(merged).length === 0) delete next[key as MessageKey];
    else next[key as MessageKey] = merged;
  }

  await db
    .insert(settings)
    .values({ key: TEXTS_KEY, value: next, updatedBy: updatedBy ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: next, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    });
  invalidate(`setting:${TEXTS_KEY}`);
  return next;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Paneldagi matn ustun; bo'lmasa kodda turgan standart. */
export function buildTranslator(locale: Locale, overrides: TextOverrides): T {
  return (key: MessageKey, vars?: Vars) => {
    const custom = overrides[key]?.[locale];
    return custom?.trim() ? interpolate(custom, vars) : baseT(locale, key, vars);
  };
}
