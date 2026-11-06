import { uz_latn, type MessageKey } from './locales/uz_latn';
import { ru } from './locales/ru';
import { en } from './locales/en';
import { latnToCyrl } from './translit';
import type { Locale } from './index';

/** Bot xabarlarining standart matnlari — panelda tahrirlash uchun ochiladi. */
const uz_cyrl = Object.fromEntries(
  Object.entries(uz_latn).map(([k, v]) => [k, k.startsWith('lang.') ? v : latnToCyrl(v)]),
) as Record<MessageKey, string>;

export const ADMIN_TEXT_CATALOGS: Record<Locale, Record<MessageKey, string>> = {
  uz_latn, uz_cyrl, ru, en,
};
