'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/i18n-provider';
import { Panel, EmptyState } from '@/components/surface';
import { Button } from '@/components/ui';
import { TimeAgo } from '../ui';
import { setUserBlockedAction } from '../actions';
import { Hint } from './hint';

export type BlockedRow = {
  id: string; fullName: string | null; phone: string | null;
  username: string | null; createdAt: string;
};

export function BlockedTab({ rows }: { rows: BlockedRow[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Panel title={t('set.blocked')}>
      <Hint>{t('set.blockedHint')}</Hint>
      {rows.length === 0 ? (
        <EmptyState>{t('set.noBlocked')}</EmptyState>
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold">{u.fullName ?? t('inbox.noName')}</p>
                <p className="text-[11.5px] text-tx3">
                  {u.phone ?? t('inbox.noPhone')}
                  {u.username ? ` · @${u.username}` : ''}
                  {' · '}
                  <TimeAgo date={u.createdAt} />
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={pending}
                onClick={() => start(async () => { await setUserBlockedAction(u.id, false); router.refresh(); })}
              >
                {t('set.unblock')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
