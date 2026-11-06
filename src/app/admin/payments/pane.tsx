'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/components/i18n-provider';
import { useLiveEvent } from '@/components/live';
import { Segmented } from '@/components/ui';
import { TwoPane } from '../shell';
import { TimeAgo, Money } from '../ui';

export type PayRow = {
  id: string; title: string; amountMinor: number; currency: string;
  refCode: string; status: string; receiptAt: string | null;
  confirmedAt: string | null; userName: string | null;
};

export function PaymentsPane({
  pending, recent, children,
}: { pending: PayRow[]; recent: PayRow[]; children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const selectedId = pathname.split('/')[3];
  const [tab, setTab] = useState<'pending' | 'recent'>('pending');

  useLiveEvent((e) => { if (e.type === 'receipt') router.refresh(); });

  const rows = tab === 'pending' ? pending : recent;

  const list = (
    <>
      <div className="shrink-0 border-b border-line-soft px-3 py-2.5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending' as const, label: `${t('pay.pending')} ${pending.length ? `· ${pending.length}` : ''}` },
            { value: 'recent' as const, label: t('pay.recent') },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] text-tx3">
            {tab === 'pending' ? t('pay.empty') : t('pay.noRecent')}
          </p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/payments/${r.id}`}
              className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors duration-100
                ${r.id === selectedId ? 'bg-accent-bg' : 'hover:bg-s3'}`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${
                r.status === 'tolandi' ? 'bg-accent' : r.status === 'rad_etildi' ? 'bg-danger' : 'bg-warning'
              }`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[13px] font-semibold">{r.title}</span>
                  <span className="ml-auto shrink-0 text-[12.5px] font-semibold tabular-nums">
                    <Money minor={r.amountMinor} currency={r.currency} />
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-2 text-[11.5px] text-tx3">
                  <span className="truncate">{r.userName ?? t('inbox.noName')}</span>
                  <span className="ml-auto shrink-0 font-mono">{r.refCode}</span>
                  <TimeAgo date={r.receiptAt ?? r.confirmedAt} className="shrink-0" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );

  return <TwoPane list={list} hasDetail={!!selectedId} listWidth="w-[320px]">{children}</TwoPane>;
}
