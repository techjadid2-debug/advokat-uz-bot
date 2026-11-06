/**
 * Telegram webhook manzilini o'rnatadi.
 *   pnpm webhook:set     — o'rnatish
 *   pnpm webhook:info    — hozirgi holatni ko'rish
 *   pnpm webhook:delete  — o'chirish (polling bilan lokal test uchun)
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.env.PUBLIC_URL;
const mode = process.argv[2] ?? 'set';

if (!token) throw new Error('TELEGRAM_BOT_TOKEN yo\'q');

const api = (method: string, body?: unknown) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.json());

const main = async () => {
  if (mode === 'info') return console.log(await api('getWebhookInfo'));
  if (mode === 'delete') return console.log(await api('deleteWebhook', { drop_pending_updates: false }));
  if (!base) throw new Error('PUBLIC_URL yo\'q');
  if (!secret) throw new Error('TELEGRAM_WEBHOOK_SECRET yo\'q');
  const url = `${base.replace(/\/$/, '')}/api/telegram/webhook`;
  console.log(await api('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  }));
  console.log('Webhook:', url);
};

main().catch((e) => { console.error(e); process.exit(1); });
