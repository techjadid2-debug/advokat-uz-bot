'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui';
import { LOCALES, type Locale } from '@/i18n';
import type { I18nText } from '@/core/bot-settings';

const SHORT: Record<Locale, string> = { uz_latn: 'UZ', uz_cyrl: 'ЎЗ', ru: 'RU', en: 'EN' };

/**
 * 4 tilli matn maydoni.
 * Bo'sh qoldirilgan til uchun bot standart matnni ishlatadi — shuning uchun
 * advokat faqat o'zi xohlagan tilni yozsa ham bo'ladi.
 */
export function I18nTextarea({
  label, hint, value, onChange, rows = 3, placeholder,
}: {
  label: string;
  hint?: string;
  value: I18nText;
  onChange: (next: I18nText) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [active, setActive] = useState<Locale>('uz_latn');

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <div className="ml-auto flex gap-0.5 rounded-lg bg-bg-subtle p-0.5">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setActive(loc)}
              className={`relative rounded-md px-2 py-0.5 text-[10px] font-bold transition-all duration-150 ${
                active === loc ? 'bg-bg-elevated text-fg shadow-soft' : 'text-fg-subtle hover:text-fg-muted'
              }`}
            >
              {SHORT[loc]}
              {value[loc]?.trim() && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        rows={rows}
        placeholder={placeholder}
        value={value[active] ?? ''}
        onChange={(e) => onChange({ ...value, [active]: e.target.value })}
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-fg-subtle">{hint}</p>}
    </div>
  );
}
