'use client';

import Link from 'next/link';
import { useT, useLocale } from '@/components/i18n-provider';
import { Panel, EmptyState } from '@/components/surface';
import { formatMoney } from '@/core/money';
import { FUNNEL_KEY } from '../ui';

/** Voronka bosqichlari — konversiyani ketma-ket ko'rish uchun shu tartibda. */
const ORDER = ['bepul_javob_berildi', 'pullik_faol', 'hujjat_taklif', 'ofis_taklif', 'advokatga_topshirildi'];

export function StatsView(props: {
  days: number;
  totals: { users: number; conversations: number; freeAnswers: number };
  stages: { stage: string; n: number }[];
  revenue: { title: string; currency: string; n: number; total: number }[];
  ai: { calls: number; costMicroUsd: number; avgLatency: number; failures: number };
  areas: { area: string | null; n: number }[];
}) {
  const t = useT();
  const locale = useLocale();

  const byStage = new Map(props.stages.map((s) => [s.stage, s.n]));
  const top = byStage.get('bepul_javob_berildi') ?? 0;

  const byCurrency = new Map<string, number>();
  for (const r of props.revenue) byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + r.total);

  const aiUsd = props.ai.costMicroUsd / 1_000_000;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-s1/80 px-4 backdrop-blur-xl">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em]">{t('nav.stats')}</h1>
        <div className="ml-auto inline-flex rounded-[10px] bg-s3 p-0.5">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/stats?days=${d}`}
              className={`rounded-lg px-3 py-1 text-[12px] font-medium transition-all duration-150 ${
                props.days === d ? 'bg-s1 text-tx' : 'text-tx2 hover:text-tx'
              }`}
            >
              {d} {t('stats.days')}
            </Link>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t('stats.newClients')} value={String(props.totals.users)} />
            <Stat label={t('stats.conversations')} value={String(props.totals.conversations)} />
            <Stat
              label={t('stats.revenue')}
              value={byCurrency.size === 0 ? '—' : [...byCurrency].map(([c, s]) => formatMoney(s, c, locale)).join(' + ')}
              accent
            />
            <Stat
              label={t('stats.aiCost')}
              value={aiUsd < 0.01 ? '< $0.01' : `$${aiUsd.toFixed(2)}`}
              hint={`${props.ai.calls} ${t('stats.requests')} · ${(props.ai.avgLatency / 1000).toFixed(1)}s ${t('stats.avgTime')}${
                props.ai.failures > 0 ? ` · ${props.ai.failures} ${t('stats.errors')}` : ''
              }`}
            />
          </div>

          <Panel title={t('stats.funnel')} padded>
            {top === 0 ? (
              <p className="py-6 text-center text-[13px] text-tx3">{t('stats.noData')}</p>
            ) : (
              <div className="space-y-3">
                {ORDER.map((stage, i) => {
                  const n = byStage.get(stage) ?? 0;
                  const pct = top > 0 ? Math.round((n / top) * 100) : 0;
                  return (
                    <div key={stage}>
                      <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                        <span className="font-medium">{FUNNEL_KEY[stage]}</span>
                        <span className="tabular-nums text-tx2">
                          {n}
                          {i > 0 && <span className="ml-2 text-[11px] text-tx3">{pct}%</span>}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-s3">
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                          style={{ width: `${Math.max(pct, n > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title={t('stats.revenueByService')}>
              {props.revenue.length === 0 ? (
                <EmptyState>{t('pay.noRecent')}</EmptyState>
              ) : (
                <ul className="divide-y divide-line-soft text-[13px]">
                  {props.revenue.map((r, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                      <span className="shrink-0 text-[11.5px] text-tx3">{r.n} {t('stats.count')}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(r.total, r.currency, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={t('stats.topAreas')}>
              {props.areas.length === 0 ? (
                <EmptyState>{t('stats.noData')}</EmptyState>
              ) : (
                <ul className="divide-y divide-line-soft text-[13px]">
                  {props.areas.map((a, i) => {
                    const max = props.areas[0]?.n || 1;
                    return (
                      <li key={i} className="relative flex justify-between px-4 py-2.5">
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 bg-accent-bg"
                          style={{ width: `${(a.n / max) * 100}%` }}
                        />
                        <span className="relative">{a.area ?? t('stats.unknown')}</span>
                        <span className="relative tabular-nums text-tx2">{a.n}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="animate-slide-up rounded-[14px] border border-line bg-s2 p-4">
      <p className="text-[11.5px] font-medium text-tx2">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.02em] ${accent ? 'text-accent-text' : ''}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[10.5px] leading-snug text-tx3">{hint}</p>}
    </div>
  );
}
