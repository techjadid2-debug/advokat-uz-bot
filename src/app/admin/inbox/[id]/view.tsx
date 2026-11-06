'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { useT } from '@/components/i18n-provider';
import { useLiveEvent } from '@/components/live';
import { Badge, EmptyState } from '@/components/surface';
import { Button, Input, Textarea } from '@/components/ui';
import { IconBack, IconInfo, IconClose, IconSend } from '@/components/icons';
import { StatusBadge, TimeAgo, useClientTypeLabel, Money, FUNNEL_KEY } from '../../ui';
import {
  replyAction, closeConversationAction,
  confirmPaymentAction, rejectPaymentAction,
} from '../../actions';

type Msg = { id: string; sender: string; body: string; attachments: number; createdAt: string };
export type Payment = {
  id: string; title: string; status: string; refCode: string;
  amountMinor: number; currency: string; createdAt: string;
  conversationId: string | null; receiptFileId: string | null;
  receiptAt: string | null; rejectionReason: string | null;
};
type Card = {
  summary: string | null; legalArea: string | null;
  keyFacts: string[]; risks: string[]; suggestedPosition: string | null;
  deadlines: { name: string; endsAt?: string; note: string }[];
  updatedAt: Date;
} | null;

export function ConversationView(props: {
  conversation: { id: string; status: string; funnelStage: string };
  user: {
    fullName: string | null; phone: string | null; username: string | null;
    locale: string; clientType: string | null; freeUsed: boolean;
  };
  card: Card;
  thread: Msg[];
  latestAi: {
    urgency: string | null; confidence: string | null;
    needsDocuments: boolean; recommendedNext: string; missingInfo: string[];
  } | null;
  payments: Payment[];
}) {
  const t = useT();
  const router = useRouter();
  const clientTypeLabel = useClientTypeLabel();

  const [pending, start] = useTransition();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Optimistik: "Yuborish" bosilishi bilan xabar chatda paydo bo'ladi. */
  const [thread, addOptimistic] = useOptimistic(
    props.thread,
    (state: Msg[], text: string): Msg[] => [
      ...state,
      { id: `tmp-${Date.now()}`, sender: 'lawyer', body: text, attachments: 0, createdAt: new Date().toISOString() },
    ],
  );

  useLiveEvent((e) => {
    if ('conversationId' in e && e.conversationId === props.conversation.id) router.refresh();
  });

  /**
   * Chek suhbat oqimining ichida, kelgan vaqtida turadi.
   * Advokat suhbatni o'qib turib darhol tasdiqlaydi — "To'lovlar" bo'limiga
   * o'tish shart emas.
   */
  const timeline = useMemo(() => {
    const items: ({ kind: 'msg'; at: string; msg: Msg } | { kind: 'pay'; at: string; pay: Payment })[] =
      thread.map((m) => ({ kind: 'msg' as const, at: m.createdAt, msg: m }));

    for (const p of props.payments) {
      if (p.conversationId !== props.conversation.id || !p.receiptAt) continue;
      items.push({ kind: 'pay', at: p.receiptAt, pay: p });
    }
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [thread, props.payments, props.conversation.id]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [timeline.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && info) setInfo(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [info]);

  const send = () => {
    const text = body.trim();
    if (!text || pending) return;
    setBody('');
    start(async () => {
      addOptimistic(text);
      const res = await replyAction(props.conversation.id, text);
      if (res?.error) { setError(res.error); setBody(text); return; }
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden">
      {/* ── Suhbat ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-s1/80 px-3 backdrop-blur-xl">
          <Link
            href="/admin/inbox"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tx2 transition-all duration-150 hover:bg-s3 active:scale-90 md:hidden"
            aria-label={t('conv.back')}
          >
            <IconBack />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-[-0.01em]">
              {props.user.fullName ?? t('inbox.noName')}
            </p>
            <p className="truncate text-[11.5px] text-tx3">
              {props.user.phone ?? t('inbox.noPhone')}
              {props.user.username ? ` · @${props.user.username}` : ''}
            </p>
          </div>
          <StatusBadge status={props.conversation.status} />
          <button
            onClick={() => setInfo((v) => !v)}
            aria-label={t('conv.info')}
            aria-pressed={info}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-150 active:scale-90
              ${info ? 'bg-accent-bg text-accent-text' : 'text-tx2 hover:bg-s3'}`}
          >
            <IconInfo />
          </button>
        </header>

        <div ref={boxRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-6">
          {timeline.map((item) =>
            item.kind === 'msg' ? (
              <Bubble key={item.msg.id} msg={item.msg} t={t} />
            ) : (
              <ReceiptCard key={item.pay.id} pay={item.pay} t={t} />
            ),
          )}
        </div>

        <footer className="shrink-0 border-t border-line bg-s1/80 p-2.5 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              rows={1}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
              }}
              placeholder={t('conv.replyPlaceholder')}
              className="max-h-40 min-h-9 rounded-[18px] py-2"
            />
            <button
              onClick={send}
              disabled={!body.trim() || pending}
              aria-label={t('conv.send')}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-all duration-150 active:scale-90 disabled:opacity-30"
            >
              <IconSend />
            </button>
          </div>
          {error && <p className="mt-1.5 px-1 text-[12px] text-danger">{error}</p>}
          <div className="mt-1.5 flex items-center gap-3 px-1">
            <span className="hidden text-[11px] text-tx3 md:block">{t('conv.sendHint')}</span>
            <button
              onClick={() => start(async () => { await closeConversationAction(props.conversation.id); router.refresh(); })}
              disabled={pending}
              className="ml-auto text-[11px] text-tx3 transition-colors hover:text-danger disabled:opacity-40"
            >
              {t('conv.close')}
            </button>
          </div>
        </footer>
      </div>

      {/* ── Ish kartochkasi: tugma bilan ochiladi ── */}
      {info && (
        <aside className="animate-slide-in-right absolute inset-y-0 right-0 z-20 w-full max-w-[340px] overflow-y-auto border-l border-line bg-s1 md:relative md:inset-auto md:w-[320px] md:max-w-none">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-s1/90 px-3 backdrop-blur-xl">
            <h2 className="text-[13px] font-semibold">{t('conv.caseCard')}</h2>
            <button
              onClick={() => setInfo(false)}
              aria-label={t('pay.cancel')}
              className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-tx2 transition-all duration-150 hover:bg-s3 active:scale-90"
            >
              <IconClose />
            </button>
          </header>

          <div className="space-y-5 p-4">
            <Section title={t('conv.client')}>
              <Row label={t('conv.phone')} value={props.user.phone ?? '—'} />
              <Row label={t('conv.type')} value={clientTypeLabel(props.user.clientType)} />
              <Row label={t('conv.language')} value={props.user.locale} />
              <Row
                label={t('conv.freeQuestion')}
                value={props.user.freeUsed ? t('conv.used') : t('conv.available')}
              />
              <Row
                label="Voronka"
                value={FUNNEL_KEY[props.conversation.funnelStage] ?? props.conversation.funnelStage}
              />
            </Section>

            {props.card ? (
              <>
                {props.card.deadlines.length > 0 && (
                  <div className="rounded-[12px] bg-danger-bg p-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-danger">
                      {t('conv.deadlines')}
                    </p>
                    <ul className="space-y-2">
                      {props.card.deadlines.map((d, i) => (
                        <li key={i} className="text-[12px] leading-relaxed">
                          <b>{d.name}</b>{d.endsAt ? ` — ${d.endsAt}` : ''}
                          <br />
                          <span className="text-tx2">{d.note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Section title={t('conv.caseCard')}>
                  <p className="text-[13px] leading-relaxed">{props.card.summary}</p>
                  {props.card.legalArea && (
                    <p className="mt-2 text-[12px] text-tx2">
                      {t('conv.area')}: <span className="text-tx">{props.card.legalArea}</span>
                    </p>
                  )}
                </Section>

                {props.card.keyFacts.length > 0 && <ListSection title={t('conv.facts')} items={props.card.keyFacts} />}
                {props.card.risks.length > 0 && <ListSection title={t('conv.risks')} items={props.card.risks} />}
                {props.card.suggestedPosition && (
                  <Section title={t('conv.position')}>
                    <p className="text-[13px] leading-relaxed">{props.card.suggestedPosition}</p>
                  </Section>
                )}

                <p className="text-[10.5px] text-tx3">
                  {t('conv.aiPrepared')} · <TimeAgo date={props.card.updatedAt} /> · {t('conv.verifyFacts')}
                </p>
              </>
            ) : (
              <EmptyState>{t('conv.cardNotReady')}</EmptyState>
            )}

            {props.latestAi && props.latestAi.missingInfo.length > 0 && (
              <ListSection title={t('conv.missingInfo')} items={props.latestAi.missingInfo} />
            )}

            <Section title={t('conv.payments')}>
              {props.payments.length === 0 ? (
                <p className="text-[12.5px] text-tx3">{t('conv.noPayments')}</p>
              ) : (
                <ul className="space-y-2">
                  {props.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${
                        p.status === 'tolandi' ? 'bg-accent' : p.status === 'rad_etildi' ? 'bg-danger' : 'bg-warning'
                      }`} />
                      <span className="min-w-0 flex-1 truncate">{p.title}</span>
                      <Money minor={p.amountMinor} currency={p.currency} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </aside>
      )}
    </div>
  );
}

/* ── Suhbat pufakchasi ── */

function Bubble({ msg, t }: { msg: Msg; t: ReturnType<typeof useT> }) {
  if (msg.sender === 'system') {
    return (
      <p className="animate-fade-in py-1 text-center text-[11px] leading-relaxed text-tx3">
        {renderMarkers(msg.body)}
      </p>
    );
  }
  const mine = msg.sender === 'lawyer';
  const tone = mine
    ? 'bg-bubble-out text-on-bubble-out rounded-br-[6px]'
    : msg.sender === 'ai'
      ? 'bg-bubble-ai border border-line rounded-bl-[6px]'
      : 'bg-bubble-in rounded-bl-[6px]';

  return (
    <div className={`animate-slide-up flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[76%] rounded-[18px] px-3.5 py-2 ${tone}`}>
        {!mine && (
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-50">
            {t(`sender.${msg.sender}` as 'sender.user')}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13.5px] leading-[1.45]">{msg.body}</p>
        <p className="mt-0.5 text-right text-[10px] opacity-55">
          {msg.attachments > 0 && `📎 ${msg.attachments} · `}
          <TimeAgo date={msg.createdAt} />
        </p>
      </div>
    </div>
  );
}

/**
 * Chek kartochkasi — suhbat oqimining ichida.
 * Rasm, summa va tasdiqlash tugmalari shu yerda; advokat suhbatdan chiqmaydi.
 */
function ReceiptCard({ pay, t }: { pay: Payment; t: ReturnType<typeof useT> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const waiting = pay.status === 'chek_yuborildi';
  const tone = pay.status === 'tolandi' ? 'accent' : pay.status === 'rad_etildi' ? 'danger' : 'warning';

  const run = (fn: () => Promise<{ error?: string; ok?: boolean } | undefined>) =>
    start(async () => {
      const res = await fn();
      if (res?.error) return setError(res.error);
      setError(null);
      setRejecting(false);
      router.refresh();
    });

  return (
    <div className="animate-slide-up flex justify-center py-1">
      <div className="w-full max-w-[380px] overflow-hidden rounded-[16px] border border-line bg-s2">
        {pay.receiptFileId && (
          <a href={`/api/receipt/${pay.receiptFileId}`} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element -- chek Telegram proksisidan keladi */}
            <img
              src={`/api/receipt/${pay.receiptFileId}`}
              alt={t('pay.receiptTime')}
              className="max-h-64 w-full bg-s1 object-contain"
            />
          </a>
        )}

        <div className="space-y-2.5 p-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold">{pay.title}</span>
            <span className="text-[15px] font-bold tabular-nums">
              <Money minor={pay.amountMinor} currency={pay.currency} />
            </span>
            <Badge tone={tone} className="ml-auto">{pay.refCode}</Badge>
          </div>

          {waiting ? (
            rejecting ? (
              <div className="animate-slide-up space-y-2">
                <Input
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('pay.rejectReason')}
                  onKeyDown={(e) => e.key === 'Enter' && run(() => rejectPaymentAction(pay.id, reason))}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" loading={pending} onClick={() => run(() => rejectPaymentAction(pay.id, reason))}>
                    {t('pay.reject')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>{t('pay.cancel')}</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" loading={pending} onClick={() => run(() => confirmPaymentAction(pay.id))}>
                  {t('pay.confirm')}
                </Button>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => setRejecting(true)}>
                  {t('pay.reject')}
                </Button>
              </div>
            )
          ) : (
            <p className="text-[11.5px] text-tx3">
              {pay.status === 'tolandi' ? t('pay.statusPaid') : t('pay.statusRejected')}
              {pay.rejectionReason ? ` — ${pay.rejectionReason}` : ''}
            </p>
          )}

          {error && <p className="text-[11.5px] text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * Tizim xabarlari bot uchun `*qalin*` belgisi bilan saqlanadi (Telegram uslubi).
 * Panelda ham qalin ko'rsatamiz — xom yulduzchalar chiqib qolmasin.
 */
function renderMarkers(text: string) {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
      <b key={i} className="font-semibold text-tx2">{part.slice(1, -1)}</b>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-tx3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-line-soft py-1.5 text-[12.5px] last:border-0">
      <span className="w-24 shrink-0 text-tx2">{label}</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </Section>
  );
}
