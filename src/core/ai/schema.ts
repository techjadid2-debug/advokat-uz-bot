import { z } from 'zod';

/**
 * Gemini har javobda MATN bilan birga shu tasnifni qaytaradi.
 *
 * Muhim: tugmalarni va NARXLARNI model yozmaydi. U faqat `recommendedNext`
 * qaytaradi — tugma va summa bazadagi `services` jadvalidan chiziladi.
 * Aks holda model narxni o'ylab topadi va mijozga noto'g'ri summa aytadi.
 */
export const aiAnswerSchema = z.object({
  answer: z
    .string()
    .describe(
      'Mijozga ko\'rinadigan to\'liq javob (Markdown). Hech qachon yarim uzilmaydi, ' +
      'hech qachon summa yoki narx yozilmaydi.',
    ),

  legalArea: z
    .enum([
      'mehnat', 'oila', 'jinoyat', 'fuqarolik', 'mamuriy',
      'tadbirkorlik', 'migratsiya', 'uy_joy', 'meros', 'soliq', 'boshqa',
    ])
    .describe('Savol qaysi huquq sohasiga tegishli.'),

  clientTypeGuess: z
    .enum(['jismoniy', 'yuridik', 'chet_el'])
    .describe('Mijoz jismoniy shaxsmi, yuridik shaxsmi yoki chet eldanmi.'),

  urgency: z
    .enum(['past', 'orta', 'yuqori'])
    .describe('Ish qanchalik shoshilinch. Muddat o\'tib ketayotgan bo\'lsa — yuqori.'),

  confidence: z
    .enum(['past', 'orta', 'yuqori'])
    .describe('Berilgan ma\'lumot asosida javobga ishonch darajasi.'),

  deadline: z
    .object({
      name: z.string().describe('Muddatning nomi, masalan "sudga murojaat muddati".'),
      endsAt: z.string().nullable().describe('ISO sana, agar aniq hisoblash mumkin bo\'lsa. Aks holda null.'),
      note: z.string().describe('Muddat nimadan boshlab hisoblanishi haqida qisqa izoh.'),
    })
    .nullable()
    .describe('Ishda huquqiy muddat bo\'lsa. Bo\'lmasa — null.'),

  missingInfo: z
    .array(z.string())
    .max(4)
    .describe(
      'VORONKANING KALITI. Aniq javob berish uchun yetishmayotgan 2-4 ta ANIQ ma\'lumot. ' +
      'Mavhum emas, konkret savol shaklida. Masalan: "buyruqda bo\'shatish asosi sifatida ' +
      'qaysi modda ko\'rsatilgan". Mijozda shu ro\'yxatdan keyin aniq savol paydo bo\'lishi kerak.',
    ),

  needsDocuments: z
    .boolean()
    .describe('Aniq pozitsiya uchun hujjatlarni ko\'rish zarurmi.'),

  recommendedNext: z
    .enum([
      'paid_question', 'document_review', 'office_visit',
      'lawyer_handoff', 'phone_call', 'none',
    ])
    .describe(
      'Mijoz uchun eng foydali keyingi qadam. Bot shu asosda tugma chizadi. ' +
      'Sun\'iy ravishda qimmatrog\'ini tanlamang — mijozga chindan mos keladiganini tanlang.',
    ),

  outOfScope: z
    .boolean()
    .describe(
      'Savol huquqiy emasmi ("salom", "narxlar qancha", "sen kimsan", bo\'sh gap). ' +
      'true bo\'lsa mijozning bepul savoli SARFLANMAYDI.',
    ),
});

export type AiAnswer = z.infer<typeof aiAnswerSchema>;
