# Keyingi ishlar

Holat: **bot jonli ishlayapti va haqiqiy mijozlarga xizmat qilyapti.**
Shu sababli quyidagi tartib "qiziqarli"likka emas, **xavf darajasiga** qarab tuzilgan.

---

## 🔴 0. Zudlik bilan (bu hafta)

### 0.1 Hujjat xizmati pul oladi, lekin hech narsa bermaydi

`funnel.ts` da `document_prepare` (100 000 so'm) mijozga tugma sifatida
taklif qilinadi va sotib olinadi. Lekin `src/core/documents/` **bo'sh** —
to'lovdan keyin mijoz `document` balansini oladi va u yerda qoladi.
Hech qanday ariza tayyorlanmaydi.

**Bir daqiqalik yechim (bugunoq):** Sozlamalar → Narxlar → *Ariza / shikoyat
tayyorlash* → **O'chirish**. Xizmat menyudan yo'qoladi, mijoz uni sotib
ololmaydi. Faza 3 tayyor bo'lganda qayta yoqiladi.

Agar allaqachon sotib olgan mijoz bo'lsa — pulini qaytarish yoki qo'lda
tayyorlab berish kerak. `orders` jadvalidan `document_prepare` bo'yicha
tekshiriladi.

### 0.2 Bot noutbukdan ishlayapti — ✅ VAQTINCHA HAL QILINDI

**2026-08-23:** bot va panel Vercel'ga ko'chirildi, baza — Neon Postgres.
Polling o'chirildi, webhook yoqildi. Noutbuk endi kerak emas.

- Panel: https://advokat-uz-seven.vercel.app
- Webhook: `/api/telegram/webhook` (sirli token bilan himoyalangan, 401 tekshirildi)
- Ma'lumotlar lokal bazadan to'liq ko'chirildi (8 foydalanuvchi, 5 suhbat, 12 xabar, 10 buyurtma)

**Bu vaqtinchalik yechim.** Ma'lumotlar AQSh (`us-east-1`) serverida —
LRU-547 bo'yicha risk saqlanib qoladi. VPS tayyor bo'lgach qaytariladi.

**Sovuq start — sabab Neon emas, drayver edi.**

Toza o'lchov (`/api/receipt/...`, faqat bitta baza so'rovi, bot yo'q):

| | `postgres.js` | `neon-serverless` |
|---|---|---|
| sovuq | 46.6s | **2.7s** |
| issiq | 3.6s | **0.6s** |

Sovuq so'rov **17 barobar**, issiq **6 barobar** tezlashdi.

Issiq holatda ham 3.6 soniya bo'lgani sababni ochib berdi: `postgres.js`
doimiy server uchun yozilgan va har serverless chaqiruvda yangi TCP+TLS
ulanish quradi. Neon uyg'onishi hujjatlarga ko'ra bir necha yuz millisekund —
ya'ni ayb undamas edi.

**Yechim:** muhitga qarab drayver tanlanadi (`src/db/index.ts`):
- Vercel → `drizzle-orm/neon-serverless` (WebSocket, tranzaksiyalarni qo'llaydi)
- Lokal va VPS → `postgres.js` (doimiy jarayonda eng tez)

Neon'ning HTTP drayveri undan ham tez, lekin tranzaksiyalarni qo'llamaydi —
bizda 5 joyda kerak (balans sarflash, buyurtma tasdiqlash), shuning uchun
WebSocket varianti tanlandi.

### 0.2b VPS'ga ko'chirish (asosiy maqsad saqlanadi)

Tanlangan: **UzCloud, 2 vCPU · 4 GB · 60 GB SSD — 388 000 so'm/oy.**
Kerak: domen, SSL, Docker Compose, webhook manzilini almashtirish,
bazani Neon'dan qaytarib ko'chirish.

### 0.3 Zaxira nusxa yo'q

Bazada haqiqiy mijoz suhbatlari, to'lovlar va shaxsiy ma'lumotlar bor.
Neon'da avtomatik nusxa bor (point-in-time restore), lekin bu bizning
nazoratimizda emas va bepul tarifda tarix qisqa.

Kerak: kunlik `pg_dump`, 7 kunlik saqlash, boshqa joyga nusxa.

---

## 🟠 1. Yaqin kunlarda

### 1.1 Gemini kvotasi — endi ikki karra muhim

Kalit **bepul tarifda**: Pro modellar `429` qaytaradi, `google_search`
grounding ham `429`, Flash'lar kunlik limitga ega. Mijozlar ko'paysa,
kunning o'rtasida bot javob bera olmay qoladi.

**Aniq raqam (2026-08-23 da o'lchandi):**
`GenerateRequestsPerDayPerProjectPerModel-FreeTier` = **kuniga 20 ta so'rov,
har model uchun**. Zanjirdagi 3 model bilan jami ~60/kun. Har suhbat 2 ta
so'rov yeydi (javob + ish kartochkasi), ya'ni amalda **~30 suhbat/kun**.

lex.uz yondashuvi (4.2) har savolni ~20–45 ming tokenga oshiradi.
**Billing yoqilmasa, 4.2 ni yoqib bo'lmaydi** va bot ~30 suhbatdan keyin
kun bo'yi javob bermaydi.

Kerak: Google AI Studio'da billing yoqish, `ai_usage` bo'yicha kunlik
sarf monitoringi, limitga yaqinlashganda advokatga ogohlantirish.

### 1.2 Huquqiy hujjatlar

- Ommaviy oferta (bot va panelda havola)
- Maxfiylik siyosati
- Shaxsga doir ma'lumotlar operatori sifatida ro'yxatdan o'tish
- Pul qaytarish qoidasi

Bular kod emas, lekin ularsiz jiddiy risk bor — ayniqsa huquqiy xizmatda.

---

## 🟡 2. Faza 3 — Hujjat tayyorlash

Bu 0.1 dagi teshikni yopadi va yangi daromad manbasini ochadi.

```
Mijoz 100k to'laydi
   → bot savol-javob bilan faktlarni yig'adi (FIO, sud, sana, holat, talab)
   → Gemini qoralama yozadi              [advokat_ko'rmoqda]
   → advokat panelda tahrirlaydi, "Tasdiqlash"
   → PDF + DOCX generatsiya
   → botga yuboriladi
```

Ish hajmi:
- `src/core/documents/` — shablonlar, faktlarni yig'ish stsenariysi
- Gemini uchun strukturalangan hujjat sxemasi
- PDF: Puppeteer + kirill/lotin qamrovli TTF (**shrift birinchi kunda
  test qilinadi** — `ў қ ғ ҳ oʻ gʻ` kvadratga aylanishi eng ko'p uchraydigan xato)
- DOCX: `docx` paketi
- Panelda "Hujjatlar" bo'limi (reykda joyi allaqachon bor, hozir bo'sh)

---

## 🟡 3. Faza 4 — Ushlab qolish va sotuv

### 3.0 Cron — nima uchun ishlaydi, nima uchun yo'q

**Vercel bepul tarifda cron kuniga faqat 1 marta ishlaydi.** Tez-tez yozilgan
ifoda deploy paytida xato beradi. Shuning uchun:

| Vazifa | Vercel cron mos keladimi |
|---|---|
| Kunlik sog'liq tekshiruvi | ✅ aynan mos — **qurildi** |
| Muddat eslatmalari (3.1) | ✅ kuniga bir marta yetarli |
| Sovuq startni oldini olish (har 5 daqiqa) | ❌ mumkin emas |

**Qurilgani:** `/api/cron/health`, har kuni 04:00 UTC (Toshkentda 09:00).
Tekshiradi: webhook xatosi, navbatda qolgan xabarlar, bir kundan ortiq
tasdiqlanmagan cheklar, advokat javobini kutayotgan mijozlar, AI xatolari
ulushi (kvota tugaganini shu yerdan bilamiz).

**Ulangan va sinovdan o'tgan (2026-08-23).** `ALERT_TELEGRAM_CHAT_ID` o'rnatildi,
xabar yetib bordi.

Sog'lom holatda cron **jim turadi** — har kuni "hammasi joyida" degan xabar
bir haftada e'tibordan qoladi. Ulanishni tekshirish uchun `?test=1`.

**AI tekshiruvida muhim farq bor.** Ikki xil xato aralashtirilmaydi:
- *"Model band"* — zanjir keyingi modelga o'tadi, mijoz javob oladi. Xavotir yo'q.
- *"Kvota tugadi"* — model kun bo'yi ishlamaydi. Bitta shunday xato ham
  ogohlantirishga arziydi.

Birinchi versiyada ikkalasi bitta nisbat bilan o'lchangan edi va 24 soatdagi
6 ta xatoning 5 tasi zararsiz "model band" bo'lib chiqdi — noto'g'ri signal
bergan bo'lardi.

Nega muhim: hozir bot buzilsa (kvota tugasa, webhook yiqilsa) buni **hech kim
bilmaydi** — mijoz javob kutib o'tiraveradi.

### 3.1 Muddat eslatmalari

AI allaqachon `case_cards.deadlines` ga muddatlarni yozib qo'yyapti,
lekin `reminders` jadvali **umuman ishlatilmayapti** va `src/workers/`
bo'sh. Ya'ni ma'lumot yig'ilyapti, foydalanilmayapti.

Kerak: BullMQ worker, kunlik tekshiruv, mijozga eslatma, advokatga xulosа.
Bu raqobatchilarda yo'q va qaytib kelishni ta'minlaydi.

### 3.2 Paket va kredit tizimi

Tasdiqlanmagan taklif (siz hali javob bermagansiz):
- 3 savol 120k, 10 savol 250k
- 50k to'lagan mijoz 100k hujjatga o'tsa, 50k chegirilsin

### 3.3 Referal

Do'st taklif qilsa +1 bepul savol.

---

## 🟢 4. Faza 5 — Kengaytirish

### 4.1 Click integratsiya

Hozir chek qo'lda tasdiqlanadi. Kuniga 10+ to'lovda bu charchatadi va
soxta chek riski bor. Merchant hujjatlari tayyor bo'lgach, `providers/`
abstraksiyasiga `click.ts` qo'shiladi — qolgan kod tegilmaydi.

Eslatma: jismoniy kartaga muntazam tushum soliq masalasini tug'diradi.

### 4.2 lex.uz — korpussiz yondashuv (sinovdan o'tkazilgan)

**Qaror: korpus serverga yuklanmaydi.** Gemini'ning `url_context` vositasi
lex.uz sahifasini o'zi o'qiydi. pgvector, embedding va hujjat ombori kerak emas.

Sinov natijasi (2026-08-23):

| Nima | Natija |
|---|---|
| `url_context` bepul tarifda | ✅ ishlaydi |
| lex.uz'ni o'qish | ✅ `URL_RETRIEVAL_STATUS_SUCCESS` |
| To'liq Mehnat kodeksini o'qish | ✅ 43 534 token |
| Aniq modda topish | ✅ 560-modda, 3 oy — to'g'ri |
| Vaqt | 22.9s (RAG'siz ~15s) |
| `google_search` grounding | ❌ **429 — pullik** |

**Ikkita cheklov:**

1. **Qidiruv pullik.** Demak "qaysi hujjatni o'qish kerak" degan savolga
   Google javob bera olmaydi. Yechim: **kodekslar havolalari jadvali** —
   ~15 ta asosiy kodeks va qonunning lex.uz manzili bazada saqlanadi.
   AI huquq sohasini aniqlaydi (buni allaqachon qilyapti: `legalArea`) →
   mos 1-2 havola `url_context` ga beriladi. Bu korpus emas, faqat havolalar ro'yxati.

2. **Har savol ~49 000 token.** RAG'siz ~2 000 edi. Pulda arzon
   (~$0.013/savol, 50 000 so'm narx oldida hech narsa), lekin **bepul
   tarifning daqiqalik token chegarasi tez to'ladi.** Billing yoqilishi shart.

**Qo'shimcha foyda:** lex.uz `robots.txt` da `Crawl-delay: 20` turibdi —
daqiqasiga 3 so'rov. Agar o'zimiz olsak, bloklanardik. Gemini olganda
bu muammo bizga tegmaydi.

**Holat: qurildi, panelda o'chirilgan holda turibdi** (Sozlamalar → AI sozlamalari →
"lex.uz manbasidan tekshirish"). Billing yoqilgach yoqiladi.

**Qurilgani:** 6 ta kodeks havolasi (har biri ochib tekshirilgan), lokal kalit
so'zlar bilan manba tanlash (qo'shimcha AI chaqiruvisiz), `url_context` ulanishi,
manba o'qilganini tekshirish.

**Sinovda topilgan xavf.** `gemini-2.5-flash` `url_context` ni qabul qiladi,
lekin havolani **ochmaydi** va javobni xotiradan yozadi. Prompt esa unga
"manba oldingda, moddani ishonch bilan ayt" deydi — natijada grounding'siz
holatdan ham xavfliroq bo'ladi.

Bir xil savolga uch xil javob chiqdi:

| Model | Manba o'qildi | Javob |
|---|---|---|
| 3.5-flash | ✅ 43k token | 560-modda, 3 oy |
| 2.5-flash | ❌ | 422-modda |
| 2.5-flash | ❌ | 530-modda, 1 oy |

**Yechim:** manba faqat `url_context` ni haqiqatan qo'llaydigan modelga
beriladi (`supportsGrounding`), zanjir shunga qarab qayta tartiblanadi, va
javobdan keyin `urlContextMetadata` orqali havola ochilgani tekshiriladi.
Ochilmasa — jurnalga ogohlantirish yoziladi.

### 4.3 Instagram DM

Meta app review talab qiladi (`instagram_manage_messages`), 24 soatlik
javob oynasi cheklovi bor. Baza `channel` maydoni bilan tayyor —
qo'shilganda qayta yozish kerak emas.

### 4.4 Chet el to'lovi

$100 tarif uchun Click ishlamaydi (xorijiy karta qabul qilinmaydi).
Alohida yechim kerak: Stripe / Wise / bank o'tkazmasi.

---

## Hozircha javobsiz savollar

1. Paket va kredit tizimi kiritilsinmi? (3.2)
2. Kirill jadvaldagi "Телеграмдан — 200 минг" qatorining taqdiri
3. VPS provayderi tanlandimi? (Ahost, Uzcloud, Billur…)
4. Domen bormi?
