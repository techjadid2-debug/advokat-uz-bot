/** Asosiy katalog. uz_cyrl shundan avtomatik transliteratsiya qilinadi. */
export const uz_latn = {
  'lang.choose': 'Tilni tanlang / Тилни танланг / Выберите язык / Choose language',
  'lang.changed': 'Til o‘zgartirildi.',
  'lang.uz_latn': "O'zbekcha (lotin)",
  'lang.uz_cyrl': 'Ўзбекча (кирилл)',
  'lang.ru': 'Русский',
  'lang.en': 'English',

  'start.welcome':
    'Assalomu alaykum, {name}!\n\n' +
    'Bu — advokat {lawyer} ning rasmiy yordamchisi.\n\n' +
    'Huquqiy savolingizni shu yerga yozing — *birinchi savolga bepul javob* beraman. ' +
    'Keyin, agar kerak bo‘lsa, ishingizni advokatning o‘ziga uzataman.',
  'start.askNow': 'Savolingizni matn ko‘rinishida yozing 👇',

  'menu.ask': '💬 Savol berish',
  'menu.services': '📋 Xizmatlar va narxlar',
  'menu.balance': '🎫 Mening balansim',
  'menu.lawyer': '⚖️ Advokat bilan bog‘lanish',
  'menu.language': '🌐 Til',
  'menu.help': 'ℹ️ Yordam',

  'ask.thinking': 'Savolingizni o‘rganyapman…',
  'ask.tooShort':
    'Savolingizni biroz batafsilroq yozing — holatni tushunmasdan foydali javob berib bo‘lmaydi.',
  'ask.freeUsed':
    'Sizning *bepul savolingiz* allaqachon ishlatilgan.\n\n' +
    'Keyingi savolga javob olish uchun quyidagi tugmani bosing.',
  'ask.noBalance':
    'Bu savolga javob berish uchun balansingizda huquq yo‘q.\n\nQuyidagidan birini tanlang:',
  'ask.usedFree':
    '_Bu sizning bepul savolingiz edi. Keyingi savollar pullik._',
  'ask.paidLeft': '_Balansingizda yana {n} ta savol qoldi._',

  'disclaimer':
    '_Ushbu javob ma’lumot xarakterida bo‘lib, yuridik maslahat hisoblanmaydi. ' +
    'Aniq huquqiy pozitsiya hujjatlar ko‘rib chiqilgandan so‘ng beriladi._',

  'cta.header': 'Keyingi qadam:',
  'cta.paid_question': '💬 Keyingi savol — {price}',
  'cta.document_review': '📄 Hujjatlarni ko‘rib chiqish — {price}',
  'cta.office_visit': '🏢 Ofisda uchrashuv',
  'cta.lawyer_handoff': '⚖️ Advokatga ulanish — {price}',
  'cta.phone_call': '📞 Telefon orqali maslahat — {price}',
  'cta.prepare_document': '📝 Ariza / shikoyat tayyorlash — {price}',

  'services.title': '*Xizmatlar va narxlar*',
  'services.online': '_Telegram orqali:_',
  'services.offline': '_Advokat bilan bevosita:_',
  'services.free': 'bepul',

  'pay.title': '*To‘lov*',
  'pay.instructions':
    'Xizmat: *{service}*\nSumma: *{amount}*\n\n' +
    'Quyidagi kartaga o‘tkazing:\n' +
    '`{card}`\n{holder}\n\n' +
    '⚠️ To‘lov izohiga *{ref}* kodini yozing — bu to‘lovingizni tez topish uchun kerak.\n\n' +
    'So‘ng *chek rasmini* shu yerga yuboring.',
  'pay.noAccount':
    'Hozircha to‘lov kartasi sozlanmagan. Iltimos, birozdan keyin urinib ko‘ring.',
  'pay.sendReceipt': 'Chek rasmini yuboring 📸',
  'pay.receiptReceived':
    'Chek qabul qilindi ✅\n\nAdvokat tasdiqlagach, sizga darhol xabar beraman. ' +
    'Odatda bu ish vaqtida bir necha daqiqa oladi.',
  'pay.duplicateReceipt':
    'Bu chek rasmi avval yuborilgan. Iltimos, aynan shu to‘lovning chekini yuboring.',
  'pay.confirmed':
    '✅ To‘lovingiz tasdiqlandi!\n\nXizmat: *{service}*\n\nEndi savolingizni yozishingiz mumkin.',
  'pay.rejected': '❌ To‘lov tasdiqlanmadi.\n\nSabab: {reason}\n\nSavollar bo‘lsa yozing.',
  'pay.pending': 'Sizda tasdiq kutayotgan to‘lov bor. Advokat ko‘rib chiqmoqda.',

  'phone.request':
    'Advokat siz bilan bog‘lana olishi uchun telefon raqamingizni qoldiring.',
  'phone.button': '📱 Raqamni yuborish',
  'phone.saved': 'Rahmat, raqamingiz saqlandi.',
  'phone.skip': 'Hozir emas',

  'balance.title': '*Balansingiz*',
  'balance.questions': 'Savollar: *{n}* ta',
  'balance.documents': 'Hujjatlar: *{n}* ta',
  'balance.free': 'Bepul savol: {state}',
  'balance.freeAvailable': 'mavjud ✅',
  'balance.freeUsed': 'ishlatilgan',
  'balance.empty': 'Balansingiz bo‘sh.',

  'lawyer.queued':
    'Savolingiz advokatga uzatildi ⚖️\n\n' +
    'Advokat javob yozganda shu yerda xabar olasiz. Suhbat shu botda davom etadi.',
  'lawyer.reply': '⚖️ *Advokat {name}:*\n\n{body}',

  'safety.blocked':
    'Bu savol mavzusi bo‘yicha avtomatik javob berilmaydi — unga *advokatning o‘zi* javob beradi.\n\n' +
    'Savolingiz advokat navbatiga qo‘yildi.',

  'error.generic':
    'Texnik nosozlik yuz berdi. Biroz kutib qayta urinib ko‘ring — savolingiz yo‘qolmadi.',
  'error.rateLimit': 'Juda tez yozyapsiz. Biroz kuting va qayta urinib ko‘ring.',

  'common.back': '⬅️ Orqaga',
  'common.cancel': 'Bekor qilish',
  'common.menu': '🏠 Bosh menyu',
} as const;

export type MessageKey = keyof typeof uz_latn;
