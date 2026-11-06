import { admin_uz_latn, type AdminKey } from './admin-uz';
import { admin_ru, admin_en } from './admin-ru-en';
import { latnToCyrl } from './translit';
import type { Locale } from './index';

/** uz_cyrl qo'lda yozilmaydi — uz_latn'dan avtomatik. */
const admin_uz_cyrl = Object.fromEntries(
  Object.entries(admin_uz_latn).map(([k, v]) => [k, latnToCyrl(v)]),
) as Record<AdminKey, string>;

export const ADMIN_CATALOGS: Record<Locale, Record<AdminKey, string>> = {
  uz_latn: admin_uz_latn,
  uz_cyrl: admin_uz_cyrl,
  ru: admin_ru,
  en: admin_en,
};

export function adminT(locale: Locale, key: AdminKey, vars?: Record<string, string | number>): string {
  const template = ADMIN_CATALOGS[locale]?.[key] ?? admin_uz_latn[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export type AdminT = (key: AdminKey, vars?: Record<string, string | number>) => string;

export const adminTranslator = (locale: Locale): AdminT => (key, vars) => adminT(locale, key, vars);

export type { AdminKey };
