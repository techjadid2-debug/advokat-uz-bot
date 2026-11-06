import { generateObject } from 'ai';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { caseCards, messages } from '@/db/schema';
import { fastModel, googleOptions, MODEL_FAST } from './ai/provider';
import { CASE_CARD_PROMPT } from './ai/prompts';
import { logUsage } from './ai/usage';

const cardSchema = z.object({
  summary: z.string().describe('Mijozning muammosi 2-3 gapda.'),
  legalArea: z.string().describe('Huquq sohasi.'),
  keyFacts: z.array(z.string()).max(8).describe('Suhbatda AYTILGAN faktlar. To\'qilgan narsa bo\'lmasin.'),
  deadlines: z.array(z.object({
    name: z.string(),
    endsAt: z.string().nullable(),
    note: z.string(),
  })).max(4),
  suggestedPosition: z.string().describe('Advokat uchun dastlabki pozitsiya taklifi.'),
  risks: z.array(z.string()).max(5).describe('Ish bo\'yicha xavflar va zaif nuqtalar.'),
});

/**
 * Ish kartochkasi — advokat suhbatni ochganda 30 soniyada kontekstni oladi.
 * Tizimning advokat uchun eng qimmatli qismi shu.
 *
 * Mijozga javob berishni to'sib qo'ymaydi: fon rejimida ishlaydi va
 * xato bo'lsa jimgina o'tib ketadi.
 */
export async function enqueueCaseCard(conversationId: string): Promise<void> {
  try {
    await buildCaseCard(conversationId);
  } catch (e) {
    console.error('[case-card] tayyorlab bo\'lmadi:', e);
  }
}

export async function buildCaseCard(conversationId: string) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .limit(40);

  const transcript = rows
    .filter((m) => m.sender === 'user' || m.sender === 'ai')
    .map((m) => `${m.sender === 'user' ? 'MIJOZ' : 'AI'}: ${m.body}`)
    .join('\n\n');
  if (!transcript.trim()) return;

  const started = Date.now();
  const res = await generateObject({
    model: fastModel(),
    schema: cardSchema,
    system: CASE_CARD_PROMPT,
    prompt: transcript,
    providerOptions: googleOptions(),
    maxRetries: 1,
  });
  await logUsage({
    conversationId,
    purpose: 'case_card',
    model: MODEL_FAST(),
    usage: res.usage,
    latencyMs: Date.now() - started,
  });

  const card = res.object;
  await db
    .insert(caseCards)
    .values({
      conversationId,
      summary: card.summary,
      legalArea: card.legalArea,
      keyFacts: card.keyFacts,
      deadlines: card.deadlines.map((d) => ({ ...d, endsAt: d.endsAt ?? undefined })),
      suggestedPosition: card.suggestedPosition,
      risks: card.risks,
    })
    .onConflictDoUpdate({
      target: caseCards.conversationId,
      set: {
        summary: card.summary,
        legalArea: card.legalArea,
        keyFacts: card.keyFacts,
        deadlines: card.deadlines.map((d) => ({ ...d, endsAt: d.endsAt ?? undefined })),
        suggestedPosition: card.suggestedPosition,
        risks: card.risks,
        updatedAt: new Date(),
      },
    });
}
