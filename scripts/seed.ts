import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { db } from '../src/db';
import { services, paymentAccounts, settings, admins } from '../src/db/schema';
import { latnToCyrl } from '../src/i18n/translit';
import { SERVICE } from '../src/core/pricing';
import { SETTING_KEYS } from '../src/core/settings';

/** uz_cyrl qo'lda yozilmaydi — uz_latn'dan avtomatik olinadi. */
const title = (uz: string, ru: string, en: string) => ({
  uz_latn: uz,
  uz_cyrl: latnToCyrl(uz),
  ru,
  en,
});

const uzs = (soum: number) => soum * 100;
const usd = (dollars: number) => dollars * 100;

const SEED_SERVICES = [
  {
    code: SERVICE.QUESTION_PAID, kind: 'savol' as const,
    title: title('Keyingi savol', 'Следующий вопрос', 'Next question'),
    amountMinor: uzs(50_000), currency: 'UZS',
    grantsKind: 'question' as const, grantsQty: 1, sortOrder: 10,
  },
  {
    code: SERVICE.DOCUMENT_PREPARE, kind: 'hujjat' as const,
    title: title('Ariza / shikoyat tayyorlash', 'Подготовка заявления / жалобы', 'Claim / complaint drafting'),
    amountMinor: uzs(100_000), currency: 'UZS',
    grantsKind: 'document' as const, grantsQty: 1, sortOrder: 20,
  },
  {
    code: SERVICE.LAWYER_INDIVIDUAL, kind: 'konsultatsiya' as const,
    title: title('Advokatga ulanish (jismoniy shaxs)', 'Связь с адвокатом (физлицо)', 'Connect with attorney (individual)'),
    amountMinor: uzs(500_000), currency: 'UZS', clientType: 'jismoniy' as const,
    grantsKind: 'consultation' as const, grantsQty: 1, sortOrder: 30,
  },
  {
    code: SERVICE.LAWYER_COMPANY, kind: 'konsultatsiya' as const,
    title: title('Advokatga ulanish (yuridik shaxs)', 'Связь с адвокатом (юрлицо)', 'Connect with attorney (company)'),
    amountMinor: uzs(1_000_000), currency: 'UZS', clientType: 'yuridik' as const,
    grantsKind: 'consultation' as const, grantsQty: 1, sortOrder: 40,
  },
  {
    code: SERVICE.LAWYER_FOREIGN, kind: 'konsultatsiya' as const,
    title: title('Advokatga ulanish (chet eldan)', 'Связь с адвокатом (из-за рубежа)', 'Connect with attorney (from abroad)'),
    amountMinor: usd(100), currency: 'USD', clientType: 'chet_el' as const,
    grantsKind: 'consultation' as const, grantsQty: 1, sortOrder: 50,
  },
  {
    code: SERVICE.PHONE_CONSULT, kind: 'offline' as const,
    title: title('Telefon orqali maslahat', 'Консультация по телефону', 'Phone consultation'),
    amountMinor: uzs(250_000), currency: 'UZS',
    grantsKind: 'consultation' as const, grantsQty: 1, sortOrder: 60,
  },
  {
    code: SERVICE.DOC_REVIEW_SMALL, kind: 'offline' as const,
    title: title('Hujjatlarni ko\'rib chiqish (5 varaqgacha)', 'Изучение документов (до 5 листов)', 'Document review (up to 5 pages)'),
    amountMinor: uzs(300_000), currency: 'UZS',
    grantsKind: 'consultation' as const, grantsQty: 1, sortOrder: 70,
  },
  {
    code: SERVICE.DOC_REVIEW_LARGE, kind: 'offline' as const,
    title: title('Hujjatlarni ko\'rib chiqish (5 varaqdan ortiq)', 'Изучение документов (более 5 листов)', 'Document review (over 5 pages)'),
    amountMinor: uzs(500_000), currency: 'UZS',
    grantsKind: 'consultation' as const, grantsQty: 1, sortOrder: 80,
  },
  {
    code: SERVICE.OFFICE_VISIT, kind: 'offline' as const,
    title: title('Ofisda uchrashuv', 'Встреча в офисе', 'Meeting at the office'),
    amountMinor: 0, currency: 'UZS', sortOrder: 90,
  },
];

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(plain, salt, 64).toString('hex')}`;
}

async function main() {
  for (const s of SEED_SERVICES) {
    await db.insert(services).values(s).onConflictDoUpdate({
      target: services.code,
      // Narxga TEGILMAYDI: advokat paneldan o'zgartirgan bo'lsa, seed uni qaytarmasin.
      set: { title: s.title, kind: s.kind, sortOrder: s.sortOrder, updatedAt: new Date() },
    });
  }
  console.log(`✓ ${SEED_SERVICES.length} ta xizmat`);

  const [card] = await db.select().from(paymentAccounts).limit(1);
  if (!card) {
    await db.insert(paymentAccounts).values({
      label: 'Asosiy Humo',
      cardNumber: '9860 2301 0374 1271',
      holderName: 'Turdimatov Muzaffar',
      cardType: 'humo',
      currency: 'UZS',
      isActive: true,
    });
    console.log('✓ to\'lov kartasi');
  }

  await db.insert(settings)
    .values({ key: SETTING_KEYS.lawyerName, value: 'Muzaffar Turdimatov' })
    .onConflictDoNothing();
  console.log('✓ sozlamalar');

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    await db.insert(admins).values({
      email,
      passwordHash: hashPassword(password),
      fullName: 'Muzaffar Turdimatov',
      role: 'lawyer',
    }).onConflictDoNothing();
    console.log(`✓ admin: ${email}`);
  } else {
    console.log('… admin o\'tkazib yuborildi (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD yo\'q)');
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
