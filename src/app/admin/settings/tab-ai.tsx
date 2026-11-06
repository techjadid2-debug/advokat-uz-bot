'use client';

import { useState } from 'react';
import { useT } from '@/components/i18n-provider';
import { Panel } from '@/components/surface';
import { Input, Textarea, Field, Select, Switch } from '@/components/ui';
import type { BotSettings } from '@/core/bot-settings';
import { useSaveSettings } from './use-save';
import { Hint } from './hint';
import { SaveBar } from './save-bar';

/** Kalit bilan sinovdan o'tgan modellar. Bo'sh = .env dagi standart. */
const MODELS = [
  '', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash',
  'gemini-flash-latest', 'gemini-pro-latest', 'gemini-3.1-pro-preview',
];

export function AiTab({ bot }: { bot: BotSettings }) {
  const t = useT();
  const { save, pending, saved, error } = useSaveSettings();
  const [form, setForm] = useState(bot);
  const set = <K extends keyof BotSettings>(k: K, v: BotSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Panel title={t('set.ai')}>
      <Hint>{t('set.aiHint')}</Hint>
      <div className="space-y-5 p-4">
        <div className="rounded-[12px] border border-line p-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.aiUseLegalSources}
              onChange={(v) => set('aiUseLegalSources', v)}
              label={t('set.legalSources')}
            />
            <span className="text-[13.5px] font-medium">{t('set.legalSources')}</span>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-tx3">{t('set.legalSourcesHint')}</p>
        </div>

        <Field label={t('set.aiExtra')}>
          <Textarea
            rows={7}
            value={form.aiExtraInstruction}
            onChange={(e) => set('aiExtraInstruction', e.target.value)}
            placeholder={"Masalan: mehnat nizolarida har doim Davlat mehnat inspeksiyasiga murojaat variantini eslatib o't."}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('set.aiModelFast')}>
            <Select value={form.aiModelFast} onChange={(e) => set('aiModelFast', e.target.value)}>
              {MODELS.map((m) => <option key={m} value={m}>{m || '— standart —'}</option>)}
            </Select>
          </Field>
          <Field label={t('set.aiModelDeep')}>
            <Select value={form.aiModelDeep} onChange={(e) => set('aiModelDeep', e.target.value)}>
              {MODELS.map((m) => <option key={m} value={m}>{m || '— standart —'}</option>)}
            </Select>
          </Field>
          <Field label={t('set.aiFreeLength')}>
            <Input
              type="number" min={600} max={6000} step={100}
              value={form.aiFreeLength}
              onChange={(e) => set('aiFreeLength', Number(e.target.value))}
            />
          </Field>
          <Field label={t('set.aiPaidLength')}>
            <Input
              type="number" min={600} max={8000} step={100}
              value={form.aiPaidLength}
              onChange={(e) => set('aiPaidLength', Number(e.target.value))}
            />
          </Field>
        </div>

        <SaveBar
          onSave={() => save({
            aiUseLegalSources: form.aiUseLegalSources,
            aiExtraInstruction: form.aiExtraInstruction,
            aiModelFast: form.aiModelFast, aiModelDeep: form.aiModelDeep,
            aiFreeLength: form.aiFreeLength, aiPaidLength: form.aiPaidLength,
          })}
          pending={pending} saved={saved} error={error} label={t('set.save')} savedLabel={t('set.saved')}
        />
      </div>
    </Panel>
  );
}
