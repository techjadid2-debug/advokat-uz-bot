import { pendingPayments, recentPayments } from '@/core/admin-queries';
import { getAdminLocale } from '@/core/locale';
import { pick } from '@/i18n';
import { PaymentsPane, type PayRow } from './pane';

export const dynamic = 'force-dynamic';

export default async function PaymentsLayout({ children }: { children: React.ReactNode }) {
  const [pending, recent, locale] = await Promise.all([
    pendingPayments(),
    recentPayments(),
    getAdminLocale(),
  ]);

  const map = (rows: Awaited<ReturnType<typeof pendingPayments>>): PayRow[] =>
    rows.map(({ order, service, user }) => ({
      id: order.id,
      title: service ? pick(service.title, locale) : order.serviceCode,
      amountMinor: order.amountMinor,
      currency: order.currency,
      refCode: order.refCode,
      status: order.status,
      receiptAt: order.receiptAt?.toISOString() ?? null,
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      userName: user.fullName,
    }));

  return (
    <PaymentsPane pending={map(pending)} recent={map(recent)}>
      {children}
    </PaymentsPane>
  );
}
