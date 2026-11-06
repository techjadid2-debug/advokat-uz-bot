/**
 * Lokal test uchun long-polling rejimi — ochiq domen va SSL shart emas.
 *
 *   pnpm bot:poll
 *
 * Diqqat: polling va webhook bir vaqtda ishlamaydi. Bu skript ishga tushganda
 * webhook o'chiriladi; serverga qaytishda `pnpm webhook:set` ni qayta bajaring.
 */
import { bot } from '../src/bot';

async function main() {
  const b = bot();
  await b.api.deleteWebhook({ drop_pending_updates: false });
  const me = await b.api.getMe();
  console.log(`Bot ishga tushdi: @${me.username} (polling rejimi)`);
  console.log('To\'xtatish: Ctrl+C\n');
  await b.start({ allowed_updates: ['message', 'callback_query'] });
}

main().catch((e) => { console.error(e); process.exit(1); });
