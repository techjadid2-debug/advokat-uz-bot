import { currentAdmin } from '@/core/auth';
import { bot } from '@/bot';

export const dynamic = 'force-dynamic';

/**
 * Chek rasmini ko'rsatish uchun proksi.
 *
 * To'g'ridan-to'g'ri Telegram havolasi berilmaydi: uning ichida bot tokeni bor,
 * ya'ni havolani ko'rgan har kim botni to'liq boshqara oladi.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  if (!(await currentAdmin())) return new Response('Ruxsat yo\'q', { status: 401 });

  const { fileId } = await params;
  try {
    const file = await bot().api.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const upstream = await fetch(url);
    if (!upstream.ok) return new Response('Topilmadi', { status: 404 });
    return new Response(upstream.body, {
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'cache-control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[receipt] olib bo\'lmadi:', e);
    return new Response('Xato', { status: 500 });
  }
}
