import { Bot, type Context } from 'grammy';
import { attach, type BotContext } from './context';
import { upsertUser, setLocale, setPhone } from '@/core/users';
import { localeFromTelegram, t, type Locale, LOCALES } from '@/i18n';
import { mainMenu } from './keyboards';
import { toTelegramHtml } from './format';
import { handleQuestion } from './handlers/ask';
import { handleBuy, handleReceipt } from './handlers/payment';
import { showServices, showBalance, requestLawyer, showLanguages } from './handlers/menu';
import { getLawyerName } from '@/core/settings';
import { getBotSettings, textOr } from '@/core/bot-settings';
import { getTextOverrides } from '@/core/bot-texts';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const globalForBot = globalThis as unknown as { __bot?: Bot };

export function bot(): Bot {
  if (globalForBot.__bot) return globalForBot.__bot;
  const b = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
  register(b);
  globalForBot.__bot = b;
  return b;
}

function register(b: Bot) {
  /** Har xabarda mijoz bazadan olinadi (yoki yaratiladi) va kontekstga biriktiriladi. */
  b.use(async (ctx, next) => {
    if (!ctx.from || ctx.from.is_bot) return;
    const user = await upsertUser({
      channel: 'telegram',
      externalId: String(ctx.from.id),
      username: ctx.from.username ?? null,
      fullName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || null,
      locale: localeFromTelegram(ctx.from.language_code),
    });
    if (user.isBlocked) return;
    attach(ctx, user, await getTextOverrides());

    // Bot o'chirilgan yoki texnik ishlar rejimida — mijoz sabab bilishi kerak,
    // javobsiz qolgan xabar eng yomon taassurot qoldiradi.
    const cfg = await getBotSettings();
    if (!cfg.enabled) return;
    if (cfg.maintenance) {
      const text = textOr(cfg.maintenanceText, user.locale as never, '');
      if (text) await ctx.reply(toTelegramHtml(text), { parse_mode: 'HTML' });
      return;
    }

    await next();
  });

  b.command('start', async (ctx) => {
    const c = ctx as BotContext;
    // Til hali tanlanmagan bo'lsa — birinchi qadam til tanlash.
    if (!c.user.localeChosenAt) {
      await ctx.reply(t(c.locale, 'lang.choose'), { reply_markup: (await import('./keyboards')).languageKeyboard() });
      return;
    }
    await sendWelcome(c);
  });

  b.callbackQuery(/^lang:(.+)$/, async (ctx) => {
    const c = ctx as BotContext;
    const chosen = ctx.match[1] as Locale;
    if (!LOCALES.includes(chosen)) return ctx.answerCallbackQuery();
    await setLocale(c.user.id, chosen);
    await db.update(users).set({ localeChosenAt: new Date() }).where(eq(users.id, c.user.id));
    c.user.locale = chosen;
    c.user.localeChosenAt = new Date();
    attach(ctx, c.user, await getTextOverrides());
    await ctx.answerCallbackQuery({ text: c.t('lang.changed') });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await sendWelcome(c);
  });

  b.callbackQuery(/^buy:(.+)$/, async (ctx) => {
    const c = ctx as BotContext;
    await ctx.answerCallbackQuery();
    await handleBuy(c, ctx.match[1]);
  });

  b.on('message:contact', async (ctx) => {
    const c = ctx as BotContext;
    const phone = ctx.message.contact.phone_number;
    await setPhone(c.user.id, phone);
    c.user.phone = phone;
    await ctx.reply(c.t('phone.saved'), { reply_markup: mainMenu(c.locale) });
  });

  b.on('message:photo', async (ctx) => {
    const c = ctx as BotContext;
    const photo = ctx.message.photo.at(-1);
    if (!photo) return;
    await handleReceipt(c, photo.file_id);
  });

  b.on('message:text', async (ctx) => {
    const c = ctx as BotContext;
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    switch (matchMenu(text, c.locale)) {
      case 'ask':      return void ctx.reply(c.t('start.askNow'));
      case 'services': return void (await showServices(c));
      case 'balance':  return void (await showBalance(c));
      case 'lawyer':   return void (await requestLawyer(c));
      case 'language': return void (await showLanguages(c));
      case 'skip':     return void ctx.reply(c.t('common.menu'), { reply_markup: mainMenu(c.locale) });
      default:         return void (await handleQuestion(c, text));
    }
  });

  b.catch((err) => {
    console.error('[bot] ishlov berilmagan xato:', err.error);
  });
}

async function sendWelcome(ctx: BotContext) {
  const name = ctx.user.fullName?.split(' ')[0] ?? '';
  const cfg = await getBotSettings();
  const lawyer = await getLawyerName();
  // Paneldagi matn ustun; bo'sh bo'lsa — kodda turgan standart matn
  const custom = textOr(cfg.welcome, ctx.locale, '');
  const text = custom
    ? custom.replace(/\{name\}/g, name).replace(/\{lawyer\}/g, lawyer)
    : ctx.t('start.welcome', { name, lawyer });
  await ctx.reply(toTelegramHtml(text), {
    parse_mode: 'HTML',
    reply_markup: mainMenu(ctx.locale),
  });
}

type MenuAction = 'ask' | 'services' | 'balance' | 'lawyer' | 'language' | 'skip' | null;

/** Menyu tugmalari 4 tilda — barcha tillardagi matn bilan solishtiriladi. */
function matchMenu(text: string, locale: Locale): MenuAction {
  const check = (key: Parameters<typeof t>[1], action: MenuAction): MenuAction =>
    LOCALES.some((l) => t(l, key) === text) || t(locale, key) === text ? action : null;
  return (
    check('menu.ask', 'ask') ??
    check('menu.services', 'services') ??
    check('menu.balance', 'balance') ??
    check('menu.lawyer', 'lawyer') ??
    check('menu.language', 'language') ??
    check('phone.skip', 'skip')
  );
}

export type { BotContext, Context };
