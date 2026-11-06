import { notFound } from 'next/navigation';
import { paymentDetail } from '@/core/admin-queries';
import { getAdminLocale } from '@/core/locale';
import { pick } from '@/i18n';
import { PaymentDetail } from './detail';

export const dynamic = 'force-dynamic';

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await paymentDetail(id);
  if (!row) notFound();
  const locale = await getAdminLocale();

  return (
    <PaymentDetail
      order={{
        id: row.order.id,
        title: row.service ? pick(row.service.title, locale) : row.order.serviceCode,
        amountMinor: row.order.amountMinor,
        currency: row.order.currency,
        refCode: row.order.refCode,
        status: row.order.status,
        cardNumber: row.order.cardNumber,
        receiptFileId: row.order.receiptFileId,
        receiptAt: row.order.receiptAt?.toISOString() ?? null,
        confirmedAt: row.order.confirmedAt?.toISOString() ?? null,
        rejectionReason: row.order.rejectionReason,
        conversationId: row.order.conversationId,
      }}
      user={{
        fullName: row.user.fullName,
        phone: row.user.phone,
        username: row.user.username,
      }}
    />
  );
}
