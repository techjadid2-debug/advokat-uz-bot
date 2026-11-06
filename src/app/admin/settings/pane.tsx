'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/components/i18n-provider';
import { TwoPane } from '../shell';
import type { AdminKey } from '@/i18n/admin';

export const SECTIONS: { slug: string; label: AdminKey }[] = [
  { slug: 'prices', label: 'set.prices' },
  { slug: 'cards', label: 'set.cards' },
  { slug: 'texts', label: 'set.botTexts' },
  { slug: 'ai', label: 'set.ai' },
  { slug: 'limits', label: 'set.limits' },
  { slug: 'hours', label: 'set.hours' },
  { slug: 'staff', label: 'set.staff' },
  { slug: 'blocked', label: 'set.blocked' },
];

export function SettingsPane({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const active = pathname.split('/')[3];

  const list = (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em]">{t('nav.settings')}</h1>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/admin/settings/${s.slug}`}
            className={`mb-0.5 block rounded-[10px] px-3 py-2 text-[13.5px] transition-colors duration-100
              ${active === s.slug ? 'bg-accent-bg font-medium text-accent-text' : 'text-tx2 hover:bg-s3 hover:text-tx'}`}
          >
            {t(s.label)}
          </Link>
        ))}
      </nav>
    </>
  );

  return <TwoPane list={list} hasDetail={!!active} listWidth="w-[240px]">{children}</TwoPane>;
}
