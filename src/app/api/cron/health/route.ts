import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { orders, conversations, aiUsage } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Kunlik sog'liq tekshiruvi.
 *
 * Nega kerak: hozir bot buzilsa (kvota tugasa, webhook xato bersa,
 * chek tasdiqlanmay qolsa) buni hech kim bilmaydi — mijoz javob kutib
 * o'tiraveradi. Bu tekshiruv kuniga bir marta holatni ko'rib chiqadi va
 * muammo bo'lsa advokatga Telegramga yozadi.
 *
 * Vercel bepul tarifida cron kuniga 1 marta ishlaydi — shu vazifaga aynan mos.
 */

type Issue = { level: 'xato' | 'ogohlantirish'; text: string };

async function checkWebhook(): Promise<Issue[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return [{ level: 'xato', text: 'TELEGRAM_BOT_TOKEN sozlanmagan' }];
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const j = (await r.json()) as {
      ok: boolean;
      result?: { url?: string; last_error_message?: string; pending_update_count?: number };
    };
    if (!j.ok || !j.result?.url) return [{ level: 'xato', text: 'Webhook o\'rnatilmagan' }];

    const issues: Issue[] = [];
    if (j.result.last_error_message) {
      issues.push({ level: 'xato', text: `Webhook xatosi: ${j.result.last_error_message}` });
    }
    if ((j.result.pending_update_count ?? 0) > 10) {
      issues.push({
        level: 'ogohlantirish',
        text: `${j.result.pending_update_count} ta xabar navbatda qolgan`,
      });
    }
    return issues;
  } catch {
    return [{ level: 'xato', text: 'Telegram API ga ulanib bo\'lmadi' }];
  }
}

async function checkDatabase(): Promise<Issue[]> {
  const issues: Issue[] = [];
  const dayAgo = new Date(Date.now() - 86_400_000);

  // Tasdiq kutayotgan cheklar — mijoz to'lagan, lekin xizmat ochilmagan
  const [stale] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, 'chek_yuborildi'), lt(orders.receiptAt, dayAgo)));
  if (stale && stale.n > 0) {
    issues.push({
      level: 'xato',
      text: `${stale.n} ta chek bir kundan ortiq tasdiqlanmagan — mijoz to'lagan, xizmat ochilmagan`,
    });
  }

  // Advokat javobini kutayotgan suhbatlar
  const [waiting] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversations)
    .where(and(eq(conversations.status, 'advokat_kutmoqda'), lt(conversations.lastMessageAt, dayAgo)));
  if (waiting && waiting.n > 0) {
    issues.push({
      level: 'ogohlantirish',
      text: `${waiting.n} ta mijoz bir kundan ortiq advokat javobini kutmoqda`,
    });
  }

  /**
   * AI xatolarini ikkiga ajratamiz.
   *
   * "Model band" — zanjir keyingi modelga o'tadi va mijoz baribir javob oladi.
   * Bu kutilgan holat, xavotir uchun sabab emas.
   *
   * "Kvota tugadi" — model butun kun davomida ishlamaydi. Zanjirdagi hamma
   * model tugasa, mijoz umuman javob olmaydi. Bitta bunday xato ham
   * ogohlantirishga arziydi: demak biz chegaraga yetganmiz.
   */
  const [ai] = await db
    .select({
      total: sql<number>`count(*)::int`,
      failed: sql<number>`count(*) filter (where ok = false)::int`,
      quota: sql<number>`count(*) filter (
        where ok = false and (error ilike '%quota%' or error ilike '%exceeded%' or error ilike '%RESOURCE_EXHAUSTED%')
      )::int`,
    })
    .from(aiUsage)
    .where(sql`${aiUsage.createdAt} >= ${dayAgo}`);

  if (ai && ai.quota > 0) {
    issues.push({
      level: 'xato',
      text: `Gemini kvotasi ${ai.quota} marta tugadi (24 soatda) — bepul tarifda kuniga 20 so'rov, har model uchun. Mijozlar javobsiz qolishi mumkin.`,
    });
  }
  if (ai && ai.total > 0 && ai.failed / ai.total > 0.5) {
    issues.push({
      level: 'ogohlantirish',
      text: `AI so'rovlarining ${Math.round((ai.failed / ai.total) * 100)}% i birinchi urinishda yiqildi (${ai.failed}/${ai.total}) — modellar band, javob sekinlashgan`,
    });
  }

  return issues;
}

async function notify(issues: Issue[], healthy = false) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const body = healthy
    ? '✅ Hammasi joyida — muammo topilmadi.'
    : issues.map((i) => `${i.level === 'xato' ? '🔴' : '🟡'} ${i.text}`).join('\n');
  const text = `<b>Advokat.uz — kunlik tekshiruv</b>\n\n${body}`;

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => null);

  if (!r?.ok) {
    console.error('[cron] Telegramga xabar yuborilmadi', r ? await r.text() : '');
    return false;
  }
  return true;
}

export async function GET(req: Request): Promise<Response> {
  // Vercel Cron `Authorization: Bearer $CRON_SECRET` yuboradi
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Ruxsat yo\'q', { status: 401 });
  }

  const issues = [...(await checkWebhook()), ...(await checkDatabase())];

  /**
   * Sog'lom holatda cron jim turadi — har kuni "hammasi joyida" degan xabar
   * ortiqcha shovqin va bir haftada e'tibordan qoladi.
   * `?test=1` esa ulanish ishlayotganini tekshirish uchun majburan yuboradi.
   */
  const isTest = new URL(req.url).searchParams.get('test') === '1';
  const notified =
    issues.length > 0 ? await notify(issues) : isTest ? await notify([], true) : false;

  return Response.json({
    ok: issues.length === 0,
    checkedAt: new Date().toISOString(),
    issues,
    notified,
  });
}
