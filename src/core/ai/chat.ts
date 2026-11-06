import { generateObject, generateText, type ModelMessage } from 'ai';
import { aiAnswerSchema, type AiAnswer } from './schema';
import { systemPrompt, NEUTRAL_REFRAME, type ChatMode } from './prompts';
import {
  modelFor, fastModel, fastChain, deepChain, googleOptions,
  isSafetyBlock, shouldTryNextModel, supportsGrounding, MODEL_FAST,
} from './provider';
import { google } from '@ai-sdk/google';
import { logUsage } from './usage';
import type { Locale } from '@/i18n';

export type ChatResult =
  | { ok: true; answer: AiAnswer; model: string; reframed: boolean; sourceRead: boolean }
  /** Safety filtri ikki urinishda ham bloklagan → savol advokat navbatiga tushadi. */
  | { ok: false; reason: 'safety'; model: string }
  | { ok: false; reason: 'error'; model: string; error: string };

export type ChatInput = {
  mode: ChatMode;
  locale: Locale;
  lawyerName: string;
  question: string;
  /** Oldingi xabarlar — eng yangisi oxirida. */
  history?: ModelMessage[];
  conversationId?: string | null;
  /** Paneldan boshqariladigan sozlamalar. */
  extraInstruction?: string;
  targetLength?: number;
  modelOverride?: string;
  /** lex.uz manbasi — berilsa, model uni ochib o'qiydi. */
  legalSource?: { title: string; url: string } | null;
};

export async function answerQuestion(input: ChatInput): Promise<ChatResult> {
  const base = input.mode === 'free' ? fastChain() : deepChain();
  const withOverride = input.modelOverride?.trim()
    ? [input.modelOverride.trim(), ...base.filter((m) => m !== input.modelOverride?.trim())]
    : base;

  /**
   * Manba so'ralganda havolani ocha oladigan modellar oldinga chiqadi —
   * aks holda birinchi urinish behuda ketadi va javob xotiradan chiqadi.
   */
  const models = input.legalSource
    ? [...withOverride].sort((a, b) => Number(supportsGrounding(b)) - Number(supportsGrounding(a)))
    : withOverride;
  const purpose = input.mode === 'free' ? 'chat_free' : 'chat_paid';
  /**
   * Manba qoidasi FAQAT havolani chindan ocha oladigan modelga beriladi.
   * Aks holda model "manba oldingda" deb o'ylab, taxminiy modda raqamini
   * ishonch bilan yozadi.
   */
  const systemFor = (modelId: string, grounded: boolean) =>
    systemPrompt({
      mode: input.mode,
      locale: input.locale,
      lawyerName: input.lawyerName,
      extraInstruction: input.extraInstruction,
      targetLength: input.targetLength,
      hasSource: grounded,
    });

  /**
   * Havola FOYDALANUVCHI xabariga qo'shiladi.
   * Sinovda aniqlandi: system prompt'dagi havolani model o'qimaydi —
   * u yerda turgan havolani e'tiborsiz qoldirib, xotiradan javob beradi.
   */
  const withSource = (q: string) =>
    input.legalSource ? `${q}\n\n[Manba: ${input.legalSource.title} — ${input.legalSource.url}]` : q;

  const askOnce = async (modelId: string, question: string): Promise<{ answer: AiAnswer; sourceRead: boolean }> => {
    const started = Date.now();
    const grounded = !!input.legalSource && supportsGrounding(modelId);
    try {
      const res = await generateObject({
        model: modelFor(modelId),
        schema: aiAnswerSchema,
        system: systemFor(modelId, grounded),
        messages: [
          ...(input.history ?? []),
          { role: 'user', content: grounded ? withSource(question) : question },
        ],
        providerOptions: googleOptions(),
        ...(grounded ? { tools: { url_context: google.tools.urlContext({}) } as never } : {}),
        maxRetries: 1,
      });

      // Havola chindan ochildimi — javobga ishonish darajasi shunga bog'liq
      const meta = (res.providerMetadata?.google as
        { urlContextMetadata?: { urlMetadata?: { urlRetrievalStatus?: string }[] } } | undefined)
        ?.urlContextMetadata;
      const sourceRead =
        meta?.urlMetadata?.some((m) => m.urlRetrievalStatus?.includes('SUCCESS')) ?? false;

      if (grounded && !sourceRead) {
        console.warn(`[ai] ${modelId}: manba ochilmadi, javob xotiradan — modda raqamiga ishonmang`);
      }
      await logUsage({
        conversationId: input.conversationId,
        purpose, model: modelId, usage: res.usage,
        latencyMs: Date.now() - started,
      });
      return { answer: res.object, sourceRead };
    } catch (e) {
      await logUsage({
        conversationId: input.conversationId,
        purpose, model: modelId,
        latencyMs: Date.now() - started,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  };

  /**
   * Zanjir bo'ylab urinish: model band bo'lsa yoki kvota tugasa — keyingisi.
   * Pul to'lagan mijoz "texnik nosozlik" xabarini olmasligi kerak.
   */
  const askChain = async (question: string): Promise<{ answer: AiAnswer; model: string; sourceRead: boolean }> => {
    let lastError: unknown;
    for (const modelId of models) {
      try {
        const { answer, sourceRead } = await askOnce(modelId, question);
        return { answer, model: modelId, sourceRead };
      } catch (e) {
        lastError = e;
        if (isSafetyBlock(e)) throw e;           // safety — boshqa model ham bloklaydi
        if (!shouldTryNextModel(e)) throw e;     // haqiqiy xato — zanjirni davom ettirmaymiz
        console.warn(`[ai] ${modelId} ishlamadi, keyingi modelga o'tildi`);
      }
    }
    throw lastError;
  };

  // 1-urinish: savolni o'z holicha
  try {
    const { answer, model, sourceRead } = await askChain(input.question);
    return { ok: true, answer, model, reframed: false, sourceRead };
  } catch (e1) {
    if (!isSafetyBlock(e1)) {
      return {
        ok: false, reason: 'error', model: models[0],
        error: e1 instanceof Error ? e1.message : String(e1),
      };
    }

    // 2-urinish: savolni neytral huquqiy tilda qayta ifodalab.
    // Jinoyat ishlari bo'yicha mijozlarni birinchi blokdayoq yo'qotmaymiz.
    try {
      const neutral = await reframe(input.question, input.conversationId);
      const { answer, model, sourceRead } = await askChain(neutral);
      return { ok: true, answer, model, reframed: true, sourceRead };
    } catch {
      return { ok: false, reason: 'safety', model: models[0] };
    }
  }
}

async function reframe(question: string, conversationId?: string | null): Promise<string> {
  const started = Date.now();
  const res = await generateText({
    model: fastModel(),
    system: NEUTRAL_REFRAME,
    prompt: question,
    providerOptions: googleOptions(),
    maxRetries: 1,
  });
  await logUsage({
    conversationId,
    purpose: 'reframe',
    model: MODEL_FAST(),
    usage: res.usage,
    latencyMs: Date.now() - started,
  });
  const text = res.text.trim();
  if (!text) throw new Error('reframe bo\'sh natija qaytardi');
  return text;
}
