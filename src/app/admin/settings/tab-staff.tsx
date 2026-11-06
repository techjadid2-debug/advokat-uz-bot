'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/i18n-provider';
import { Panel, Badge } from '@/components/surface';
import { Button, Input, Select, Field } from '@/components/ui';
import { TimeAgo } from '../ui';
import { createStaffAction, resetStaffPasswordAction, toggleStaffAction } from '../actions';
import { Hint } from './hint';

export type StaffRow = {
  id: string; email: string; fullName: string; role: string;
  isActive: boolean; lastLoginAt: string | null; isSelf: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  lawyer: 'Advokat', assistant: 'Yordamchi', admin: 'Administrator',
};

export function StaffTab({ staff, canManage }: { staff: StaffRow[]; canManage: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<{ email: string; value: string } | null>(null);

  const run = (fn: () => Promise<{ error?: string; ok?: boolean; password?: string } | undefined>, email?: string) =>
    start(async () => {
      const res = await fn();
      if (res?.error) return setError(res.error);
      setError(null);
      setAdding(false);
      if (res?.password) setPassword({ email: email ?? '', value: res.password });
      router.refresh();
    });

  return (
    <Panel title={t('set.staff')}>
      <Hint>{t('set.staffHint')}</Hint>

      {password && (
        <div className="animate-slide-up border-b border-line-soft bg-accent-bg px-4 py-3">
          <p className="mb-1 text-[12px] font-semibold text-accent-text">{t('set.newPassword')}</p>
          <p className="mb-2 text-[11.5px] text-tx2">{t('set.passwordOnce')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all rounded-[10px] bg-s2 px-3 py-2 font-mono text-[13px]">
              {password.value}
            </code>
            <Button size="sm" variant="secondary" onClick={() => setPassword(null)}>
              {t('pay.cancel')}
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-line-soft">
        {staff.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[13.5px] font-semibold ${s.isActive ? '' : 'text-tx3 line-through'}`}>
                  {s.fullName}
                </span>
                <Badge tone={s.role === 'lawyer' ? 'accent' : 'neutral'}>{ROLE_LABEL[s.role] ?? s.role}</Badge>
                {s.isSelf && <Badge>{t('set.you')}</Badge>}
              </div>
              <p className="text-[11.5px] text-tx3">
                {s.email}
                {s.lastLoginAt && (
                  <>
                    {' · '}
                    {t('set.lastLogin')} <TimeAgo date={s.lastLoginAt} />
                  </>
                )}
              </p>
            </div>
            {canManage && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => resetStaffPasswordAction(s.id), s.email)}
                >
                  {t('set.resetPassword')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending || s.isSelf}
                  onClick={() => run(() => toggleStaffAction(s.id, !s.isActive))}
                >
                  {s.isActive ? t('set.disable') : t('set.enable')}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="px-4 pb-2 text-[12px] text-danger">{error}</p>}

      {canManage && (adding ? (
        <form
          action={(fd) => run(() => createStaffAction(fd), String(fd.get('email')))}
          className="animate-slide-up grid gap-3 border-t border-line-soft p-4 sm:grid-cols-2"
        >
          <Field label={t('set.staffName')}>
            <Input name="fullName" required autoFocus placeholder="Aziza Karimova" />
          </Field>
          <Field label={t('login.email')}>
            <Input name="email" type="email" required placeholder="aziza@advokat.uz" />
          </Field>
          <Field label={t('set.role')}>
            <Select name="role">
              <option value="assistant">{ROLE_LABEL.assistant}</option>
              <option value="lawyer">{ROLE_LABEL.lawyer}</option>
              <option value="admin">{ROLE_LABEL.admin}</option>
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" loading={pending}>{t('set.add')}</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>{t('pay.cancel')}</Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-line-soft p-4">
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>+ {t('set.newStaff')}</Button>
        </div>
      ))}
    </Panel>
  );
}
