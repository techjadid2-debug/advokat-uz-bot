import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { cached, invalidate } from './cache';

/**
 * lex.uz manbalari.
 *
 * Korpus serverga yuklanmaydi — faqat havolalar saqlanadi. Gemini
 * `url_context` orqali kerakli kodeksni o'zi ochib o'qiydi.
 *
 * Qaysi kodeksni ochish kerakligi LOKAL kalit so'zlar bilan aniqlanadi,
 * qo'shimcha AI chaqiruvisiz: bepul tarifda kunlik so'rov chegarasi 20 ta,
 * har savolga ikkinchi chaqiruv qo'shish uni ikki barobar tez tugatadi.
 */
export const LEGAL_SOURCES_KEY = 'legal.sources';

export type LegalSource = {
  id: string;
  title: string;
  url: string;
  /** Kichik harflarda. Uzunroq mos kelgan so'z ko'proq ball beradi. */
  keywords: string[];
  isActive: boolean;
};

/** Har bir havola 2026-08-23 da ochib tekshirilgan. */
export const DEFAULT_LEGAL_SOURCES: LegalSource[] = [
  {
    id: 'mehnat',
    title: 'Mehnat kodeksi',
    url: 'https://lex.uz/uz/docs/-6257288',
    isActive: true,
    keywords: [
      'mehnat shartnoma', 'ishdan boshat', "ishdan bo'shat", 'ishga tikla', 'ish beruvchi',
      'mehnat daftarcha', 'ish haqi', 'maosh', 'oylik', "ta'til", 'tatil', 'xodim',
      'ish vaqti', 'mehnat nizo', 'sinov muddati', 'shtat qisqar',
      'трудов', 'увольн', 'зарплат', 'отпуск', 'работодател',
      'меҳнат', 'ишдан бўшат', 'иш ҳақи',
    ],
  },
  {
    id: 'oila',
    title: 'Oila kodeksi',
    url: 'https://lex.uz/uz/docs/-104720',
    isActive: true,
    keywords: [
      'aliment', 'ajrash', 'ajralish', 'nikoh', 'nikohdan', 'farzand', 'bola bilan',
      'otalik', 'onalik', 'vasiylik', 'oila', 'er-xotin', 'turmush o‘rtoq',
      'алимент', 'развод', 'брак', 'отцовств', 'опек',
      'алимент', 'ажраш', 'никоҳ', 'фарзанд',
    ],
  },
  {
    id: 'jinoyat',
    title: 'Jinoyat kodeksi',
    url: 'https://lex.uz/uz/docs/-111453',
    isActive: true,
    keywords: [
      'jinoyat', 'jinoiy', 'ayblov', 'tergov', 'qamoq', 'hibsga ol', 'sud hukmi',
      "o'g'irlik", 'ogirlik qil', 'firibgarlik', 'talonchilik', 'bezorilik',
      'giyohvand', 'tan jarohat', 'qotillik',
      'уголов', 'обвин', 'следств', 'кража', 'мошенн', 'наркот',
      'жиноят', 'айблов', 'терговчи',
    ],
  },
  {
    id: 'mamuriy',
    title: "Ma'muriy javobgarlik to'g'risidagi kodeks",
    url: 'https://lex.uz/uz/docs/-97664',
    isActive: true,
    keywords: [
      "ma'muriy javobgarlik", 'mamuriy javobgarlik', "ma'muriy jarima", 'jarima',
      'protokol tuz', "ma'muriy huquqbuzarlik", 'yo‘l harakati qoida',
      'админист', 'штраф', 'протокол',
      'маъмурий', 'жарима',
    ],
  },
  {
    id: 'fuqarolik',
    title: 'Fuqarolik kodeksi',
    url: 'https://lex.uz/uz/docs/-111189',
    isActive: true,
    keywords: [
      'shartnoma tuz', 'shartnoma buz', 'zarar undir', 'meros', 'mulk huquq',
      'qarz', 'ijara', 'oldi-sotdi', 'garov', 'neustoyka', 'jarima puli',
      'yetkazib beruvchi', 'tovar',
      'договор', 'ущерб', 'наслед', 'долг', 'аренд', 'собственност',
      'мерос', 'шартнома', 'қарз',
    ],
  },
  {
    id: 'fuqarolik_protsessual',
    title: 'Fuqarolik protsessual kodeksi',
    url: 'https://lex.uz/uz/docs/-3517337',
    isActive: true,
    keywords: [
      "da'vo arizasi", 'davo arizasi', 'sudga murojaat', 'apellyatsiya', 'kassatsiya',
      'sud xarajat', 'ijro varaqa', 'sud qarori ijro',
      'исков', 'апелляц', 'кассац', 'судебн',
      'даъво', 'апелляция',
    ],
  },
];

export async function getLegalSources(): Promise<LegalSource[]> {
  return cached(`setting:${LEGAL_SOURCES_KEY}`, async () => {
    const [row] = await db.select().from(settings).where(eq(settings.key, LEGAL_SOURCES_KEY)).limit(1);
    const stored = row?.value as LegalSource[] | undefined;
    return stored?.length ? stored : DEFAULT_LEGAL_SOURCES;
  });
}

export async function saveLegalSources(list: LegalSource[], updatedBy?: string) {
  await db
    .insert(settings)
    .values({ key: LEGAL_SOURCES_KEY, value: list, updatedBy: updatedBy ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: list, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    });
  invalidate(`setting:${LEGAL_SOURCES_KEY}`);
  return list;
}

/**
 * Savolga mos manbani tanlaydi.
 *
 * Ball = mos kelgan kalit so'zlar uzunliklari yig'indisi. Uzunroq ibora
 * ustun: "mehnat shartnoma" "shartnoma" dan kuchliroq, aks holda mehnat
 * savoli Fuqarolik kodeksiga tushib ketardi.
 */
export function matchSource(question: string, sources: LegalSource[]): LegalSource | null {
  const text = question.toLowerCase();
  let best: { source: LegalSource; score: number } | null = null;

  for (const source of sources) {
    if (!source.isActive) continue;
    let score = 0;
    for (const kw of source.keywords) {
      if (kw && text.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { source, score };
  }
  return best?.source ?? null;
}
