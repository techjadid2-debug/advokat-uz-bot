import type { BotContext } from '../context';
import { toTelegramHtml } from '../format';
import { ctaKeyboard, languageKeyboard, mainMenu } from '../keyboards';
import { listServices, lawyerServiceFor } from '@/core/pricing';
import { balance } from '@/core/entitlements';
import { hasFreeQuestion } from '@/core/users';
import { getBotSettings } from '@/core/bot-settings';
import { getOrCreateActive, advanceFunnel, setStatus, addMessage } from '@/core/conversations';
import { getService } from '@/core/pricing';
import { pick } from '@/i18n';
import { formatMoney } from '@/core/money';

export async function showServices(ctx: BotContext) {
  const all = await listServices();
  const online = all.filter((s) => s.kind !== 'offline');
  const offline = all.filter((s) => s.kind === 'offline');

  const line = (s: (typeof all)[number]) =>
    `• ${pick(s.title, ctx.locale)} — <b>${
      s.amountMinor > 0 ? formatMoney(s.amountMinor, s.currency, ctx.locale) : ctx.t('services.free')
    }</b>`;

  const parts = [toTelegramHtml(ctx.t('services.title')), ''];
  if (online.length) {
    parts.push(toTelegramHtml(ctx.t('services.online')), ...online.map(line), '');
  }
  if (offline.length) {
    parts.push(toTelegramHtml(ctx.t('services.offline')), ...offline.map(line));
  }

  await ctx.reply(parts.join('\n'), { parse_mode: 'HTML' });
}

export async function showBalance(ctx: BotContext) {
  const [q, d, cfg] = await Promise.all([
    balance(ctx.user.id, 'question'),
    balance(ctx.user.id, 'document'),
    getBotSettings(),
  ]);
  const lines = [
    toTelegramHtml(ctx.t('balance.title')),
    '',
    toTelegramHtml(ctx.t('balance.free', {
      state: hasFreeQuestion(ctx.user, cfg.freeQuestions)
        ? ctx.t('balance.freeAvailable')
        : ctx.t('balance.freeUsed'),
    })),
    toTelegramHtml(ctx.t('balance.questions', { n: q })),
    toTelegramHtml(ctx.t('balance.documents', { n: d })),
  ];
  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
}

/** "Advokat bilan bog'lanish" — huquq bo'lsa navbatga, bo'lmasa to'lov taklifi. */
export async function requestLawyer(ctx: BotContext) {
  const conversation = await getOrCreateActive(ctx.user.id, 'telegram');
  const paid = await balance(ctx.user.id, 'consultation');

  if (paid > 0) {
    await setStatus(conversation.id, 'advokat_kutmoqda');
    await advanceFunnel({ conversation, to: 'advokatga_topshirildi', reason: 'mijoz o\'zi so\'radi' });
    await addMessage({
      conversationId: conversation.id,
      sender: 'system',
      body: 'Mijoz advokat bilan bog\'lanishni so\'radi.',
    });
    await ctx.reply(toTelegramHtml(ctx.t('lawyer.queued')), { parse_mode: 'HTML' });
    return;
  }

  const code = lawyerServiceFor(ctx.user.clientType);
  const svc = await getService(code);
  if (!svc) {
    await ctx.reply(ctx.t('error.generic'));
    return;
  }
  await advanceFunnel({ conversation, to: 'ofis_taklif', reason: 'advokat tugmasi' });
  await ctx.reply(toTelegramHtml(ctx.t('cta.header')), {
    parse_mode: 'HTML',
    reply_markup: ctaKeyboard(
      [{
        serviceCode: code,
        labelKey: 'cta.lawyer_handoff',
        price: formatMoney(svc.amountMinor, svc.currency, ctx.locale),
        callbackData: `buy:${code}`,
      }],
      ctx.locale,
    ),
  });
}

export async function showLanguages(ctx: BotContext) {
  await ctx.reply(ctx.t('lang.choose'), { reply_markup: languageKeyboard() });
}

export async function showMenu(ctx: BotContext, text: string) {
  await ctx.reply(text, { reply_markup: mainMenu(ctx.locale), parse_mode: 'HTML' });
}
