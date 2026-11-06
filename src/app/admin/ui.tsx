'use client';

import { Badge } from '@/components/surface';
import { useT, useLocale } from '@/components/i18n-provider';
import { formatMoney } from '@/core/money';
import type { AdminKey } from '@/i18n/admin';
import type { Locale } from '@/i18n';

const STATUS: Record<string, { key: AdminKey; tone: 'neutral' | 'accent' | 'warning' | 'danger' }> = {
  yangi: { key: 'status.new', tone: 'accent' },
  ai: { key: 'inbox.ai', tone: 'neutral' },
  tolov_kutilmoqda: { key: 'inbox.waitingPayment', tone: 'warning' },
  advokat_kutmoqda: { key: 'inbox.waitingLawyer', tone: 'danger' },
  advokat_faol: { key: 'sender.lawyer', tone: 'accent' },
  yopilgan: { key: 'inbox.closed', tone: 'neutral' },
};

export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const s = STATUS[status] ?? STATUS.ai;
  return <Badge tone={s.tone}>{t(s.key)}</Badge>;
}

export const FUNNEL_KEY: Record<string, string> = {
  yangi: 'Yangi',
  bepul_javob_berildi: 'Bepul javob',
  pullik_faol: 'Pullik savol',
  hujjat_taklif: 'Hujjat taklifi',
  ofis_taklif: 'Ofis taklifi',
  advokatga_topshirildi: 'Advokatga topshirildi',
  yopilgan: 'Yopilgan',
  yoqotilgan: "Yo'qotilgan",
};

const CLIENT_TYPE: Record<Locale, Record<string, string>> = {
  uz_latn: { jismoniy: 'Jismoniy shaxs', yuridik: 'Yuridik shaxs', chet_el: 'Chet eldan' },
  uz_cyrl: { jismoniy: 'Жисмоний шахс', yuridik: 'Юридик шахс', chet_el: 'Чет элдан' },
  ru: { jismoniy: 'Физлицо', yuridik: 'Юрлицо', chet_el: 'Из-за рубежа' },
  en: { jismoniy: 'Individual', yuridik: 'Company', chet_el: 'From abroad' },
};

export function useClientTypeLabel() {
  const locale = useLocale();
  return (type: string | null | undefined) => (type ? CLIENT_TYPE[locale][type] ?? type : '—');
}

const INTL: Record<Locale, string> = { uz_latn: 'uz', uz_cyrl: 'uz-Cyrl', ru: 'ru', en: 'en' };

/**
 * Nisbiy vaqt.
 *
 * Intl.RelativeTimeFormat ishlatilmaydi: o'zbek tili uchun CLDR ma'lumoti
 * to'liq emas va "-3 h" kabi natija qaytaradi. O'z satrlarimiz 4 tilda ham
 * bir xil va bashorat qilinadigan chiqadi.
 */
export function useTimeAgo() {
  const t = useT();
  const locale = useLocale();
  return (date: Date | string | null | undefined): string => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    const secs = Math.round((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return t('time.now');
    if (secs < 3600) return t('time.min', { n: Math.round(secs / 60) });
    if (secs < 86400) return t('time.hour', { n: Math.round(secs / 3600) });
    if (secs < 604800) return t('time.day', { n: Math.round(secs / 86400) });
    return d.toLocaleDateString(INTL[locale], { day: 'numeric', month: 'short' });
  };
}

/**
 * Nisbiy vaqt komponenti.
 *
 * Nega alohida: serverda "58 daq oldin", brauzerda "59 daq oldin" chiqishi
 * mumkin va React buni hidratatsiya xatosi deb hisoblaydi.
 */
export function TimeAgo({ date, className = '' }: { date: Date | string | null | undefined; className?: string }) {
  const format = useTimeAgo();
  if (!date) return <span className={className}>—</span>;
  const iso = typeof date === 'string' ? date : date.toISOString();
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {format(date)}
    </time>
  );
}

export function Money({ minor, currency }: { minor: number; currency: string }) {
  const locale = useLocale();
  return <span className="tabular-nums">{formatMoney(minor, currency, locale)}</span>;
}
