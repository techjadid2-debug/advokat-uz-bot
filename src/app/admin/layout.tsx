import { redirect } from 'next/navigation';
import { currentAdmin } from '@/core/auth';
import { getAdminLocale } from '@/core/locale';
import { ADMIN_CATALOGS } from '@/i18n/admin';
import { pendingPayments } from '@/core/admin-queries';
import { I18nProvider } from '@/components/i18n-provider';
import { LiveProvider } from '@/components/live';
import { Shell } from './shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect('/login');

  const locale = await getAdminLocale();
  const dict = ADMIN_CATALOGS[locale];
  const waiting = (await pendingPayments()).length;

  return (
    <I18nProvider dict={dict} locale={locale}>
      <LiveProvider labels={{ newMessage: dict['common.newMessage'], newPayment: dict['common.newPayment'] }}>
        <Shell adminName={admin.fullName} pendingPayments={waiting}>
          {children}
        </Shell>
      </LiveProvider>
    </I18nProvider>
  );
}
