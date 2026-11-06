import type { ModelMessage } from 'ai';
import { db } from '@/db';
import { aiAnswers } from '@/db/schema';
import type { BotContext } from '../context';
import { toTelegramHtml, splitMessage } from '../format';
import { ctaKeyboard, phoneKeyboard } from '../keyboards';
import { answerQuestion } from '@/core/ai/chat';
import type { AiAnswer } from '@/core/ai/schema';
import { buildCtas } from '@/core/funnel';
import { getLawyerName } from '@/core/settings';
import { hasFreeQuestion, consumeFreeQuestion } from '@/core/users';
import { balance, consume } from '@/core/entitlements';
import {
  getOrCreateActive, addMessage, recentHistory, advanceFunnel, setStatus,
} from '@/core/conversations';
import { latnToCyrl } from '@/i18n/translit';
import { take } from '@/core/ratelimit';
import { enqueueCaseCard } from '@/core/case-card';
import { getBotSettings, isWorkingHours, textOr } from '@/core/bot-settings';
import { getLegalSources, matchSource } from '@/core/legal-sources';

export async function handleQuestion(ctx: BotContext, question: string) {
  const conversation = await getOrCreateActive(ctx.user.id, 'telegram');
  const cfg = await getBotSettings();

  if (question.trim().length < cfg.minQuestionLength) {
    await ctx.reply(ctx.t('ask.tooShort'));
    return;
  }

  // Qaysi rejim: bepul, pullik yoki balans yo'q
  const free = hasFreeQuestion(ctx.user, cfg.freeQuestions);
  const paidLeft = free ? 0 : await balance(ctx.user.id, 'question');

  if (!free && paidLeft <= 0) {
    await advanceFunnel({ conversation, to: 'bepul_javob_berildi', reason: 'balans tugadi' });
    await offerPurchase(ctx);
    return;
  }

  if (!take(`ai:${ctx.user.id}`, cfg.hourlyAiLimit, 60 * 60_000)) {
    await ctx.reply(ctx.t('error.rateLimit'));
    return;
  }

  await addMessage({ conversationId: conversation.id, sender: 'user', body: question });

  const thinking = await ctx.reply(ctx.t('ask.thinking'));
  const mode = free ? 'free' : 'paid';

  // Manba lokal kalit so'zlar bilan tanlanadi — qo'shimcha AI chaqiruvi yo'q
  const legalSource = cfg.aiUseLegalSources
    ? matchSource(question, await getLegalSources())
    : null;

  const result = await answerQuestion({
    mode,
    locale: ctx.locale,
    lawyerName: await getLawyerName(),
    question,
    history: await buildHistory(conversation.id),
    conversationId: conversation.id,
    extraInstruction: cfg.aiExtraInstruction,
    targetLength: mode === 'free' ? cfg.aiFreeLength : cfg.aiPaidLength,
    modelOverride: mode === 'free' ? cfg.aiModelFast : cfg.aiModelDeep,
    legalSource: legalSource ? { title: legalSource.title, url: legalSource.url } : null,
  });

  await ctx.api.deleteMessage(ctx.chat!.id, thinking.message_id).catch(() => {});

  // Safety filtri bloklagan — tizim jim qolmaydi, savol advokatga boradi.
  if (!result.ok && result.reason === 'safety') {
    await setStatus(conversation.id, 'advokat_kutmoqda');
    await advanceFunnel({ conversation, to: 'advokatga_topshirildi', reason: 'safety blok' });
    await addMessage({
      conversationId: conversation.id,
      sender: 'system',
      body: 'AI safety filtri bloklandi — savol advokat navbatiga qo\'yildi.',
    });
    await ctx.reply(toTelegramHtml(ctx.t('safety.blocked')), { parse_mode: 'HTML' });
    return;
  }

  if (!result.ok) {
    console.error('[ask] AI xatosi:', result.error);
    await ctx.reply(ctx.t('error.generic'));
    return;
  }

  const answer = result.answer;

  // Huquqiy bo'lmagan savol ("salom", "narx qancha") bepul limitni SARFLAMAYDI.
  if (!answer.outOfScope) {
    const charged = free
      ? await consumeFreeQuestion(ctx.user.id, cfg.freeQuestions)
      : await consume(ctx.user.id, 'question');
    if (!charged && !free) {
      await offerPurchase(ctx);
      return;
    }
    if (charged && free) ctx.user.freeQuestionsUsed += 1;
  }

  await deliverAnswer(ctx, conversation.id, answer, mode, cfg);

  if (!answer.outOfScope) {
    await advanceFunnel({
      conversation,
      to: mode === 'free' ? 'bepul_javob_berildi' : 'pullik_faol',
      reason: mode === 'free' ? 'bepul javob berildi' : 'pullik javob berildi',
    });
    // Advokat suhbatni ochganda kontekst tayyor tursin.
    void enqueueCaseCard(conversation.id);
    // Advokat uchun eng qimmatli aktiv — telefon raqami.
    if (mode === 'free' && !ctx.user.phone) {
      await ctx.reply(ctx.t('phone.request'), { reply_markup: phoneKeyboard(ctx.locale) });
    }
  }
}

