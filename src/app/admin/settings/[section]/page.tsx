import { notFound } from 'next/navigation';
import { db } from '@/db';
import { paymentAccounts, priceHistory, admins, services } from '@/db/schema';
import { desc, eq, asc } from 'drizzle-orm';
import { getBotSettings } from '@/core/bot-settings';
import { getAdminLocale } from '@/core/locale';
import { toMajor } from '@/core/money';
import { pick } from '@/i18n';
import { SectionShell } from './shell';

export const dynamic = 'force-dynamic';

const VALID = ['prices', 'cards', 'texts', 'ai', 'limits', 'hours', 'staff', 'blocked'];

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!VALID.includes(section)) notFound();

  const locale = await getAdminLocale();

  if (section === 'prices') {
    const [rows, history] = await Promise.all([
      db.select().from(services).orderBy(asc(services.sortOrder)),
      db
        .select({ h: priceHistory, adminName: admins.fullName })
        .from(priceHistory)
        .leftJoin(admins, eq(priceHistory.changedBy, admins.id))
        .orderBy(desc(priceHistory.createdAt))
        .limit(12),
    ]);
    return (
      <SectionShell
        section="prices"
        services={rows.map((s) => ({
          code: s.code, kind: s.kind, title: pick(s.title, locale),
          amountMajor: toMajor(s.amountMinor), currency: s.currency, isActive: s.isActive,
        }))}
        history={history.map(({ h, adminName }) => ({
          id: h.id, serviceCode: h.serviceCode,
          oldMajor: h.oldAmountMinor === null ? null : toMajor(h.oldAmountMinor),
          newMajor: toMajor(h.newAmountMinor), currency: h.currency,
          adminName, createdAt: h.createdAt.toISOString(),
        }))}
      />
    );
  }

  if (section === 'cards') {
    const cards = await db
      .select()
      .from(paymentAccounts)
      .orderBy(desc(paymentAccounts.isActive), desc(paymentAccounts.updatedAt));
    return (
      <SectionShell
        section="cards"
        cards={cards.map((c) => ({
          id: c.id, label: c.label, cardNumber: c.cardNumber, holderName: c.holderName,
          cardType: c.cardType, currency: c.currency, isActive: c.isActive,
        }))}
      />
    );
  }

  if (section === 'texts') {
    const { getTextOverrides } = await import('@/core/bot-texts');
    const { ADMIN_TEXT_CATALOGS } = await import('@/i18n/bot-catalog');
    const overrides = await getTextOverrides();
    const keys = Object.keys(ADMIN_TEXT_CATALOGS.uz_latn) as (keyof typeof ADMIN_TEXT_CATALOGS.uz_latn)[];
    return (
      <SectionShell
        section="texts"
        texts={keys.map((key) => ({
          key: key as string,
          group: (key as string).split('.')[0],
          defaults: {
            uz_latn: ADMIN_TEXT_CATALOGS.uz_latn[key],
            uz_cyrl: ADMIN_TEXT_CATALOGS.uz_cyrl[key],
            ru: ADMIN_TEXT_CATALOGS.ru[key],
            en: ADMIN_TEXT_CATALOGS.en[key],
          },
          overrides: overrides[key] ?? {},
        }))}
      />
    );
  }

  if (section === 'staff') {
    const { currentAdmin } = await import('@/core/auth');
    const me = await currentAdmin();
    const rows = await db.select().from(admins).orderBy(asc(admins.createdAt));
    return (
      <SectionShell
        section="staff"
        canManage={me?.role === 'lawyer' || me?.role === 'admin'}
        staff={rows.map((a) => ({
          id: a.id, email: a.email, fullName: a.fullName, role: a.role,
          isActive: a.isActive,
          lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
          isSelf: a.id === me?.id,
        }))}
      />
    );
  }

  if (section === 'blocked') {
    const { users } = await import('@/db/schema');
    const rows = await db.select().from(users).where(eq(users.isBlocked, true)).orderBy(desc(users.updatedAt));
    return (
      <SectionShell
        section="blocked"
        blocked={rows.map((u) => ({
          id: u.id, fullName: u.fullName, phone: u.phone,
          username: u.username, createdAt: u.createdAt.toISOString(),
        }))}
      />
    );
  }

  const bot = await getBotSettings();
  return <SectionShell section={section as 'ai' | 'limits' | 'hours'} bot={bot} locale={locale} />;
}
