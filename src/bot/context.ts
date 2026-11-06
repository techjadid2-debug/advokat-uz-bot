import type { Context } from 'grammy';
import type { User } from '@/core/users';
import { type Locale, type T } from '@/i18n';
import { buildTranslator, type TextOverrides } from '@/core/bot-texts';

export type BotContext = Context & {
  user: User;
  locale: Locale;
  t: T;
};

/**
 * `overrides` — paneldan tahrirlangan matnlar. Ular keshlangan, shuning uchun
 * har xabarda bazaga bormaydi.
 */
export function attach(ctx: Context, user: User, overrides: TextOverrides): asserts ctx is BotContext {
  const c = ctx as BotContext;
  c.user = user;
  c.locale = user.locale as Locale;
  c.t = buildTranslator(c.locale, overrides);
}
