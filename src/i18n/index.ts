import { uz_latn, type MessageKey } from './locales/uz_latn';
import { ru } from './locales/ru';
import { en } from './locales/en';
import { latnToCyrl } from './translit';

export type Locale = 'uz_latn' | 'uz_cyrl' | 'ru' | 'en';
export const LOCALES: Locale[] = ['uz_latn', 'uz_cyrl', 'ru', 'en'];
export const DEFAULT_LOCALE: Locale = 'uz_latn';

/** uz_cyrl qo'lda yozilmaydi — uz_latn'dan avtomatik hosil qilinadi. */
const uz_cyrl: Record<MessageKey, string> = Object.fromEntries(
  Object.entries(uz_latn).map(([k, v]) => [
    k,
    // Til nomlari o'z yozuvida qoladi
    k.startsWith('lang.') ? v : latnToCyrl(v),
  ]),
) as Record<MessageKey, string>;

const CATALOGS: Record<Locale, Record<MessageKey, string>> = {
  uz_latn,
  uz_cyrl,
  ru,
  en,
};

export type Vars = Record<string, string | number>;

/** `{name}` ko'rinishidagi o'rinbosarlarni almashtiradi. */
function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    key in vars ? String(vars[key]) : m,
  );
}

export function t(locale: Locale, key: MessageKey, vars?: Vars): string {
  const catalog = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
  return interpolate(catalog[key] ?? uz_latn[key] ?? key, vars);
}

/** Bitta suhbat davomida tilni qayta-qayta uzatmaslik uchun. */
export function translator(locale: Locale) {
  return (key: MessageKey, vars?: Vars) => t(locale, key, vars);
}
export type T = ReturnType<typeof translator>;

/** Bazadagi 4 tilli jsonb maydonidan mos matnni oladi. */
export function pick(field: Record<string, string> | null | undefined, locale: Locale): string {
  if (!field) return '';
  return field[locale] || field[DEFAULT_LOCALE] || Object.values(field)[0] || '';
}

/** Telegram `language_code` → bizning locale. */
export function localeFromTelegram(code?: string): Locale {
  if (!code) return DEFAULT_LOCALE;
  const c = code.toLowerCase();
  if (c.startsWith('ru')) return 'ru';
  if (c.startsWith('uz')) return 'uz_latn';
  if (c.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

export type { MessageKey };
