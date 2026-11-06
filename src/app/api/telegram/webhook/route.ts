import { webhookCallback } from 'grammy';
import { bot } from '@/bot';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Handler = (req: Request) => Promise<Response>;
let handler: Handler | null = null;

/**
 * Handler birinchi so'rovda yaratiladi.
 *
 * Nega modul darajasida emas: build paytida TELEGRAM_BOT_TOKEN bo'lmasligi
 * mumkin, va grammY tokensiz darrov xato beradi — bu butun build'ni yiqitadi.
 */
function getHandler(): Handler {
  if (!handler) {
    handler = webhookCallback(bot(), 'std/http', {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
      timeoutMilliseconds: 280_000,
    }) as Handler;
  }
  return handler;
}

export async function POST(req: Request): Promise<Response> {
  try {
    return await getHandler()(req);
  } catch (e) {
    console.error('[webhook] xato:', e);
    // Telegram 200 olmasa xabarni qayta yuboradi — bu takroriy AI chaqiruvi
    // va mijozga takroriy javob demak. Shuning uchun har doim 200.
    return new Response('ok', { status: 200 });
  }
}

export function GET(): Response {
  return new Response('Advokat.uz bot webhook', { status: 200 });
}
