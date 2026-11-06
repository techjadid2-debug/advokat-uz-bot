import { notFound } from 'next/navigation';
import { conversationDetail } from '@/core/admin-queries';
import { pick } from '@/i18n';
import { getAdminLocale } from '@/core/locale';
import { ConversationView } from './view';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await conversationDetail(id);
  if (!data) notFound();
  const locale = await getAdminLocale();

  return (
    <ConversationView
      conversation={{
        id: data.conversation.id,
        status: data.conversation.status,
        funnelStage: data.conversation.funnelStage,
      }}
      user={{
        fullName: data.user.fullName,
        phone: data.user.phone,
        username: data.user.username,
        locale: data.user.locale,
        clientType: data.user.clientType,
        freeUsed: data.user.freeQuestionsUsed > 0,
      }}
      card={data.card}
      thread={data.thread.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        attachments: m.attachments.length,
        createdAt: m.createdAt.toISOString(),
      }))}
      latestAi={data.latestAi}
      payments={data.payments.map(({ order, service }) => ({
        id: order.id,
        title: service ? pick(service.title, locale) : order.serviceCode,
        status: order.status,
        refCode: order.refCode,
        amountMinor: order.amountMinor,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
        // Chekni suhbat oqimida ko'rsatish uchun
        conversationId: order.conversationId,
        receiptFileId: order.receiptFileId,
        receiptAt: order.receiptAt?.toISOString() ?? null,
        rejectionReason: order.rejectionReason,
      }))}
    />
  );
}
