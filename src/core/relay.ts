import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { conversations, users, auditLog } from '@/db/schema';
import { addMessage, setStatus } from './conversations';
import { bot } from '@/bot';
import { toTelegramHtml, splitMessage } from '@/bot/format';
import { t, type Locale } from '@/i18n';
import { getTextOverrides, buildTranslator } from './bot-texts';

/**
 * Relay: advokat panelda yozadi → mijoz botda oladi.
 *
 * Mijozga advokatning shaxsiy username'i berilmaydi. Aks holda chat tarixi,
 * to'lov nazorati va statistika tizimdan chiqib ketadi — ya'ni butun
 * "tizimlashtirish" maqsadi yo'qoladi.
 */
export async function sendLawyerReply(args: {
  conversationId: string;
  body: string;
  adminId: string;
  adminName: string;
}) {
  const [row] = await db
    .select({ conversation: conversations, user: users })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(eq(conversations.id, args.conversationId))
    .limit(1);
  if (!row) throw new Error('Suhbat topilmadi');
  if (row.user.channel !== 'telegram') throw new Error('Bu kanal hozircha qo\'llab-quvvatlanmaydi');

  const locale = row.user.locale as Locale;
  const text = t(locale, 'lawyer.reply', { name: args.adminName, body: args.body });

  const chunks = splitMessage(toTelegramHtml(text));
  let firstId: number | null = null;
  for (const chunk of chunks) {
    const sent = await bot().api.sendMessage(row.user.externalId, chunk, { parse_mode: 'HTML' });
    firstId ??= sent.message_id;
  }

  await addMessage({
    conversationId: args.conversationId,
    sender: 'lawyer',
    body: args.body,
    authorAdminId: args.adminId,
    externalMessageId: firstId ? String(firstId) : null,
  });
  await setStatus(args.conversationId, 'advokat_faol');
}

/**
 * Mijozga tizim xabari (to'lov tasdiqlandi / rad etildi).
 *
 * Xabar suhbatga ham yoziladi: advokat mijoz aynan nima olganini ko'rishi kerak,
 * aks holda panel va Telegram bir-biriga mos kelmaydi.
 */
export async function notifyUser(
  userId: string,
  key: Parameters<typeof t>[1],
  vars?: Record<string, string | number>,
  conversationId?: string | null,
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.channel !== 'telegram') return;

  // Paneldagi tahrir bu yerda ham ustun bo'lishi kerak
  const overrides = await getTextOverrides();
  const text = buildTranslator(user.locale as Locale, overrides)(key, vars);

  await bot()
    .api.sendMessage(user.externalId, toTelegramHtml(text), { parse_mode: 'HTML' })
    .catch((e) => console.error('[relay] mijozga xabar yuborilmadi:', e));

  if (conversationId) {
    await addMessage({ conversationId, sender: 'system', body: text });
  }
}

/** Huquqiy xizmatda majburiy: kim nimani qachon o'zgartirdi. */
export async function audit(args: {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLog).values({
    adminId: args.adminId,
    action: args.action,
    entity: args.entity,
    entityId: args.entityId ?? null,
    before: args.before ?? null,
    after: args.after ?? null,
  });
}
