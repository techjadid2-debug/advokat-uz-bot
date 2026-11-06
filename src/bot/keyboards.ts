import { InlineKeyboard, Keyboard } from 'grammy';
import type { Cta } from '@/core/funnel';
import { t, type Locale, LOCALES } from '@/i18n';

export function languageKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const loc of LOCALES) {
    kb.text(t(loc, `lang.${loc}` as const), `lang:${loc}`).row();
  }
  return kb;
}

export function mainMenu(locale: Locale): Keyboard {
  return new Keyboard()
    .text(t(locale, 'menu.ask')).row()
    .text(t(locale, 'menu.services')).text(t(locale, 'menu.balance')).row()
    .text(t(locale, 'menu.lawyer')).text(t(locale, 'menu.language')).row()
    .resized()
    .persistent();
}

/** AI javobi ostidagi tugmalar. Narx bazadan keladi, AI yozmaydi. */
export function ctaKeyboard(ctas: Cta[], locale: Locale): InlineKeyboard | undefined {
  if (!ctas.length) return undefined;
  const kb = new InlineKeyboard();
  for (const cta of ctas) {
    const label = t(locale, cta.labelKey, { price: cta.price ?? '' })
      .replace(/\s*—\s*$/, '')
      .trim();
    kb.text(label, cta.callbackData).row();
  }
  return kb;
}

export function phoneKeyboard(locale: Locale): Keyboard {
  return new Keyboard()
    .requestContact(t(locale, 'phone.button')).row()
    .text(t(locale, 'phone.skip'))
    .resized()
    .oneTime();
}
