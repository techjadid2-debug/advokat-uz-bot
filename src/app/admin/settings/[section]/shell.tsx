'use client';

import Link from 'next/link';
import { useT } from '@/components/i18n-provider';
import { IconBack } from '@/components/icons';
import type { BotSettings } from '@/core/bot-settings';
import type { Locale } from '@/i18n';
import type { AdminKey } from '@/i18n/admin';
import { PricesTab } from '../tab-prices';
import { CardsTab } from '../tab-cards';
import { BotTextsTab } from '../tab-texts';
import { AiTab } from '../tab-ai';
import { LimitsTab } from '../tab-limits';
import { HoursTab } from '../tab-hours';
import { StaffTab, type StaffRow } from '../tab-staff';
import { BlockedTab, type BlockedRow } from '../tab-blocked';
import type { ServiceRow, CardRow, HistoryRow } from '../types';
import type { TextRow } from '../tab-texts';

const TITLE: Record<string, AdminKey> = {
  prices: 'set.prices', cards: 'set.cards', texts: 'set.botTexts',
  ai: 'set.ai', limits: 'set.limits', hours: 'set.hours',
  staff: 'set.staff', blocked: 'set.blocked',
};

export function SectionShell(props: {
  section: string;
  services?: ServiceRow[];
  history?: HistoryRow[];
  cards?: CardRow[];
  bot?: BotSettings;
  locale?: Locale;
  texts?: TextRow[];
  staff?: StaffRow[];
  canManage?: boolean;
  blocked?: BlockedRow[];
}) {
  const t = useT();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-s1/80 px-3 backdrop-blur-xl">
        <Link
          href="/admin/settings"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tx2 transition-all duration-150 hover:bg-s3 active:scale-90 md:hidden"
          aria-label={t('nav.settings')}
        >
          <IconBack />
        </Link>
        <h1 className="text-[14px] font-semibold tracking-[-0.01em]">{t(TITLE[props.section])}</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {props.section === 'prices' && <PricesTab services={props.services!} history={props.history!} />}
          {props.section === 'cards' && <CardsTab cards={props.cards!} />}
          {props.section === 'texts' && <BotTextsTab rows={props.texts!} />}
          {props.section === 'ai' && <AiTab bot={props.bot!} />}
          {props.section === 'limits' && <LimitsTab bot={props.bot!} locale={props.locale!} />}
          {props.section === 'hours' && <HoursTab bot={props.bot!} locale={props.locale!} />}
          {props.section === 'staff' && <StaffTab staff={props.staff!} canManage={props.canManage!} />}
          {props.section === 'blocked' && <BlockedTab rows={props.blocked!} />}
        </div>
      </div>
    </div>
  );
}
