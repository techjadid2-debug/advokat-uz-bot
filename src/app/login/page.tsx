import { redirect } from 'next/navigation';
import { currentAdmin } from '@/core/auth';
import { getAdminLocale } from '@/core/locale';
import { ADMIN_CATALOGS } from '@/i18n/admin';
import { I18nProvider } from '@/components/i18n-provider';
import { LoginForm } from './form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await currentAdmin()) redirect('/admin/inbox');
  const locale = await getAdminLocale();
  const dict = ADMIN_CATALOGS[locale];

  return (
    <I18nProvider dict={dict} locale={locale}>
      <main className="grid h-dvh place-items-center overflow-y-auto px-5 py-10">
        <div className="w-full max-w-[340px]">
          <div className="animate-slide-up mb-7 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[18px] bg-accent text-[22px] font-bold text-on-accent">
              A
            </div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{dict['login.title']}</h1>
            <p className="mt-0.5 text-[13px] text-tx3">Advokat.uz</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </I18nProvider>
  );
}
