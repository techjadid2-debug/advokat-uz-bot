import { createGoogle } from '@ai-sdk/google';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';

/**
 * Gemini provayderi. Model ID'lari .env orqali beriladi — model almashtirish
 * uchun kodga tegilmaydi.
 */
const globalForAi = globalThis as unknown as { __google?: ReturnType<typeof createGoogle> };

function provider() {
  if (!globalForAi.__google) {
    globalForAi.__google = createGoogle({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    });
  }
  return globalForAi.__google;
}

export const MODEL_FAST = () => process.env.GEMINI_MODEL_FAST || 'gemini-3.7-flash';
export const MODEL_DEEP = () => process.env.GEMINI_MODEL_DEEP || 'gemini-3.7-flash';

/**
 * Model zanjiri: birinchisi band bo'lsa yoki kvota tugasa — keyingisi.
 *
 * Nega kerak: Gemini vaqti-vaqti bilan "high demand" xatosi qaytaradi, va
 * bepul tarifda Pro modellar umuman ishlamaydi (429). Pul to'lagan mijoz
 * xato xabari olishi mumkin emas — shuning uchun zaxira model doim bo'lishi shart.
 */
const BACKUPS = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];

const chain = (primary: string) => [primary, ...BACKUPS.filter((m) => m !== primary)];

/**
 * `url_context` ni haqiqatan qo'llab-quvvatlaydigan modellar.
 *
 * Sinovda aniqlandi: gemini-2.5-flash tool'ni qabul qiladi, lekin havolani
 * OCHMAYDI va javobni xotiradan yozadi. Bunday modelga "manba oldingda"
 * degan prompt berilsa, u taxminiy modda raqamini ishonch bilan aytadi —
 * grounding'siz holatdan ham xavfliroq.
 */
const GROUNDING_CAPABLE = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-pro-latest'];

export const supportsGrounding = (model: string) => GROUNDING_CAPABLE.includes(model);

export const fastChain = () => chain(MODEL_FAST());
export const deepChain = () => chain(MODEL_DEEP());

export const modelFor = (id: string) => provider()(id);
export const fastModel = () => provider()(MODEL_FAST());

/**
 * Huquqiy savollar uchun safety filtri eng past darajaga tushiriladi.
 *
 * Sabab: jinoyat ishlari (zo'ravonlik, giyohvand moddalar, jinsiy jinoyatlar)
 * bo'yicha savollar advokat uchun eng qimmatli mijozlar. Standart filtr ularni
 * bloklaydi — bu mijozni ham, daromadni ham yo'qotish demak.
 *
 * Bu kontent yaratish emas, huquqiy tushuntirish — filtr shu maqsadga moslanadi.
 */
export const LEGAL_SAFETY_SETTINGS: NonNullable<
  GoogleGenerativeAIProviderOptions['safetySettings']
> = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
];

export function googleOptions(): { google: GoogleGenerativeAIProviderOptions } {
  return { google: { safetySettings: LEGAL_SAFETY_SETTINGS } };
}

const SAFETY_MARKERS = [
  'safety', 'prohibited_content', 'blockreason', 'block_reason',
  'recitation', 'content-filter', 'content_filter', 'candidate was blocked',
];

/** Xato yoki finishReason safety blokini bildiradimi. */
export function isSafetyBlock(err: unknown, finishReason?: string): boolean {
  if (finishReason && ['content-filter', 'other'].includes(finishReason)) return true;
  if (!err) return false;
  const text = (
    err instanceof Error ? `${err.message} ${JSON.stringify((err as { cause?: unknown }).cause ?? '')}` : String(err)
  ).toLowerCase();
  return SAFETY_MARKERS.some((m) => text.includes(m));
}

const RETRYABLE = [
  'high demand', 'overloaded', 'quota', 'rate limit', 'resource_exhausted',
  'no longer available', 'not found', '429', '503', 'unavailable',
];

/** Xato boshqa modelga o'tishga arziydimi (band, kvota tugagan, model o'chirilgan). */
export function shouldTryNextModel(err: unknown): boolean {
  if (!err) return false;
  const text = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return RETRYABLE.some((m) => text.includes(m));
}

/** Modelning 1M token uchun narxi (mikro-dollarda). Panelda yangilanishi mumkin. */
const RATES: Record<string, { in: number; out: number }> = {
  'gemini-flash-latest':  { in: 300_000, out: 2_500_000 },
  'gemini-2.5-flash':     { in: 300_000, out: 2_500_000 },
  'gemini-3.5-flash':     { in: 300_000, out: 2_500_000 },
  'gemini-3.7-flash':     { in: 300_000, out: 2_500_000 },
  'gemini-3.1-pro-preview': { in: 1_250_000, out: 10_000_000 },
  'gemini-pro-latest':    { in: 1_250_000, out: 10_000_000 },
  'gemini-2.5-pro':       { in: 1_250_000, out: 10_000_000 },
};

/** Taxminiy xarajat. Noma'lum model uchun 0 — tokenlar baribir saqlanadi. */
export function estimateCostMicroUsd(model: string, inTok: number, outTok: number): number {
  const r = RATES[model];
  if (!r) return 0;
  return Math.round((inTok / 1_000_000) * r.in + (outTok / 1_000_000) * r.out);
}
