import { getAdminLocale } from '@/core/locale';
import { adminT } from '@/i18n/admin';
import { NothingSelected } from '../shell';

export const dynamic = 'force-dynamic';

export default async function InboxIndexPage() {
  const locale = await getAdminLocale();
  return <NothingSelected text={adminT(locale, 'inbox.selectPrompt')} />;
}
