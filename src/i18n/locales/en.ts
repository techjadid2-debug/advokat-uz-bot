import type { uz_latn } from './uz_latn';

export const en: Record<keyof typeof uz_latn, string> = {
  'lang.choose': 'Tilni tanlang / Тилни танланг / Выберите язык / Choose language',
  'lang.changed': 'Language changed.',
  'lang.uz_latn': "O'zbekcha (lotin)",
  'lang.uz_cyrl': 'Ўзбекча (кирилл)',
  'lang.ru': 'Русский',
  'lang.en': 'English',

  'start.welcome':
    'Hello, {name}!\n\n' +
    'This is the official assistant of attorney {lawyer}.\n\n' +
    'Write your legal question here — *the first question is answered free of charge*. ' +
    'If needed, I will then pass your case to the attorney directly.',
  'start.askNow': 'Write your question as text 👇',

  'menu.ask': '💬 Ask a question',
  'menu.services': '📋 Services and prices',
  'menu.balance': '🎫 My balance',
  'menu.lawyer': '⚖️ Contact the attorney',
  'menu.language': '🌐 Language',
  'menu.help': 'ℹ️ Help',

  'ask.thinking': 'Reviewing your question…',
  'ask.tooShort':
    'Please describe your situation in more detail — a useful answer is impossible without the facts.',
  'ask.freeUsed':
    'Your *free question* has already been used.\n\nTo get an answer to your next question, tap the button below.',
  'ask.noBalance': 'You have no available questions on your balance.\n\nChoose one of the options:',
  'ask.usedFree': '_That was your free question. Further questions are paid._',
  'ask.paidLeft': '_You have {n} question(s) left on your balance._',

  'disclaimer':
    '_This answer is for information only and does not constitute legal advice. ' +
    'A definitive legal position is given after the documents have been reviewed._',

  'cta.header': 'Next step:',
  'cta.paid_question': '💬 Next question — {price}',
  'cta.document_review': '📄 Document review — {price}',
  'cta.office_visit': '🏢 Meeting at the office',
  'cta.lawyer_handoff': '⚖️ Connect with the attorney — {price}',
  'cta.phone_call': '📞 Phone consultation — {price}',
  'cta.prepare_document': '📝 Prepare a claim / complaint — {price}',

  'services.title': '*Services and prices*',
  'services.online': '_Via Telegram:_',
  'services.offline': '_Directly with the attorney:_',
  'services.free': 'free',

  'pay.title': '*Payment*',
  'pay.instructions':
    'Service: *{service}*\nAmount: *{amount}*\n\n' +
    'Transfer to the card:\n`{card}`\n{holder}\n\n' +
    '⚠️ Put the code *{ref}* in the payment note — it lets us find your payment quickly.\n\n' +
    'Then send a *photo of the receipt* here.',
  'pay.noAccount': 'No payment card is configured yet. Please try again shortly.',
  'pay.sendReceipt': 'Send a photo of the receipt 📸',
  'pay.receiptReceived':
    'Receipt received ✅\n\nI will notify you as soon as the attorney confirms it. ' +
    'During working hours this usually takes a few minutes.',
  'pay.duplicateReceipt': 'This receipt image was sent before. Please send the receipt for this exact payment.',
  'pay.confirmed': '✅ Your payment is confirmed!\n\nService: *{service}*\n\nYou can now write your question.',
  'pay.rejected': '❌ The payment was not confirmed.\n\nReason: {reason}\n\nWrite to us if you have questions.',
  'pay.pending': 'You have a payment awaiting confirmation. The attorney is reviewing it.',

  'phone.request': 'Please share your phone number so the attorney can reach you.',
  'phone.button': '📱 Share number',
  'phone.saved': 'Thank you, your number has been saved.',
  'phone.skip': 'Not now',

  'balance.title': '*Your balance*',
  'balance.questions': 'Questions: *{n}*',
  'balance.documents': 'Documents: *{n}*',
  'balance.free': 'Free question: {state}',
  'balance.freeAvailable': 'available ✅',
  'balance.freeUsed': 'used',
  'balance.empty': 'Your balance is empty.',

  'lawyer.queued':
    'Your question has been passed to the attorney ⚖️\n\nYou will get a message here when they reply. The conversation continues in this bot.',
  'lawyer.reply': '⚖️ *Attorney {name}:*\n\n{body}',

  'safety.blocked':
    'No automatic answer is given on this topic — *the attorney will answer it personally*.\n\nYour question has been placed in the attorney queue.',

  'error.generic': 'A technical error occurred. Wait a moment and try again — your question was not lost.',
  'error.rateLimit': 'You are writing too quickly. Please wait a moment and try again.',

  'common.back': '⬅️ Back',
  'common.cancel': 'Cancel',
  'common.menu': '🏠 Main menu',
};
