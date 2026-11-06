/**
 * Pul minor birlikda saqlanadi (UZS → tiyin, USD → sent; ikkalasi ham x100).
 * Float arifmetikasi ishlatilmaydi — pul masalasida yaxlitlash xatosi qabul qilinmaydi.
 */
import type { Locale } from '@/i18n';

export const toMinor = (major: number) => Math.round(major * 100);
export const toMajor = (minor: number) => minor / 100;

const SUFFIX: Record<Locale, Record<string, string>> = {
  uz_latn: { UZS: "so'm", USD: '$' },
  uz_cyrl: { UZS: 'сўм', USD: '$' },
  ru:      { UZS: 'сум', USD: '$' },
  en:      { UZS: 'UZS', USD: '$' },
};

export function formatMoney(amountMinor: number, currency: string, locale: Locale): string {
  const major = toMajor(amountMinor);
  if (currency === 'USD') return `$${major.toFixed(major % 1 === 0 ? 0 : 2)}`;
  // UZS: 50000 → "50 000 so'm"
  const whole = Math.round(major);
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped} ${SUFFIX[locale]?.[currency] ?? currency}`;
}