async function deliverAnswer(
  ctx: BotContext,
  conversationId: string,
  answer: AiAnswer,
  mode: 'free' | 'paid',
  cfg: Awaited<ReturnType<typeof getBotSettings>>,
) {
  // Model faqat lotin yozuvida yozadi; kirill deterministik o'girish bilan olinadi.
  const body = ctx.locale === 'uz_cyrl' ? latnToCyrl(answer.answer) : answer.answer;

  const saved = await addMessage({ conversationId, sender: 'ai', body });
  await db.insert(aiAnswers).values({
    messageId: saved.id,
    conversationId,
    legalArea: answer.legalArea,
    clientTypeGuess: answer.clientTypeGuess,
    urgency: answer.urgency,
    confidence: answer.confidence,
    deadline: answer.deadline ? { ...answer.deadline, endsAt: answer.deadline.endsAt ?? undefined } : null,
    missingInfo: answer.missingInfo,
    needsDocuments: answer.needsDocuments,
    recommendedNext: answer.recommendedNext,
    outOfScope: answer.outOfScope,
  });

  const chunks = splitMessage(toTelegramHtml(body));
  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: 'HTML' });
  }

  if (answer.outOfScope) return;

  const ctas = await buildCtas({ answer, user: ctx.user, locale: ctx.locale, mode });
  const disclaimer = textOr(cfg.disclaimer, ctx.locale, ctx.t('disclaimer'));
  const footer = [
    toTelegramHtml(disclaimer),
    // Ish vaqtidan tashqari — mijoz javobni qachon kutishini bilsin
    !isWorkingHours(cfg) && textOr(cfg.afterHoursText, ctx.locale, '')
      ? `\n${toTelegramHtml(textOr(cfg.afterHoursText, ctx.locale, ''))}`
      : '',
    ctas.length ? `\n<b>${ctx.t('cta.header')}</b>` : '',
  ].filter(Boolean).join('\n');

  await ctx.reply(footer, {
    parse_mode: 'HTML',
    reply_markup: ctaKeyboard(ctas, ctx.locale),
  });
}

/** Balans tugaganda — javob o'rniga aniq taklif. */
async function offerPurchase(ctx: BotContext) {
  const ctas = await buildCtas({
    answer: {
      answer: '', legalArea: 'boshqa', clientTypeGuess: ctx.user.clientType ?? 'jismoniy',
      urgency: 'orta', confidence: 'orta', deadline: null, missingInfo: [],
      needsDocuments: false, recommendedNext: 'paid_question', outOfScope: false,
    },
    user: ctx.user,
    locale: ctx.locale,
    mode: 'paid',
  });
  await ctx.reply(toTelegramHtml(ctx.t('ask.freeUsed')), {
    parse_mode: 'HTML',
    reply_markup: ctaKeyboard(ctas, ctx.locale),
  });
}

/** Oxirgi bir necha xabar — modelga kontekst uchun. */
async function buildHistory(conversationId: string): Promise<ModelMessage[]> {
  const rows = await recentHistory(conversationId, 8);
  return rows
    .filter((m) => m.sender === 'user' || m.sender === 'ai')
    .slice(0, -1)
    .map<ModelMessage>((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.body,
    }));
}
