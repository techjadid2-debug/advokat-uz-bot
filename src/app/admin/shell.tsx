'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useT } from '@/components/i18n-provider';
import { useLive } from '@/components/live';
import { IconChat, IconCard, IconChart, IconDoc } from '@/components/icons';
import { ProfileMenu } from './profile-menu';

/**
 * Telegram Desktop tuzilishi:
 *   kompyuterda — chapda 64px ikonka reyk
 *   telefonda   — pastda 4 ta ikonka (reyk sig'maydi)
 */
export function Shell({
  adminName, pendingPayments, children,
}: { adminName: string; pendingPayments: number; children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const live = useLive();

  const NAV = [
    { href: '/admin/inbox', label: t('nav.inbox'), Icon: IconChat, hotkey: '1' },
    { href: '/admin/payments', label: t('nav.payments'), Icon: IconCard, hotkey: '2', badge: pendingPayments },
    { href: '/admin/documents', label: t('nav.documents'), Icon: IconDoc, hotkey: '3' },
    { href: '/admin/stats', label: t('nav.stats'), Icon: IconChart, hotkey: '4' },
  ];

  // Bildirishnomaga ruxsat — birinchi bosishda so'raladi
  useEffect(() => {
    const ask = () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
      window.removeEventListener('click', ask);
    };
    window.addEventListener('click', ask);
    return () => window.removeEventListener('click', ask);
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg">
      {/* ── Kompyuter: chap reyk ── */}
      <nav className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-s1 py-3 md:flex">
        <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-accent text-[15px] font-semibold text-on-accent">
          A
        </div>

        {NAV.map((item) => (
          <RailItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}

        <div className="mt-auto flex flex-col items-center gap-2">
          <span
            title={live?.connected ? t('inbox.live') : t('common.loading')}
            className={`h-1.5 w-1.5 rounded-full ${live?.connected ? 'animate-pulse-dot bg-accent' : 'bg-tx3'}`}
          />
          <ProfileMenu adminName={adminName} />
        </div>
      </nav>

      {/* ── Tarkib ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-14 md:pb-0">
        {children}
      </div>

      {/* ── Telefon: pastki panel ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-line bg-s1/95 backdrop-blur-xl md:hidden">
        {NAV.map((item) => (
          <TabItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
        <div className="flex flex-1 items-center justify-center">
          <ProfileMenu adminName={adminName} compact />
        </div>
      </nav>
    </div>
  );
}

type ItemProps = {
  href: string; label: string; badge?: number; active: boolean; hotkey?: string;
  Icon: (p: { size?: number; className?: string }) => React.ReactElement;
};

function RailItem({ href, label, badge, active, hotkey, Icon }: ItemProps) {
  return (
    <Link
      href={href}
      title={hotkey ? `${label}  \u2325${hotkey}` : label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`relative grid h-11 w-11 place-items-center rounded-xl transition-all duration-150 active:scale-90
        ${active ? 'bg-accent-bg text-accent-text' : 'text-tx3 hover:bg-s3 hover:text-tx2'}`}
    >
      <Icon size={22} />
      {!!badge && badge > 0 && (
        <span className="animate-pop-in absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function TabItem({ href, label, badge, active, Icon }: ItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-150
        ${active ? 'text-accent-text' : 'text-tx3'}`}
    >
      <Icon size={22} />
      <span className="text-[10px] font-medium leading-none">{label}</span>
      {!!badge && badge > 0 && (
        <span className="absolute right-[22%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

/** Ro'yxat ustuni + tafsilot — telefonda navbatma-navbat ko'rsatiladi. */
export function TwoPane({
  list, children, hasDetail, listWidth = 'w-[300px]',
}: {
  list: React.ReactNode;
  children: React.ReactNode;
  hasDetail: boolean;
  listWidth?: string;
}) {
  return (
    <div className="flex h-full min-h-0 w-full">
      <aside
        className={`${listWidth} shrink-0 flex-col border-r border-line bg-s1
          ${hasDetail ? 'hidden md:flex' : 'flex w-full md:w-[300px]'}`}
      >
        {list}
      </aside>
      <section className={`min-w-0 flex-1 flex-col ${hasDetail ? 'flex' : 'hidden md:flex'}`}>
        {children}
      </section>
    </div>
  );
}

/** Tanlanmagan holat — kompyuterda o'ng tomonda ko'rinadi. */
export function NothingSelected({ text }: { text: string }) {
  return (
    <div className="animate-fade-in grid h-full place-items-center px-6">
      <p className="rounded-full bg-s2 px-4 py-1.5 text-[13px] text-tx3">{text}</p>
    </div>
  );
}
