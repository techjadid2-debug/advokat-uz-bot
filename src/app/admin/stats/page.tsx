import { stats } from '@/core/admin-queries';
import { listServices } from '@/core/pricing';
import { getAdminLocale } from '@/core/locale';
import { pick } from '@/i18n';
import { StatsView } from './view';

export const dynamic = 'force-dynamic';

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: raw } = await searchParams;
  const days = [7, 30, 90].includes(Number(raw)) ? Number(raw) : 30;
  const [data, services, locale] = await Promise.all([stats(days), listServices(), getAdminLocale()]);

  const titleFor = (code: string) => {
    const svc = services.find((s) => s.code === code);
    return svc ? pick(svc.title, locale) : code;
  };

  return (
    <StatsView
      days={days}
      totals={data.totals}
      stages={data.stages.map((s) => ({ stage: String(s.stage), n: s.n }))}
      revenue={data.revenueRows.map((r) => ({
        title: titleFor(r.serviceCode),
        currency: r.currency,
        n: r.n,
        total: Number(r.total),
      }))}
      ai={{
        calls: data.ai.calls,
        costMicroUsd: Number(data.ai.costMicroUsd),
        avgLatency: data.ai.avgLatency,
        failures: data.ai.failures,
      }}
      areas={data.areas.map((a) => ({ area: a.area, n: a.n }))}
    />
  );
}
