'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, paymentAccounts, services, conversations } from '@/db/schema';
import { login, logout, requireAdmin } from '@/core/auth';
import { sendLawyerReply, notifyUser, audit } from '@/core/relay';
import { confirmOrder, rejectOrder } from '@/core/orders';
import { updateServicePrice, invalidateServices, getService } from '@/core/pricing';
import { invalidatePaymentAccounts } from '@/core/settings';
import { setStatus, advanceFunnel } from '@/core/conversations';
import { toMinor } from '@/core/money';
import { pick, type Locale } from '@/i18n';

/* ───────────────────────── Kirish ───────────────────────── */

export async function loginAction(_prev: unknown, formData: FormData) {
  const { getAdminLocale } = await import('@/core/locale');
  const { adminT } = await import('@/i18n/admin');
  const locale = await getAdminLocale();

  const loginName = String(formData.get('login') ?? formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!loginName || !password) return { error: adminT(locale, 'login.fill') };

  const res = await login(loginName, password);
  if (!res.ok) {
    if (res.reason === 'locked') {
      const minutes = Math.max(1, Math.ceil((res.until.getTime() - Date.now()) / 60_000));
      return { error: adminT(locale, 'login.locked', { minutes }) };
    }
    return { error: adminT(locale, 'login.wrong') };
  }
  redirect('/admin/inbox');
}

export async function logoutAction() {
  await logout();
  redirect('/login');
}

/* ───────────────────────── Inbox ───────────────────────── */

export async function replyAction(conversationId: string, body: string) {
  const admin = await requireAdmin();
  const text = body.trim();
  if (!text) return { error: 'Bo\'sh xabar' };

  await sendLawyerReply({
    conversationId,
    body: text,
    adminId: admin.id,
    adminName: admin.fullName,
  });
  await audit({ adminId: admin.id, action: 'reply', entity: 'conversation', entityId: conversationId });
  revalidatePath(`/admin/inbox/${conversationId}`);
  return { ok: true };
}

export async function closeConversationAction(conversationId: string) {
  const admin = await requireAdmin();
  await setStatus(conversationId, 'yopilgan');
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (conv) await advanceFunnel({ conversation: conv, to: 'yopilgan', reason: 'advokat yopdi' });
  await audit({ adminId: admin.id, action: 'close', entity: 'conversation', entityId: conversationId });
  revalidatePath('/admin/inbox');
  return { ok: true };
}

/* ───────────────────────── To'lovlar ───────────────────────── */

export async function confirmPaymentAction(orderId: string) {
  const admin = await requireAdmin();
  const order = await confirmOrder(orderId, admin.id);
  if (!order) return { error: 'Buyurtma topilmadi yoki allaqachon tasdiqlangan' };

  const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
  const service = await getService(order.serviceCode);
  if (user && service) {
    await notifyUser(
      user.id,
      'pay.confirmed',
      { service: pick(service.title, user.locale as Locale) },
      order.conversationId,
    );
  }
  await audit({ adminId: admin.id, action: 'confirm_payment', entity: 'order', entityId: orderId, after: { status: 'tolandi' } });
  revalidatePath('/admin/payments');
  if (order.conversationId) revalidatePath(`/admin/inbox/${order.conversationId}`);
  return { ok: true };
}

export async function rejectPaymentAction(orderId: string, reason: string) {
  const admin = await requireAdmin();
  const text = reason.trim() || 'Sabab ko\'rsatilmagan';
  const order = await rejectOrder(orderId, admin.id, text);
  if (!order) return { error: 'Buyurtma topilmadi' };
  await notifyUser(order.userId, 'pay.rejected', { reason: text }, order.conversationId);
  await audit({ adminId: admin.id, action: 'reject_payment', entity: 'order', entityId: orderId, after: { reason: text } });
  revalidatePath('/admin/payments');
  if (order.conversationId) revalidatePath(`/admin/inbox/${order.conversationId}`);
  return { ok: true };
}

/* ───────────────────────── Narxlar ───────────────────────── */

