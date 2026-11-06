'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/components/i18n-provider';
import { useLiveEvent } from '@/components/live';
import { TwoPane } from '../shell';
import { Input, Segmented } from '@/components/ui';
import { Badge } from '@/components/surface';
import { IconSearch } from '@/components/icons';
import { TimeAgo } from '../ui';

export type Row = {
  id: string; status: string; userName: string | null; userPhone: string | null;
  clientType: string | null; legalArea: string | null; summary: string | null;
  lastBody: string | null; lastMessageAt: string; unpaidReceipts: number;
};

type Filter = 'hammasi' | 'advokat_kutmoqda' | 'tolov_kutilmoqda' | 'yopilgan';

export function InboxPane({ rows, children }: { rows: Row[]; children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const selectedId = pathname.split('/')[3];

  const [filter, setFilter] = useState<Filter>('hammasi');
  const [query, setQuery] = useState('');
  const [rawCursor, setCursor] = useState(0);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useLiveEvent((e) => {
    if (e.type !== 'message' || e.sender !== 'user') return;
    setFresh((prev) => new Set(prev).add(e.conversationId));
    setTimeout(() => setFresh((prev) => {
      const next = new Set(prev);
      next.delete(e.conversationId);
      return next;
    }), 2200);
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (filter === 'hammasi' ? r.status !== 'yopilgan' : r.status === filter))
      .filter((r) =>
        !q ||
        [r.userName, r.userPhone, r.summary, r.lastBody, r.legalArea]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
  }, [rows, filter, query]);

  const cursor = Math.min(rawCursor, Math.max(visible.length - 1, 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (typing) { if (e.key === 'Escape') (e.target as HTMLElement).blur(); return; }
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, visible.length - 1)); }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === 'Enter' && visible[cursor]) { e.preventDefault(); router.push(`/admin/inbox/${visible[cursor].id}`); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, cursor, router]);

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'hammasi', label: t('inbox.all') },
    { value: 'advokat_kutmoqda', label: t('inbox.shortLawyer') },
    { value: 'tolov_kutilmoqda', label: t('inbox.shortPayment') },
    { value: 'yopilgan', label: t('inbox.closed') },
  ];

  const list = (
    <>
      <div className="shrink-0 space-y-2 border-b border-line-soft px-3 py-2.5">
        <div className="relative">
          <IconSearch size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tx3" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            placeholder={t('inbox.search')}
            className="h-8 pl-8 text-[12.5px]"
          />
        </div>
        <div className="-mx-0.5 overflow-x-auto pb-0.5">
          <Segmented value={filter} options={FILTERS} onChange={(v) => { setFilter(v); setCursor(0); }} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] text-tx3">{t('inbox.empty')}</p>
        ) : (
          visible.map((r, i) => (
            <Link
              key={r.id}
              href={`/admin/inbox/${r.id}`}
              onMouseEnter={() => setCursor(i)}
              className={`flex items-center gap-2.5 px-3 py-2 transition-colors duration-100
                ${r.id === selectedId ? 'bg-accent-bg' : i === cursor ? 'bg-s3' : 'hover:bg-s3'}
                ${fresh.has(r.id) ? 'animate-highlight' : ''}`}
            >
              <Avatar name={r.userName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
                    {r.userName ?? t('inbox.noName')}
                  </span>
                  <TimeAgo date={r.lastMessageAt} className="ml-auto shrink-0 text-[10.5px] text-tx3" />
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-tx2">
                    {r.summary ?? r.lastBody ?? '—'}
                  </span>
                  {r.unpaidReceipts > 0 && <Badge tone="warning">{t('inbox.receipt')}</Badge>}
                  {r.status === 'advokat_kutmoqda' && <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );

  return <TwoPane list={list} hasDetail={!!selectedId}>{children}</TwoPane>;
}

/** Ism bosh harflari — Telegram uslubidagi rangli doira. */
function Avatar({ name }: { name: string | null }) {
  const label = (name ?? '?').trim();
  const initials = label.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const hue = [...label].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      aria-hidden
      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white"
      style={{ background: `hsl(${hue} 52% 46%)` }}
    >
      {initials}
    </span>
  );
}
