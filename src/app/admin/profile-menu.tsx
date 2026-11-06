'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useT, useLocale } from '@/components/i18n-provider';
import {
  useTheme, THEME_SWATCH, ACCENT_SWATCH, THEME_ORDER, ACCENT_ORDER,
  type Theme, type Accent,
} from '@/components/theme';
import { IconSettings, IconLogout, IconGlobe, IconCheck } from '@/components/icons';
import { setLocaleAction, logoutAction } from './actions';
import { LOCALES, type Locale } from '@/i18n';

const LOCALE_NAME: Record<Locale, string> = {
  uz_latn: "O'zbekcha", uz_cyrl: 'Ўзбекча', ru: 'Русский', en: 'English',
};

/**
 * Reyk pastidagi profil menyusi — Telegram Desktop'dagidek.
 * Sozlamalar, til, mavzu va chiqish shu yerda; reyk faqat ish bo'limlari bilan qoladi.
 */
export function ProfileMenu({ adminName, compact }: { adminName: string; compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials = adminName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const pickLocale = (loc: Locale) =>
    start(async () => {
      await setLocaleAction(loc);
      setOpen(false);
      router.refresh();
    });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('common.profile')}
        className={`grid place-items-center rounded-full bg-s3 text-[11px] font-semibold text-tx2
          transition-all duration-150 hover:bg-accent-bg hover:text-accent-text active:scale-90
          ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}
      >
        {initials || '?'}
      </button>

      {open && (
        <div
          role="menu"
          className={`animate-pop-in absolute z-50 w-60 overflow-hidden rounded-2xl border border-line bg-s2 p-1.5 shadow-e2
            ${compact ? 'bottom-11 right-0' : 'bottom-0 left-12'}`}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-semibold">{adminName}</p>
          </div>

          <Link
            href="/admin/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors duration-100 hover:bg-s3"
          >
            <IconSettings size={17} />
            {t('nav.settings')}
          </Link>

          <div className="my-1 h-px bg-line-soft" />

          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-tx3">{t('theme.title')}</p>
          <div className="grid grid-cols-5 gap-1.5 px-2.5 pb-2">
            <Swatch
              label={t('theme.auto')}
              active={theme === 'auto'}
              onClick={() => setTheme('auto')}
              style={{ background: 'linear-gradient(135deg, #000 0 50%, #f2f2f7 50% 100%)' }}
            />
            {THEME_ORDER.map((th) => (
              <Swatch
                key={th}
                label={t(`theme.${th}` as 'theme.auto')}
                active={theme === th}
                onClick={() => setTheme(th as Theme)}
                style={{
                  background: THEME_SWATCH[th].bg,
                  boxShadow: `inset 0 0 0 1px ${THEME_SWATCH[th].line}`,
                }}
              />
            ))}
          </div>

          <p className="px-2.5 pb-1 text-[11px] font-medium text-tx3">{t('accent.title')}</p>
          <div className="grid grid-cols-6 gap-1.5 px-2.5 pb-2">
            {ACCENT_ORDER.map((ac) => (
              <Swatch
                key={ac}
                label={t(`accent.${ac}` as 'accent.green')}
                active={accent === ac}
                onClick={() => setAccent(ac as Accent)}
                style={{ background: ACCENT_SWATCH[ac] }}
              />
            ))}
          </div>

          <div className="my-1 h-px bg-line-soft" />

          <p className="flex items-center gap-2 px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-tx3">
            <IconGlobe size={13} />
            {LOCALE_NAME[locale]}
          </p>
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => pickLocale(loc)}
              disabled={pending}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px] transition-colors duration-100 hover:bg-s3 disabled:opacity-50"
            >
              <span className="w-4 text-accent-text">{loc === locale && <IconCheck size={15} />}</span>
              {LOCALE_NAME[loc]}
            </button>
          ))}

          <div className="my-1 h-px bg-line-soft" />

          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] text-danger transition-colors duration-100 hover:bg-danger-bg">
              <IconLogout size={17} />
              {t('nav.logout')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Rang namunasi — mavzu va urg'u shu bilan tanlanadi. */
function Swatch({
  label, active, onClick, style,
}: { label: string; active: boolean; onClick: () => void; style: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      style={style}
      className={`h-6 w-full rounded-full border-2 transition-all duration-150 active:scale-90
        ${active ? 'border-accent' : 'border-transparent'}`}
    />
  );
}
