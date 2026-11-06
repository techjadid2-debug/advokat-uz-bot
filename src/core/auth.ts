import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/db';
import { admins, sessions } from '@/db/schema';

export type Admin = typeof admins.$inferSelect;
export const SESSION_COOKIE = 'advokat_session';
const SESSION_DAYS = 14;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(plain, salt, 64).toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(plain, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Ketma-ket shuncha xato urinishdan keyin hisob vaqtincha bloklanadi. */
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; admin: Admin }
  | { ok: false; reason: 'wrong' }
  | { ok: false; reason: 'locked'; until: Date };

/**
 * Kirish.
 *
 * Parol zaif bo'lishi mumkin, shuning uchun urinishlar soni cheklanadi:
 * bu bazada saqlanadi, ya'ni serverless'da har nusxa alohida hisoblab
 * ketmaydi — chegara haqiqiy bo'ladi.
 */
export async function login(login: string, password: string): Promise<LoginResult> {
  const [admin] = await db
    .select()
    .from(admins)
    .where(and(eq(admins.email, login.toLowerCase().trim()), eq(admins.isActive, true)))
    .limit(1);

  if (!admin) return { ok: false, reason: 'wrong' };

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return { ok: false, reason: 'locked', until: admin.lockedUntil };
  }

  if (!verifyPassword(password, admin.passwordHash)) {
    const attempts = admin.failedAttempts + 1;
    await db
      .update(admins)
      .set({
        failedAttempts: attempts,
        lockedUntil:
          attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(admins.id, admin.id));
    return { ok: false, reason: 'wrong' };
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ token, adminId: admin.id, expiresAt });
  await db
    .update(admins)
    .set({ lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: null })
    .where(eq(admins.id, admin.id));

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
  return { ok: true, admin };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.delete(SESSION_COOKIE);
}

/** Joriy admin yoki null. Sahifalar va server action'lar shundan foydalanadi. */
export async function currentAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ admin: admins })
    .from(sessions)
    .innerJoin(admins, eq(sessions.adminId, admins.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.admin ?? null;
}

/** Himoyalangan amallar uchun — admin bo'lmasa xato. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) throw new Error('Ruxsat yo\'q');
  return admin;
}
