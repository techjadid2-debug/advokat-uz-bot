'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT, useLocale } from '@/components/i18n-provider';
import { Panel } from '@/components/surface';
import { Button, Input } from '@/components/ui';
import { TimeAgo } from '../ui';
import { updatePriceAction, toggleServiceAction } from '../actions';
import { Hint } from './hint';
import type { ServiceRow, HistoryRow } from './types';

const KIND_LABEL: Record<string, string> = {
  savol: 'Savollar', hujjat: 'Hujjatlar', konsultatsiya: 'Advokatga ulanish',
  offline: 'Offline', paket: 'Paketlar',
};

export function PricesTab({ services, history }: { services: ServiceRow[]; history: HistoryRow[] }) {
  const t = useT();
  const kinds = [...new Set(services.map((s) => s.kind))];

  return (
    <>
      <Panel title={t('set.prices')}>
        <Hint>{t('set.pricesHint')}</Hint>
        {kinds.map((kind) => (
          <div key={kind}>
            <h3 className="bg-bg-subtle px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
              {KIND_LABEL[kind] ?? kind}
            </h3>
            <ul className="divide-y divide-border">
              {services.filter((s) => s.kind === kind).map((s) => <PriceRow key={s.code} svc={s} />)}
            </ul>
          </div>
        ))}
      </Panel>

      {history.length > 0 && (
        <Panel title={t('set.history')}>
          <ul className="divide-y divide-border text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                <span className="font-mono text-[11px] text-fg-subtle">{h.serviceCode}</span>
                {h.oldMajor !== null && (
                  <span className="tabular-nums text-fg-subtle line-through">
                    {h.oldMajor.toLocaleString()}
                  </span>
                )}
                <span className="font-semibold tabular-nums">
                  {h.newMajor.toLocaleString()} {h.currency}
                </span>
                <span className="ml-auto text-[11px] text-fg-subtle">
                  {h.adminName ?? '—'} · <TimeAgo date={h.createdAt} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function PriceRow({ svc }: { svc: ServiceRow }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(String(svc.amountMajor));
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const dirty = Number(value) !== svc.amountMajor;

  const save = () =>
    start(async () => {
      await updatePriceAction(svc.code, Number(value));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${svc.isActive ? '' : 'text-fg-subtle line-through'}`}>
          {svc.title}
        </p>
        <p className="font-mono text-[10px] text-fg-subtle">{svc.code}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="number" min="0" step={svc.currency === 'USD' ? 1 : 1000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && dirty && save()}
          className="w-32 text-right tabular-nums"
        />
        <span className="w-9 text-xs text-fg-subtle">
          {svc.currency === 'USD' ? '$' : locale === 'ru' ? 'сум' : locale === 'en' ? 'UZS' : "so'm"}
        </span>
      </div>

      <Button size="sm" onClick={save} disabled={!dirty} loading={pending}>
        {saved ? `${t('set.saved')} ✓` : t('set.save')}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => start(async () => { await toggleServiceAction(svc.code, !svc.isActive); router.refresh(); })}
      >
        {svc.isActive ? t('set.disable') : t('set.enable')}
      </Button>
    </li>
  );
}
