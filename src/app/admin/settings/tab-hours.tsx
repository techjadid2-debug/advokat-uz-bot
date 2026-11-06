'use client';

import { useState } from 'react';
import { useT } from '@/components/i18n-provider';
import { Panel } from '@/components/surface';
import { Input, Field } from '@/components/ui';
import type { BotSettings } from '@/core/bot-settings';
import type { Locale } from '@/i18n';
import { I18nTextarea } from './i18n-text';
import { useSaveSettings } from './use-save';
import { Hint } from './hint';
import { SaveBar } from './save-bar';

const DAYS: Record<Locale, string[]> = {
  uz_latn: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  uz_cyrl: ['Ду', 'Се', 'Чо', 'Па', 'Жу', 'Ша', 'Як'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

export function HoursTab({ bot, locale }: { bot: BotSettings; locale: Locale }) {
  const t = useT();
  const { save, pending, saved, error } = useSaveSettings();
  const [form, setForm] = useState(bot);
  const set = <K extends keyof BotSettings>(k: K, v: BotSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDay = (day: number) =>
    set('workDays', form.workDays.includes(day)
      ? form.workDays.filter((d) => d !== day)
      : [...form.workDays, day].sort());

  return (
    <Panel title={t('set.hours')}>
      <Hint>{t('set.hoursHint')}</Hint>
      <div className="space-y-5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('set.workStart')}>
            <Input type="time" value={form.workStart} onChange={(e) => set('workStart', e.target.value)} />
          </Field>
          <Field label={t('set.workEnd')}>
            <Input type="time" value={form.workEnd} onChange={(e) => set('workEnd', e.target.value)} />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-fg-muted">{t('set.workDays')}</span>
          <div className="flex gap-1.5">
            {DAYS[locale].map((name, i) => {
              const day = i + 1;
              const on = form.workDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`h-9 w-11 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-90 ${
                    on ? 'bg-accent text-accent-fg shadow-soft' : 'bg-bg-subtle text-fg-subtle hover:bg-bg-hover'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <I18nTextarea
          label={t('set.afterHoursText')}
          rows={3}
          value={form.afterHoursText}
          onChange={(v) => set('afterHoursText', v)}
          placeholder="Hozir ish vaqti emas. Advokat ertaga ish kunida siz bilan bog'lanadi."
        />

        <SaveBar
          onSave={() => save({
            workStart: form.workStart, workEnd: form.workEnd,
            workDays: form.workDays, afterHoursText: form.afterHoursText,
          })}
          pending={pending} saved={saved} error={error} label={t('set.save')} savedLabel={t('set.saved')}
        />
      </div>
    </Panel>
  );
}
