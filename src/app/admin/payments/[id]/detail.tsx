'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useT } from '@/components/i18n-provider';
import { Button, Input } from '@/components/ui';
import { Badge } from '@/components/surface';
import { IconBack } from '@/components/icons';
import { TimeAgo, Money } from '../../ui';
import { confirmPaymentAction, rejectPaymentAction } from '../../actions';

export function PaymentDetail({
  order, user,
}: {
  order: {
    id: string; title: string; amountMinor: number; currency: string;
    refCode: string; status: string; cardNumber: string | null;
    receiptFileId: string | null; receiptAt: string | null;
    confirmedAt: string | null; rejectionReason: string | null;
    conversationId: string | null;
  };
  user: { fullName: string | null; phone: string | null; username: string | null };
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string; ok?: boolean } | undefined>) =>
    start(async () => {
      const res = await fn();
      if (res?.error) return setError(res.error);
      setError(null);
      setRejecting(false);
      router.refresh();
    });

  const waiting = order.status === 'chek_yuborildi';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-s1/80 px-3 backdrop-blur-xl">
        <Link
          href="/admin/payments"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tx2 transition-all duration-150 hover:bg-s3 active:scale-90 md:hidden"
          aria-label={t('pay.pending')}
        >
          <IconBack />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold tracking-[-0.01em]">{order.title}</p>
          <p className="text-[11.5px] text-tx3">
            {t('pay.code')} <span className="font-mono">{order.refCode}</span>
          </p>
        </div>
        <Badge tone={order.status === 'tolandi' ? 'accent' : order.status === 'rad_etildi' ? 'danger' : 'warning'}>
          {order.status}
        </Badge>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-[28px] font-semibold tabular-nums tracking-[-0.02em]">
              <Money minor={order.amountMinor} currency={order.currency} />
            </span>
            <span className="text-[13px] text-tx2">
              {user.fullName ?? t('inbox.noName')}
              {user.phone ? ` · ${user.phone}` : ''}
              {user.username ? ` · @${user.username}` : ''}
            </span>
          </div>

          {order.receiptFileId && (
            <a
              href={`/api/receipt/${order.receiptFileId}`}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-[14px] border border-line transition-colors duration-150 hover:border-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- chek Telegram proksisidan keladi */}
              <img
                src={`/api/receipt/${order.receiptFileId}`}
                alt={t('pay.receiptTime')}
                className="max-h-[46vh] w-full bg-s2 object-contain"
              />
            </a>
          )}

          <dl className="overflow-hidden rounded-[14px] border border-line bg-s2 text-[13px]">
            <Row label={t('pay.card')} value={order.cardNumber ?? '—'} mono />
            <Row label={t('pay.receiptTime')} node={<TimeAgo date={order.receiptAt} />} />
            {order.confirmedAt && <Row label={t('pay.confirm')} node={<TimeAgo date={order.confirmedAt} />} />}
            {order.rejectionReason && <Row label={t('pay.reject')} value={order.rejectionReason} />}
            {order.conversationId && (
              <div className="flex gap-3 px-4 py-2.5">
                <dt className="w-32 shrink-0 text-tx2">{t('pay.openConversation')}</dt>
                <dd className="min-w-0 flex-1">
                  <Link href={`/admin/inbox/${order.conversationId}`} className="text-accent-text hover:underline">
                    {t('conv.back')} →
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          {waiting && (
            <div className="space-y-3">
              {rejecting ? (
                <div className="animate-slide-up space-y-2">
                  <Input
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('pay.rejectReason')}
                    onKeyDown={(e) => e.key === 'Enter' && run(() => rejectPaymentAction(order.id, reason))}
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" loading={pending} onClick={() => run(() => rejectPaymentAction(order.id, reason))}>
                      {t('pay.reject')}
                    </Button>
                    <Button variant="ghost" onClick={() => setRejecting(false)}>{t('pay.cancel')}</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="lg" loading={pending} onClick={() => run(() => confirmPaymentAction(order.id))}>
                    {t('pay.confirm')}
                  </Button>
                  <Button size="lg" variant="secondary" disabled={pending} onClick={() => setRejecting(true)}>
                    {t('pay.reject')}
                  </Button>
                </div>
              )}
              {error && <p className="text-[12px] text-danger">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, node, mono }: { label: string; value?: string; node?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-3 border-b border-line-soft px-4 py-2.5 last:border-0">
      <dt className="w-32 shrink-0 text-tx2">{label}</dt>
      <dd className={`min-w-0 flex-1 ${mono ? 'font-mono' : ''}`}>{node ?? value}</dd>
    </div>
  );
}