/** Narx paneldan o'zgartiriladi. Eski buyurtmalarga tegilmaydi — ular snapshot. */
export async function updatePriceAction(code: string, amountMajor: number) {
  const admin = await requireAdmin();
  if (!Number.isFinite(amountMajor) || amountMajor < 0) return { error: 'Noto\'g\'ri summa' };
  const before = await getService(code);
  await updateServicePrice({ code, newAmountMinor: toMinor(amountMajor), changedBy: admin.id });
  await audit({
    adminId: admin.id, action: 'update_price', entity: 'service', entityId: code,
    before: { amountMinor: before?.amountMinor }, after: { amountMinor: toMinor(amountMajor) },
  });
  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function toggleServiceAction(code: string, isActive: boolean) {
  const admin = await requireAdmin();
  await db.update(services).set({ isActive, updatedAt: new Date() }).where(eq(services.code, code));
  invalidateServices();
  await audit({ adminId: admin.id, action: 'toggle_service', entity: 'service', entityId: code, after: { isActive } });
  revalidatePath('/admin/settings');
  return { ok: true };
}

/* ───────────────────────── To'lov kartalari ───────────────────────── */

export async function saveCardAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const values = {
    label: String(formData.get('label') ?? '').trim(),
    cardNumber: String(formData.get('cardNumber') ?? '').trim(),
    holderName: String(formData.get('holderName') ?? '').trim(),
    cardType: String(formData.get('cardType') ?? 'humo'),
    currency: String(formData.get('currency') ?? 'UZS'),
  };
  if (!values.cardNumber || !values.holderName) return { error: 'Karta raqami va egasi majburiy' };

  if (id) {
    await db.update(paymentAccounts).set({ ...values, updatedAt: new Date() }).where(eq(paymentAccounts.id, id));
  } else {
    await db.insert(paymentAccounts).values({ ...values, isActive: false });
  }
  invalidatePaymentAccounts();
  await audit({ adminId: admin.id, action: id ? 'update_card' : 'create_card', entity: 'payment_account', entityId: id || null, after: values });
  revalidatePath('/admin/settings');
  return { ok: true };
}

/** Aktiv kartani almashtirish — bot keyingi to'lovdan yangi raqamni ko'rsatadi. */
export async function setActiveCardAction(id: string, currency: string) {
  const admin = await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.update(paymentAccounts).set({ isActive: false }).where(eq(paymentAccounts.currency, currency));
    await tx.update(paymentAccounts).set({ isActive: true, updatedAt: new Date() }).where(eq(paymentAccounts.id, id));
  });
  invalidatePaymentAccounts();
  await audit({ adminId: admin.id, action: 'activate_card', entity: 'payment_account', entityId: id });
  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function deleteCardAction(id: string) {
  const admin = await requireAdmin();
  const [card] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.id, id)).limit(1);
  if (card?.isActive) return { error: 'Aktiv kartani o\'chirib bo\'lmaydi. Avval boshqasini aktiv qiling.' };
  await db.delete(paymentAccounts).where(eq(paymentAccounts.id, id));
  invalidatePaymentAccounts();
  await audit({ adminId: admin.id, action: 'delete_card', entity: 'payment_account', entityId: id, before: card });
  revalidatePath('/admin/settings');
  return { ok: true };
}

/* ───────────────────────── Panel tili ───────────────────────── */

export async function setLocaleAction(locale: string) {
  const { cookies } = await import('next/headers');
  const { LOCALES } = await import('@/i18n');
  const { LOCALE_COOKIE } = await import('@/core/locale');
  if (!LOCALES.includes(locale as never)) return { error: 'Noto\'g\'ri til' };
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return { ok: true };
}

/* ───────────────────────── Bot sozlamalari ───────────────────────── */

/**
 * Bot matnlari, AI ko'rsatmasi, limitlar va ish vaqti.
 * Bo'sh qoldirilgan maydonlar kodda turgan standart qiymatga qaytadi.
 */
