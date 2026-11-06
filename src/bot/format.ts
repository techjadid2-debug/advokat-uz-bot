/**
 * Markdown → Telegram HTML.
 *
 * Nega HTML: Telegram'ning Markdown rejimi muvozanatsiz `*` yoki `_` uchrasa
 * butun xabarni rad etadi. AI matnida bunday belgilar tabiiy ravishda uchraydi,
 * shuning uchun avval hamma narsa ekranlanadi, keyin faqat bizga kerakli
 * teglar qo'yiladi. Natijada xabar hech qachon yuborilmay qolmaydi.
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toTelegramHtml(markdown: string): string {
  let s = escapeHtml(markdown);

  // `kod`
  s = s.replace(/`([^`\n]+)`/g, (_m, code) => `<code>${code}</code>`);
  // **qalin** va *qalin*
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, '$1<b>$2</b>');
  // _kursiv_
  s = s.replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, '$1<i>$2</i>');
  // [matn](havola)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  // Markdown sarlavhalari — Telegram'da qalin matn
  s = s.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');

  return s.trim();
}

/** Telegram bitta xabarda 4096 belgidan ko'pini qabul qilmaydi. */
export function splitMessage(text: string, limit = 3900): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    // Xatboshi chegarasida bo'lish — teglar o'rtasidan kesilmasligi uchun
    let cut = rest.lastIndexOf('\n\n', limit);
    if (cut < limit * 0.5) cut = rest.lastIndexOf('\n', limit);
    if (cut < limit * 0.5) cut = limit;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
