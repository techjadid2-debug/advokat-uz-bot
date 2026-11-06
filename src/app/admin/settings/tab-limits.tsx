'use client';

import { useState } from 'react';
import { useT } from '@/components/i18n-provider';
import { Panel } from '@/components/surface';
import { Input, Field, Switch } from '@/components/ui';
import type { BotSettings } from '@/core/bot-settings';
import type { Locale } from '@/i18n';
import { I18nTextarea } from './i18n-text';
import { useSaveSettings } from './use-save';
import { Hint } from './hint';
import { SaveBar } from './save-bar';

export function LimitsTab({ bot }: { bot: BotSettings; locale: Locale }) {
  const t = useT();
  const { save, pending, saved, error } = useSaveSettings();
  const [form, setForm] = useState(bot);
  const set = <K extends keyof BotSettings>(k: K, v: BotSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Panel title={t('set.limits')}>
      <Hint>{t('set.limitsHint')}</Hint>
      <div className="space-y-5 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('set.freeQuestions')}>
            <Input type="number" min={0} max={10} value={form.freeQuestions}
              onChange={(e) => set('freeQuestions', Number(e.target.value))} />
          </Field>
          <Field label={t('set.minLength')}>
            <Input type="number" min={5} max={300} value={form.minQuestionLength}
              onChange={(e) => set('minQuestionLength', Number(e.target.value))} />
          </Field>
          <Field label={t('set.hourlyLimit')}>
            <Input type="number" min={1} max={100} value={form.hourlyAiLimit}
              onChange={(e) => set('hourlyAiLimit', Number(e.target.value))} />
          </Field>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <Toggle
            label={t('set.botEnabled')}
            checked={form.enabled}
            onChange={(v) => set('enabled', v)}
          />
          <Toggle
            label={t('set.maintenance')}
            checked={form.maintenance}
            onChange={(v) => set('maintenance', v)}
            danger
          />
          {form.maintenance && (
            <div className="animate-slide-up pt-1">
              <I18nTextarea
                label={t('set.maintenanceText')}
                rows={3}
                value={form.maintenanceText}
                onChange={(v) => set('maintenanceText', v)}
              />
            </div>
          )}
        </div>

        <SaveBar
          onSave={() => save({
            freeQuestions: form.freeQuestions,
            minQuestionLength: form.minQuestionLength,
            hourlyAiLimit: form.hourlyAiLimit,
            enabled: form.enabled,
            maintenance: form.maintenance,
            maintenanceText: form.maintenanceText,
          })}
          pending={pending} saved={saved} error={error} label={t('set.save')} savedLabel={t('set.saved')}
        />
      </div>
    </Panel>
  );
}

function Toggle({
  label, checked, onChange, danger,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onChange={onChange} label={label} />
      <span className={`text-sm ${danger && checked ? 'font-medium text-danger' : ''}`}>{label}</span>
    </div>
  );
}
