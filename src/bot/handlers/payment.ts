import { createHash } from 'node:crypto';
import type { BotContext } from '../context';
import { toTelegramHtml } from '../format';
import { createOrder, attachReceipt } from '@/core/orders';
import { getService } from '@/core/pricing';
import { getOrCreateActive, addMessage } from '@/core/conversations';
import { formatMoney } from '@/core/money';
import { pick } from '@/i18n';

/** Mijoz CTA tugmasini bosdi → buyurtma yaratiladi va to'lov ko'rsatmasi beriladi. */
export async function handleBuy(ctx: BotContext, serviceCode: string) {
  const conversation = await getOrCreateActive(ctx.user.id, 'telegram');
  const service = await getService(serviceCode);
  if (!service) {
    await ctx.answerCallbackQuery({ text: ctx.t('error.generic'), show_alert: true });
    return;
  }

  const res = await createOrder({
    userId: ctx.user.id,
    serviceCode,
    conversationId: conversation.id,
  });

  if (!res.ok) {
    await ctx.reply(
      ctx.t(res.reason === 'no_payment_account' ? 'pay.noAccount' : 'error.generic'),
    );
    return;
  }

  const text = ctx.t('pay.instructions', {
    service: pick(service.title, ctx.locale),
    amount: formatMoney(res.order.amountMinor, res.order.currency, ctx.locale),
    card: res.card.number,
    holder: res.card.holder,
    ref: res.order.refCode,
  });

  await ctx.reply(toTelegramHtml(`${ctx.t('pay.title')}\n\n${text}`), { parse_mode: 'HTML' });
  await addMessage({
    conversationId: conversation.id,
    sender: 'system',
    body: `Buyurtma yaratildi: ${service.code}, kod ${res.order.refCode}`,
  });
}

/** Mijoz chek rasmini yubordi. */
export async function handleReceipt(ctx: BotContext, fileId: string) {
  const sha = await hashTelegramFile(ctx, fileId);
  const res = await attachReceipt({ userId: ctx.user.id, fileId, sha256: sha });

  if (!res.ok) {
    await ctx.reply(
      ctx.t(res.reason === 'duplicate' ? 'pay.duplicateReceipt' : 'error.generic'),
    );
    return;
  }

  await ctx.reply(toTelegramHtml(ctx.t('pay.receiptReceived')), { parse_mode: 'HTML' });

  const conversation = await getOrCreateActive(ctx.user.id, 'telegram');
  await addMessage({
    conversationId: conversation.id,
    sender: 'user',
    body: `[chek yuborildi — buyurtma ${res.order.refCode}]`,
    attachments: [{ kind: 'photo', fileId, sha256: sha }],
  });

  await notifyAdmins(ctx, res.order.refCode, fileId);
}

/**
 * Chek rasmining SHA-256 hashi. Bir xil rasmni ikkinchi marta yuborish —
 * chek soxtalashtirishning eng arzon usuli, shuning uchun hash saqlanadi.
 */
async function hashTelegramFile(ctx: BotContext, fileId: string): Promise<string> {
  const file = await ctx.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  return createHash('sha256').update(buf).digest('hex');
}

/** Faza 1'da panel hali yo'q — advokat chek kelganini Telegram orqali biladi. */
async function notifyAdmins(ctx: BotContext, refCode: string, fileId: string) {
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!chatId) return;
  const who = ctx.user.fullName ?? ctx.user.username ?? ctx.user.externalId;
  await ctx.api
    .sendPhoto(chatId, fileId, {
      caption: `💳 Yangi chek\nKod: ${refCode}\nMijoz: ${who}`,
    })
    .catch((e) => console.error('[notify] admin xabari yuborilmadi:', e));
}
