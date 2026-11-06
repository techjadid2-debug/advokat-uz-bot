/**
 * Admin yaratish yoki parolini yangilash.
 *
 *   pnpm admin <email> [ism] [rol]
 *
 * Parol avtomatik yaratiladi va bir marta ekranga chiqadi.
 * Rol: lawyer | assistant | admin (birinchi admin uchun lawyer).
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { admins } from '../src/db/schema';

const [loginName, fullName = 'Advokat', role = 'lawyer'] = process.argv.slice(2);
/** Parol argument sifatida berilishi mumkin: pnpm admin <login> <ism> <rol> <parol> */
const givenPassword = process.argv[5];
if (!loginName) {
  console.error('Foydalanish: pnpm admin <login> [ism] [rol] [parol]');
  process.exit(1);
}

function hash(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(plain, salt, 64).toString('hex')}`;
}

/** O'qish oson, lekin taxmin qilish qiyin: chalkash belgilar (0/O, 1/l) yo'q. */
function generatePassword(): string {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(18)).map((b) => abc[b % abc.length]).join('');
}

async function main() {
  const password = givenPassword || generatePassword();
  const passwordHash = hash(password);
  const normalized = loginName.toLowerCase().trim();

  const [existing] = await db.select().from(admins).where(eq(admins.email, normalized)).limit(1);
  if (existing) {
    await db
      .update(admins)
      .set({ passwordHash, isActive: true, failedAttempts: 0, lockedUntil: null })
      .where(eq(admins.id, existing.id));
    console.log(`\nParol yangilandi: ${normalized}`);
  } else {
    await db.insert(admins).values({
      email: normalized,
      passwordHash,
      fullName,
      role: role as 'lawyer' | 'assistant' | 'admin',
    });
    console.log(`\nAdmin yaratildi: ${normalized} (${role})`);
  }

  console.log(`Parol: ${password}`);
  console.log('\nBu parol qayta ko\'rsatilmaydi. Saqlab qo\'ying.\n');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
