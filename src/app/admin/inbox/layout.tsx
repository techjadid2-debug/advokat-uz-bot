import { inbox } from '@/core/admin-queries';
import { InboxPane } from './pane';

export const dynamic = 'force-dynamic';

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const rows = await inbox();
  return (
    <InboxPane
      rows={rows.map((r) => ({
        id: r.id,
        status: r.status,
        userName: r.userName,
        userPhone: r.userPhone,
        clientType: r.clientType,
        legalArea: r.legalArea,
        summary: r.summary,
        lastBody: r.lastBody,
        lastMessageAt: r.lastMessageAt.toISOString(),
        unpaidReceipts: r.unpaidReceipts,
      }))}
    >
      {children}
    </InboxPane>
  );
}
