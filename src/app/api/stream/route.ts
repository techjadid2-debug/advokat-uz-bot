import { currentAdmin } from '@/core/auth';
import { CHANNEL, createListener } from '@/core/events';

export const dynamic = 'force-dynamic';
/**
 * Vercel funksiyasi cheksiz ishlamaydi — muddat tugaganda oqim uziladi va
 * brauzerdagi EventSource o'zi qayta ulanadi. O'z serverimizda bu chegara yo'q.
 */
export const maxDuration = 300;

/**
 * Server-Sent Events — panel jonli yangilanadi.
 *
 * SSE tanlandi, WebSocket emas: bizga faqat serverdan klientga bir tomonlama
 * oqim kerak, va SSE uzilganda brauzerning o'zi qayta ulanadi.
 */
export async function GET(req: Request): Promise<Response> {
  if (!(await currentAdmin())) return new Response('Ruxsat yo\'q', { status: 401 });

  const encoder = new TextEncoder();
  const listener = createListener();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      send(': ulandi\n\n');

      const unlisten = await listener.listen(CHANNEL, (payload) => {
        send(`data: ${payload}\n\n`);
      });

      // Proksi (nginx) jim turgan ulanishni uzib yubormasligi uchun
      const ping = setInterval(() => send(': ping\n\n'), 25_000);

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        try { await unlisten.unlisten(); } catch { /* ulanish allaqachon yopilgan */ }
        try { await listener.end({ timeout: 1 }); } catch { /* e'tiborsiz */ }
        try { controller.close(); } catch { /* allaqachon yopiq */ }
      };

      req.signal.addEventListener('abort', () => void cleanup());
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
