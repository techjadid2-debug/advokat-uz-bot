'use client';

import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction, setLocaleAction } from '../admin/actions';
import { useT, useLocale } from '@/components/i18n-provider';
import { Button, Input, Field } from '@/components/ui';
import { LOCALES, type Locale } from '@/i18n';

const SHORT: Record<Locale, string> = { uz_latn: 'UZ', uz_cyrl: 'ЎЗ', ru: 'RU', en: 'EN' };

export function LoginForm() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pendingLocale, startLocale] = useTransition();
  const [state, action, pending] = useActionState(loginAction, null as { error?: string } | null);

  return (
    <form
      action={action}
      className="animate-slide-up space-y-4 rounded-[18px] border border-line bg-s2 p-6"
      style={{ animationDelay: '60ms' }}
    >
      <Field label={t('login.username')}>
        <Input name="login" type="text" required autoComplete="username" autoFocus />
      </Field>
      <Field label={t('login.password')}>
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>

      {state?.error && (
        <p className="animate-fade-in rounded-[10px] bg-danger-bg px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? t('login.submitting') : t('login.submit')}
      </Button>

      <div className="flex justify-center gap-1 pt-1">
        {LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            disabled={pendingLocale}
            onClick={() => startLocale(async () => { await setLocaleAction(loc); router.refresh(); })}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${
              loc === locale ? 'bg-accent-bg text-accent-text' : 'text-tx3 hover:text-tx2'
            }`}
          >
            {SHORT[loc]}
          </button>
        ))}
      </div>
    </form>
  );
}
