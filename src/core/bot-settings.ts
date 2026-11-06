import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { cached, invalidate } from './cache';
import type { Locale } from '@/i18n';

/**
 * Botning barcha boshqariladigan sozlamalari.
 *
 * Qoida: kodda faqat STANDART qiymat turadi. Advokat paneldan o'zgartirsa,
 * bazadagi qiymat ustun bo'ladi. Bo'sh qoldirilsa — standartga qaytadi.
 * Shu tufayli matn yoki limit o'zgartirish uchun dasturchi kerak emas.
 */

export type I18nText = Partial<Record<Locale, string>>;

export type BotSettings = {
  enabled: boolean;
  maintenance: boolean;
  maintenanceText: I18nText;

  welcome: I18nText;
  disclaimer: I18nText;
  officeAddress: string;
  officePhone: string;
  officeHoursText: string;
  offerUrl: string;

  aiExtraInstruction: string;
  /** lex.uz manbasidan tekshirish. Har savol ~20-45k qo'shimcha token oladi. */
  aiUseLegalSources: boolean;
  aiModelFast: string;
  aiModelDeep: string;
  aiFreeLength: number;
  aiPaidLength: number;

  freeQuestions: number;
  minQuestionLength: number;
  hourlyAiLimit: number;

  workStart: string;
  workEnd: string;
  workDays: number[];
  afterHoursText: I18nText;
};

export const BOT_SETTINGS_KEY = 'bot.settings';

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  enabled: true,
  maintenance: false,
  maintenanceText: {},

  welcome: {},
  disclaimer: {},
  officeAddress: '',
  officePhone: '',
  officeHoursText: '',
  offerUrl: '',

  aiExtraInstruction: '',
  aiUseLegalSources: false,
  aiModelFast: '',
  aiModelDeep: '',
  aiFreeLength: 2000,
  aiPaidLength: 3000,

  freeQuestions: 1,
  minQuestionLength: 25,
  hourlyAiLimit: 12,

  workStart: '09:00',
  workEnd: '18:00',
  workDays: [1, 2, 3, 4, 5],
  afterHoursText: {},
};

export async function getBotSettings(): Promise<BotSettings> {
  return cached(`setting:${BOT_SETTINGS_KEY}`, async () => {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, BOT_SETTINGS_KEY))
      .limit(1);
    const stored = (row?.value ?? {}) as Partial<BotSettings>;
    return { ...DEFAULT_BOT_SETTINGS, ...stored };
  });
}

export async function saveBotSettings(patch: Partial<BotSettings>, updatedBy?: string) {
  const current = await getBotSettings();
  const next = { ...current, ...patch };
  await db
    .insert(settings)
    .values({ key: BOT_SETTINGS_KEY, value: next, updatedBy: updatedBy ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: next, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    });
  invalidate(`setting:${BOT_SETTINGS_KEY}`);
  return next;
}

/** Bazadagi matn bo'sh bo'lsa — standart matn ishlatiladi. */
export function textOr(field: I18nText | undefined, locale: Locale, fallback: string): string {
  const value = field?.[locale]?.trim();
  if (value) return value;
  const uz = field?.uz_latn?.trim();
  return uz || fallback;
}

/** Hozir ish vaqtimi? Ish vaqtidan tashqari mijozga alohida xabar beriladi. */
export function isWorkingHours(s: BotSettings, now = new Date()): boolean {
  // O'zbekiston vaqti (UTC+5) — server qaysi mintaqada bo'lishidan qat'i nazar
  const uz = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60_000);
  const day = uz.getDay() === 0 ? 7 : uz.getDay();
  if (!s.workDays.includes(day)) return false;
  const minutes = uz.getHours() * 60 + uz.getMinutes();
  const [sh, sm] = s.workStart.split(':').map(Number);
  const [eh, em] = s.workEnd.split(':').map(Number);
  return minutes >= sh * 60 + sm && minutes < eh * 60 + em;
}
