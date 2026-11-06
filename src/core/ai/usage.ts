import { db } from '@/db';
import { aiUsage } from '@/db/schema';
import { estimateCostMicroUsd } from './provider';

export type UsageLike = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
};

/**
 * Har AI so'rovi bazaga yoziladi. 50 ming so'm narx qo'yilgan xizmatda
 * unit-ekonomikani bilmaslik mumkin emas: bir mijozga AI xarajati qancha?
 */
export async function logUsage(args: {
  conversationId?: string | null;
  purpose: string;
  model: string;
  usage?: UsageLike;
  latencyMs: number;
  ok?: boolean;
  error?: string | null;
}) {
  const inTok = args.usage?.inputTokens ?? 0;
  const outTok = args.usage?.outputTokens ?? 0;
  try {
    await db.insert(aiUsage).values({
      conversationId: args.conversationId ?? null,
      purpose: args.purpose,
      provider: 'google',
      model: args.model,
      inputTokens: inTok,
      outputTokens: outTok,
      costMicroUsd: estimateCostMicroUsd(args.model, inTok, outTok),
      latencyMs: args.latencyMs,
      ok: args.ok ?? true,
      error: args.error ?? null,
    });
  } catch (e) {
    // Hisobot yozilmagani mijozga javob berishni to'xtatmasligi kerak.
    console.error('[ai_usage] yozib bo\'lmadi:', e);
  }
}
