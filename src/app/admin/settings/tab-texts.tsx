'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/i18n-provider';
import { Panel } from '@/components/surface';
import { Button, Input, Textarea } from '@/components/ui';
import { IconSearch, IconCheck } from '@/components/icons';
import { LOCALES, type Locale } from '@/i18n';
import { saveBotTextsAction } from '../actions';
import { Hint } from './hint';

export type TextRow = {
  key: string;
  group: string;
  defaults: Record<Locale, string>;
  overrides: Partial<Record<Locale, string>>;
};

const SHORT: Record<Locale, string> = { uz_latn: 'UZ', uz_cyrl: 'ЎЗ', ru: 'RU', en: 'EN' };

const GROUP_LABEL: Record<string, string> = {
  start: 'Boshlanish', lang: 'Til', menu: 'Menyu', ask: 'Savol berish',
  pay: "To'lov", cta: 'Chaqiruv tugmalari', balance: 'Balans',
  services: 'Xizmatlar', phone: 'Telefon raqami', lawyer: 'Advokat',
  error: 'Xatolar', safety: 'Xavfsizlik', disclaimer: 'Disclaimer', common: 'Umumiy',
};

export function BotTextsTab({ rows }: { rows: TextRow[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState('');
  const [locale, setLocale] = useState<Locale>('uz_latn');
  const [draft, setDraft] = useState<Record<string, Partial<Record<Locale, string>>>>({});
  const [saved, setSaved] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        Object.values(r.defaults).some((v) => v.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const groups = useMemo(() => {
    const map = new Map<string, TextRow[]>();
    for (const r of visible) {
      const list = map.get(r.group) ?? [];
      list.push(r);
      map.set(r.group, list);
    }
    return [...map.entries()];
  }, [visible]);

  const dirtyCount = Object.keys(draft).length;

  const value = (r: TextRow) =>
    draft[r.key]?.[locale] ?? r.overrides[locale] ?? '';

  const edit = (key: string, text: string) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] ?? {}), [locale]: text } }));

  const save = () =>
    start(async () => {
      await saveBotTextsAction(draft as Record<string, Record<string, string>>);
      setDraft({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });

  return (
    <Panel title={t('set.botTexts')}>
      <Hint>{t('set.botTextsHint')}</Hint>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line-soft bg-s2 px-4 py-2.5">
        <div className="relative min-w-[160px] flex-1">
          <IconSearch size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tx3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('inbox.search')}
            className="h-8 pl-8 text-[12.5px]"
          />
        </div>
        <div className="flex gap-0.5 rounded-[10px] bg-s3 p-0.5">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => setLocale(loc)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                locale === loc ? 'bg-s1 text-tx' : 'text-tx2 hover:text-tx'
              }`}
            >
              {SHORT[loc]}
            </button>
          ))}
        </div>
        <Button onClick={save} disabled={dirtyCount === 0} loading={pending}>
          {saved ? (
            <>
              <IconCheck size={14} /> {t('set.saved')}
            </>
          ) : dirtyCount > 0 ? (
            `${t('set.save')} · ${dirtyCount}`
          ) : (
            t('set.save')
          )}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-12 text-center text-[13px] text-tx3">{t('inbox.empty')}</p>
      ) : (
        groups.map(([group, items]) => (
          <div key={group}>
            <h3 className="bg-s1 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-tx3">
              {GROUP_LABEL[group] ?? group}
            </h3>
            <ul className="divide-y divide-line-soft">
              {items.map((r) => {
                const current = value(r);
                const isCustom = current.trim().length > 0;
                return (
                  <li key={r.key} className="px-4 py-3">
                    <div className="mb-1.5 flex items-center gap-2">
                      <code className="text-[10.5px] text-tx3">{r.key}</code>
                      {isCustom && (
                        <span className="rounded bg-accent-bg px-1.5 py-0.5 text-[9.5px] font-semibold text-accent-text">
                          {t('set.customized')}
                        </span>
                      )}
                      {draft[r.key]?.[locale] !== undefined && (
                        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                      )}
                    </div>
                    <Textarea
                      rows={Math.min(Math.max(Math.ceil((r.defaults[locale]?.length ?? 40) / 70), 1), 6)}
                      value={current}
                      onChange={(e) => edit(r.key, e.target.value)}
                      placeholder={r.defaults[locale] || r.defaults.uz_latn}
                      className="text-[12.5px]"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </Panel>
  );
}
