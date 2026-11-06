import { z } from 'zod';

/**
 * Muhit o'zgaruvchilari. Ilova ishga tushganda bir marta tekshiriladi —
 * xato sozlama bilan ishga tushib, keyin mijoz oldida yiqilishdan yaxshiroq.
 */
const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8),
  PUBLIC_URL: z.string().url().optional(),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  GEMINI_MODEL_FAST: z.string().default('gemini-flash-latest'),
  GEMINI_MODEL_DEEP: z.string().default('gemini-pro-latest'),

  ANTHROPIC_API_KEY: z.string().optional(),
  FALLBACK_MODEL: z.string().default('claude-sonnet-5'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  AUTH_SECRET: z.string().min(16),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Muhit o'zgaruvchilari noto'g'ri yoki yetishmayapti: ${missing}\n` +
        `.env.example faylidan nusxa oling va to'ldiring.`,
    );
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === 'production';
