import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Sozlamalar ochilganda darhol birinchi bo'lim ko'rsatiladi. */
export default function SettingsIndexPage() {
  redirect('/admin/settings/prices');
}