export async function saveBotSettingsAction(patch: Record<string, unknown>) {
  const admin = await requireAdmin();
  const { saveBotSettings, getBotSettings } = await import('@/core/bot-settings');

  const before = await getBotSettings();
  const after = await saveBotSettings(patch as never, admin.id);

  await audit({
    adminId: admin.id,
    action: 'update_bot_settings',
    entity: 'settings',
    entityId: 'bot.settings',
    before: Object.fromEntries(Object.keys(patch).map((k) => [k, (before as Record<string, unknown>)[k]])),
    after: Object.fromEntries(Object.keys(patch).map((k) => [k, (after as Record<string, unknown>)[k]])),
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}

/* ───────────────────────── Bot matnlari ───────────────────────── */

/**
 * Bot xabarlarini tahrirlash. Bo'sh qoldirilgan til — standart matnga qaytadi,
 * shuning uchun noto'g'ri tahrir botni jim qoldirmaydi.
 */
export async function saveBotTextsAction(patch: Record<string, Record<string, string>>) {
  const admin = await requireAdmin();
  const { saveTextOverrides } = await import('@/core/bot-texts');
  await saveTextOverrides(patch as never, admin.id);
  await audit({
    adminId: admin.id,
    action: 'update_bot_texts',
    entity: 'settings',
    entityId: 'bot.texts',
    after: { keys: Object.keys(patch) },
  });
  revalidatePath('/admin/settings/texts');
  return { ok: true };
}

/* ───────────────────────── Xodimlar ───────────────────────── */

/** O'qish oson, taxmin qilish qiyin: chalkash belgilar (0/O, 1/l) yo'q. */
async function generatePassword(): Promise<string> {
  const { randomBytes } = await import('node:crypto');
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(16)).map((b) => abc[b % abc.length]).join('');
}

/** Yangi xodim. Parol bir marta qaytariladi va hech qayerda ochiq saqlanmaydi. */
export async function createStaffAction(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.role !== 'lawyer' && admin.role !== 'admin') return { error: 'Ruxsat yo\'q' };

  const { hashPassword } = await import('@/core/auth');
  const { admins: adminsTable } = await import('@/db/schema');

  const email = String(formData.get('email') ?? '').toLowerCase().trim();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const role = String(formData.get('role') ?? 'assistant') as 'lawyer' | 'assistant' | 'admin';
  if (!email || !fullName) return { error: 'Email va ism majburiy' };

  const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
  if (existing) return { error: 'Bu email allaqachon ro\'yxatda' };

  const password = await generatePassword();
  await db.insert(adminsTable).values({ email, fullName, role, passwordHash: hashPassword(password) });
  await audit({ adminId: admin.id, action: 'create_staff', entity: 'admin', after: { email, role } });
  revalidatePath('/admin/settings/staff');
  return { ok: true, password };
}

export async function resetStaffPasswordAction(staffId: string) {
  const admin = await requireAdmin();
  if (admin.role !== 'lawyer' && admin.role !== 'admin') return { error: 'Ruxsat yo\'q' };
  const { hashPassword } = await import('@/core/auth');
  const { admins: adminsTable } = await import('@/db/schema');

  const password = await generatePassword();
  await db.update(adminsTable).set({ passwordHash: hashPassword(password) }).where(eq(adminsTable.id, staffId));
  await audit({ adminId: admin.id, action: 'reset_staff_password', entity: 'admin', entityId: staffId });
  revalidatePath('/admin/settings/staff');
  return { ok: true, password };
}

export async function toggleStaffAction(staffId: string, isActive: boolean) {
  const admin = await requireAdmin();
  if (admin.role !== 'lawyer' && admin.role !== 'admin') return { error: 'Ruxsat yo\'q' };
  if (staffId === admin.id) return { error: 'O\'zingizni o\'chira olmaysiz' };

  const { admins: adminsTable } = await import('@/db/schema');
  const { sessions } = await import('@/db/schema');
  await db.update(adminsTable).set({ isActive }).where(eq(adminsTable.id, staffId));
  // O'chirilgan xodim ochiq seansda qolib ketmasligi kerak
  if (!isActive) await db.delete(sessions).where(eq(sessions.adminId, staffId));

  await audit({ adminId: admin.id, action: 'toggle_staff', entity: 'admin', entityId: staffId, after: { isActive } });
  revalidatePath('/admin/settings/staff');
  return { ok: true };
}

/* ───────────────────────── Bloklangan mijozlar ───────────────────────── */

export async function setUserBlockedAction(userId: string, isBlocked: boolean) {
  const admin = await requireAdmin();
  await db.update(users).set({ isBlocked, updatedAt: new Date() }).where(eq(users.id, userId));
  await audit({ adminId: admin.id, action: isBlocked ? 'block_user' : 'unblock_user', entity: 'user', entityId: userId });
  revalidatePath('/admin/settings/blocked');
  return { ok: true };
}
