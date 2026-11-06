'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/i18n-provider';
import { Panel, Badge } from '@/components/surface';
import { Button, Input, Select, Field } from '@/components/ui';
import { saveCardAction, setActiveCardAction, deleteCardAction } from '../actions';
import { Hint } from './hint';
import type { CardRow } from './types';

export function CardsTab({ cards }: { cards: CardRow[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const run = (fn: () => Promise<{ error?: string; ok?: boolean } | undefined>) =>
    start(async () => {
      const res = await fn();
      if (res?.error) return setError(res.error);
      setError(null);
      setAdding(false);
      router.refresh();
    });

  return (
    <Panel title={t('set.cards')}>
      <Hint>{t('set.cardsHint')}</Hint>

      <ul className="divide-y divide-border">
        {cards.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-medium tracking-wide">{c.cardNumber}</p>
              <p className="text-[11px] text-fg-subtle">
                {c.holderName} · {c.cardType.toUpperCase()} · {c.currency}
                {c.label ? ` · ${c.label}` : ''}
              </p>
            </div>
            {c.isActive ? (
              <Badge tone="accent">{t('set.activeNow')}</Badge>
            ) : (
              <>
                <Button size="sm" disabled={pending} onClick={() => run(() => setActiveCardAction(c.id, c.currency))}>
                  {t('set.activate')}
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteCardAction(c.id))}>
                  {t('set.delete')}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="px-4 pb-2 text-xs text-danger">{error}</p>}

      {adding ? (
        <form action={(fd) => run(() => saveCardAction(fd))} className="animate-slide-up grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <Field label={t('set.cardNumber')}>
            <Input name="cardNumber" placeholder="9860 0000 0000 0000" required autoFocus />
          </Field>
          <Field label={t('set.holder')}>
            <Input name="holderName" placeholder="Turdimatov Muzaffar" required />
          </Field>
          <Field label={t('set.label')}>
            <Input name="label" placeholder="Zaxira" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('set.cardType')}>
              <Select name="cardType">
                {['humo', 'uzcard', 'visa'].map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
              </Select>
            </Field>
            <Field label={t('set.currency')}>
              <Select name="currency">
                {['UZS', 'USD'].map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={pending}>{t('set.add')}</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>{t('pay.cancel')}</Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-border p-4">
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>+ {t('set.newCard')}</Button>
        </div>
      )}
    </Panel>
  );
}
