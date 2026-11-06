import type { AiAnswer } from './ai/schema';
import type { User } from './users';
import { SERVICE, getService, lawyerServiceFor, type ServiceCode } from './pricing';
import { formatMoney } from './money';
import type { Locale, MessageKey } from '@/i18n';

/**
 * AI faqat `recommendedNext` qaytaradi — tugma matni va NARX shu yerda,
 * bazadagi qiymatlardan chiziladi. Model hech qachon summa yozmaydi.
 */
export type Cta = {
  serviceCode: ServiceCode;
  labelKey: MessageKey;
  /** Formatlangan narx yoki null (masalan ofis uchrashuvi — joyida kelishiladi). */
  price: string | null;
  callbackData: string;
};

const LABELS: Record<string, MessageKey> = {
  [SERVICE.QUESTION_PAID]: 'cta.paid_question',
  [SERVICE.DOCUMENT_PREPARE]: 'cta.prepare_document',
  [SERVICE.DOC_REVIEW_SMALL]: 'cta.document_review',
  [SERVICE.DOC_REVIEW_LARGE]: 'cta.document_review',
  [SERVICE.OFFICE_VISIT]: 'cta.office_visit',
  [SERVICE.PHONE_CONSULT]: 'cta.phone_call',
  [SERVICE.LAWYER_INDIVIDUAL]: 'cta.lawyer_handoff',
  [SERVICE.LAWYER_COMPANY]: 'cta.lawyer_handoff',
  [SERVICE.LAWYER_FOREIGN]: 'cta.lawyer_handoff',
};

async function toCta(code: ServiceCode, locale: Locale): Promise<Cta | null> {
  const svc = await getService(code);
  if (!svc || !svc.isActive) return null;
  return {
    serviceCode: code,
    labelKey: LABELS[code] ?? 'cta.paid_question',
    price: svc.amountMinor > 0 ? formatMoney(svc.amountMinor, svc.currency, locale) : null,
    callbackData: `buy:${code}`,
  };
}

/** AI tavsiyasini xizmat kodiga o'giradi. */
function mapRecommendation(answer: AiAnswer, user: User): ServiceCode {
  switch (answer.recommendedNext) {
    case 'document_review':
      return SERVICE.DOC_REVIEW_SMALL;
    case 'office_visit':
      return SERVICE.OFFICE_VISIT;
    case 'phone_call':
      return SERVICE.PHONE_CONSULT;
    case 'lawyer_handoff':
      return lawyerServiceFor(answer.clientTypeGuess ?? user.clientType);
    case 'paid_question':
    default:
      return SERVICE.QUESTION_PAID;
  }
}

/**
 * Javob ostidagi tugmalar. Ko'pi bilan 3 ta — tanlov ko'payganda
 * mijoz hech birini bosmaydi.
 */
export async function buildCtas(args: {
  answer: AiAnswer;
  user: User;
  locale: Locale;
  mode: 'free' | 'paid';
}): Promise<Cta[]> {
  const codes: ServiceCode[] = [];

  if (args.mode === 'free') {
    const lawyer = lawyerServiceFor(args.answer.clientTypeGuess ?? args.user.clientType);

    /**
     * Bu advokatning boti — advokatga yo'l HAR DOIM ochiq turishi kerak.
     * Ilgari bepul javobdan keyin faqat "keyingi savol" tugmasi chiqardi va
     * jiddiy ish bilan kelgan mijozning oldida advokatga o'tish yo'li yo'q edi.
     */
    const urgent =
      args.answer.urgency === 'yuqori' || args.answer.recommendedNext === 'lawyer_handoff';

    if (urgent) {
      // Shoshilinch ishda advokat birinchi o'rinda
      codes.push(lawyer, SERVICE.QUESTION_PAID);
    } else {
      codes.push(SERVICE.QUESTION_PAID, lawyer);
    }

    if (args.answer.needsDocuments) codes.push(SERVICE.DOC_REVIEW_SMALL);
  } else {
    // Pullik javobdan keyin — AI tavsiyasi birinchi o'rinda.
    codes.push(mapRecommendation(args.answer, args.user));
    if (args.answer.needsDocuments && !codes.includes(SERVICE.DOC_REVIEW_SMALL)) {
      codes.push(SERVICE.DOC_REVIEW_SMALL);
    }
    codes.push(SERVICE.DOCUMENT_PREPARE);
    codes.push(lawyerServiceFor(args.answer.clientTypeGuess ?? args.user.clientType));
  }

  const unique = [...new Set(codes)].slice(0, 3);
  const ctas = await Promise.all(unique.map((c) => toCta(c, args.locale)));
  return ctas.filter((c): c is Cta => c !== null);
}
