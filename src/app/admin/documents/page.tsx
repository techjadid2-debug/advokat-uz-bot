import { getAdminLocale } from '@/core/locale';
import { adminT } from '@/i18n/admin';
import { IconDoc } from '@/components/icons';

export const dynamic = 'force-dynamic';

/**
 * Hujjatlar bo'limi — Faza 3'da to'ladi (AI qoralama → advokat tasdig'i → PDF/DOCX).
 * Joyi hozirdan ajratilgan: keyin qo'shilganda tuzilma o'zgartirilmaydi.
 */
export default async function DocumentsPage() {
  const locale = await getAdminLocale();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center border-b border-line bg-s1/80 px-4 backdrop-blur-xl">
        <h1 className="text-[15px] font-semibold tracking-[-0.01em]">{adminT(locale, 'docs.title')}</h1>
      </header>
      <div className="grid flex-1 place-items-center px-6">
        <div className="max-w-xs text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-s3 text-tx3">
            <IconDoc size={24} />
          </div>
          <p className="text-[13px] leading-relaxed text-tx3">{adminT(locale, 'docs.empty')}</p>
        </div>
      </div>
    </div>
  );
}
