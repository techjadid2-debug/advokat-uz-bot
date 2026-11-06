/**
 * O'zbek lotin → kirill deterministik transliteratsiya.
 *
 * Nega kerak: Gemini javobni faqat lotinda yozadi, kirill versiyasi shu yerda
 * hosil qilinadi. Bu AI xarajatini ikki barobar kamaytiradi va ikki versiya
 * bir-biridan farq qilib qolishining oldini oladi.
 */

/** Tutuq belgisi sifatida ishlatiladigan barcha apostrof variantlari. */
const APOS = "'‘’ʻʼ`´";
const A = `[${APOS}]`;

type Rule = [RegExp, string];

/** Tartib muhim: uzun birikmalar avval. */
const RULES: Rule[] = [
  // o' va g' — barcha apostrof ko'rinishlarida
  [new RegExp(`O${A}`, 'g'), 'Ў'], [new RegExp(`o${A}`, 'g'), 'ў'],
  [new RegExp(`G${A}`, 'g'), 'Ғ'], [new RegExp(`g${A}`, 'g'), 'ғ'],
  // maxsus lotin harflari
  [/Ō|Õ/g, 'Ў'], [/ō|õ/g, 'ў'], [/Ḡ/g, 'Ғ'], [/ḡ/g, 'ғ'],
  // digraflar
  [/Ch/g, 'Ч'], [/CH/g, 'Ч'], [/ch/g, 'ч'],
  [/Sh/g, 'Ш'], [/SH/g, 'Ш'], [/sh/g, 'ш'],
  [/Ts/g, 'Ц'], [/TS/g, 'Ц'], [/ts/g, 'ц'],
  [/Yo/g, 'Ё'], [/YO/g, 'Ё'], [/yo/g, 'ё'],
  [/Yu/g, 'Ю'], [/YU/g, 'Ю'], [/yu/g, 'ю'],
  [/Ya/g, 'Я'], [/YA/g, 'Я'], [/ya/g, 'я'],
  [/Ye/g, 'Е'], [/YE/g, 'Е'], [/ye/g, 'е'],
  // yakka harflar
  [/A/g, 'А'], [/a/g, 'а'], [/B/g, 'Б'], [/b/g, 'б'],
  [/D/g, 'Д'], [/d/g, 'д'], [/F/g, 'Ф'], [/f/g, 'ф'],
  [/G/g, 'Г'], [/g/g, 'г'], [/H/g, 'Ҳ'], [/h/g, 'ҳ'],
  [/I/g, 'И'], [/i/g, 'и'], [/J/g, 'Ж'], [/j/g, 'ж'],
  [/K/g, 'К'], [/k/g, 'к'], [/L/g, 'Л'], [/l/g, 'л'],
  [/M/g, 'М'], [/m/g, 'м'], [/N/g, 'Н'], [/n/g, 'н'],
  [/O/g, 'О'], [/o/g, 'о'], [/P/g, 'П'], [/p/g, 'п'],
  [/Q/g, 'Қ'], [/q/g, 'қ'], [/R/g, 'Р'], [/r/g, 'р'],
  [/S/g, 'С'], [/s/g, 'с'], [/T/g, 'Т'], [/t/g, 'т'],
  [/U/g, 'У'], [/u/g, 'у'], [/V/g, 'В'], [/v/g, 'в'],
  [/X/g, 'Х'], [/x/g, 'х'], [/Y/g, 'Й'], [/y/g, 'й'],
  [/Z/g, 'З'], [/z/g, 'з'],
  [/C/g, 'К'], [/c/g, 'к'], [/W/g, 'В'], [/w/g, 'в'],
];

/** So'z boshidagi "e" kirillda "э" bo'ladi, o'rtasida "е". */
const E_INITIAL = /(^|[^\p{L}\p{N}])E/gu;
const e_initial = /(^|[^\p{L}\p{N}])e/gu;

/** Markdown bo'laklari (`kod`, [matn](url)) transliteratsiyaga tushmasligi kerak. */
const PROTECTED = /(`[^`]*`|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+|\d[\d\s.,]*)/g;

function convertChunk(input: string): string {
  let s = input
    .replace(E_INITIAL, (_m, p) => `${p}Э`)
    .replace(e_initial, (_m, p) => `${p}э`)
    .replace(/E/g, 'Е')
    .replace(/e/g, 'е');
  for (const [re, to] of RULES) s = s.replace(re, to);
  // Qolgan apostrof — tutuq belgisi
  s = s.replace(new RegExp(A, 'g'), 'ъ');
  return s;
}

export function latnToCyrl(text: string): string {
  const parts = text.split(PROTECTED);
  return parts
    .map((part, i) => (i % 2 === 1 ? part : convertChunk(part)))
    .join('');
}
