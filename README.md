# Advokat.uz — AI huquqiy bot + advokat ish tizimi

Advokat **Muzaffar Turdimatov** uchun Telegram bot va (Faza 2'dan) advokat paneli.

AI javobning o'zi sotuv voronkasi: 1-savol bepul → 2-savol pullik → ofis /
hujjat ekspertizasi / advokatga ulanish.

---

## Ishga tushirish

### 1. Talab qilinadigan kalitlar

`.env.local` fayliga quyidagilarni **o'zingiz** yozing:

| O'zgaruvchi | Qayerdan olinadi |
|---|---|
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) → `/mybots` → `@advokat2_uz_bot` → API Token |
| `GOOGLE_GENERATIVE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) → Create API key |
| `PUBLIC_URL` | Server domeni, masalan `https://bot.advokat.uz` (faqat webhook uchun) |

`TELEGRAM_WEBHOOK_SECRET` va `AUTH_SECRET` allaqachon yaratilgan.

### 2. Baza

```bash
pnpm db:migrate && pnpm seed
```

Seed 9 ta xizmat, to'lov kartasi va sozlamalarni yozadi.
**Narxlarga qayta tegmaydi** — advokat paneldan o'zgartirgan narx saqlanib qoladi.

### 3. Advokat paneli

Admin yaratish (parol avtomatik chiqadi, bir marta ko'rsatiladi):

```bash
pnpm admin admin@advokat.uz "Muzaffar Turdimatov" lawyer
```

Panelni ochish: `pnpm dev` → http://localhost:3000

| Bo'lim | Nima qiladi |
|---|---|
| **Suhbatlar** | Barcha chatlar, filtrlar, qidiruv, javob yozish (mijozga Telegram orqali boradi) |
| **Ish kartochkasi** | AI xulosasi, muddatlar, faktlar, xavflar, to'lov tarixi |
| **To'lovlar** | Chek rasmi bilan navbat, Tasdiqlash / Rad etish |
| **Statistika** | Voronka, daromad, AI xarajati, sohalar |
| **Sozlamalar** | 6 ta bo'lim — pastda |

#### Sozlamalar bo'limlari

| Bo'lim | Nima boshqariladi |
|---|---|
| Narxlar | Har xizmat narxi, yoqish/o'chirish, o'zgarish tarixi |
| To'lov kartalari | Karta qo'shish, aktivini almashtirish, o'chirish |
| Bot matnlari | Botning **barcha 60 ta xabari**, har biri 4 tilda. Bo'sh qoldirilsa standartga qaytadi |
| AI sozlamalari | Qo'shimcha ko'rsatma, model tanlash, javob uzunligi |
| Limitlar | Bepul savol soni, minimal uzunlik, soatlik limit, texnik ishlar rejimi |
| Ish vaqti | Jadval, ish kunlari, ish vaqtidan tashqari avtojavob |
| Xodimlar | Kim panelga kiradi, rollar, parol yangilash, faolsizlantirish |
| Bloklanganlar | Bloklangan mijozlar, blokni olish |

#### Panel imkoniyatlari

**Tuzilma — Telegram Desktop.** Chapda 64px ikonka reyk (suhbatlar, to'lovlar,
hujjatlar, statistika), yonida ro'yxat ustuni, o'ngda tarkib. Sozlamalar, til, mavzu
va chiqish reyk pastidagi profil menyusida. Telefonda reyk o'rniga pastki panel
chiqadi va ro'yxat/tafsilot navbatma-navbat ochiladi.

**Ko'rinish — 48 kombinatsiya.** 8 ta mavzu (sof qora, grafit, bo'g'iq, yarim tun,
Nord, sof oq, yumshoq, sepiya) + avtomatik, va 6 ta urg'u rangi (yashil, ko'k, indigo,
siyohrang, to'q sariq, monoxrom). Yuza va urg'u ataylab ajratilgan: `data-theme`,
`data-accent`, `data-scheme` — shuning uchun kodda 48 emas, 8 + 12 ta blok turadi.
Mavzu bo'yalishdan oldin o'rnatiladi, ya'ni chaqnash yo'q.

- **4 til** — panel tili botdan mustaqil almashtiriladi (uz-lotin, uz-kirill, rus, ingliz)
- **Real-time** — mijoz yozsa xabar o'zi chiqadi (SSE + Postgres LISTEN/NOTIFY), F5 kerak emas
- **Ovoz + brauzer bildirishnomasi** yangi xabar va chek kelganda
- **Ish kartochkasi** ⓘ tugmasi bilan o'ngdan sirg'alib chiqadi
- **Chek suhbat oqimida** — rasm va Tasdiqlash/Rad etish tugmalari kelgan vaqtida,
  xabarlar orasida turadi. Advokat "To'lovlar" bo'limiga o'tmaydi
- **Mijozga borgan har bir tizim xabari suhbatga yoziladi** — panel va Telegram
  bir-biriga mos bo'lishi kerak
- **Klaviatura**: `J`/`K` — suhbatlar, `Enter` — ochish, `/` — qidiruv,
  `Ctrl+Enter` — javob yuborish

### 4. Lokal test (domen shart emas)

```bash
pnpm bot:poll
```

### 5. Serverda (webhook)

```bash
pnpm build && pnpm start
```

```bash
pnpm webhook:set
```

`pnpm webhook:info` — holatni tekshirish, `pnpm webhook:delete` — o'chirish.

---

## Tuzilma

```
src/
├─ bot/            Telegram (grammY): handlerlar, tugmalar, HTML formatlash
├─ core/
│  ├─ ai/          Gemini: provider, prompts, tasnif sxemasi, xarajat hisobi
│  ├─ funnel.ts    AI tavsiyasi → CTA tugmalari (narx BAZADAN, AI yozmaydi)
│  ├─ pricing.ts   xizmatlar va narxlar
│  ├─ orders.ts    buyurtma, chek, tasdiqlash
│  ├─ settings.ts  karta raqami va matnlar
│  └─ case-card.ts advokat uchun ish kartochkasi
├─ db/             Drizzle sxema (18 jadval)
├─ i18n/           4 til + lotin→kirill transliteratsiya
└─ app/
   ├─ admin/       advokat paneli (inbox, to'lovlar, statistika, sozlamalar)
   ├─ login/       kirish
   └─ api/         telegram webhook, chek rasmi proksisi
```

## Muhim qoidalar

- **Narx va karta raqami kodda emas, bazada.** Advokat paneldan o'zgartiradi.
- **Buyurtmada narx va karta snapshot qilinadi.** Ertaga narx oshsa, kecha chek
  yuborgan mijozdan qo'shimcha talab qilinmaydi.
- **AI hech qachon summa yozmaydi.** U faqat `recommendedNext` qaytaradi,
  tugma va narx bazadan chiziladi.
- **`outOfScope` savol bepul limitni sarflamaydi** ("salom", "narx qancha").
- **Gemini safety bloklasa tizim jim qolmaydi** — savol advokat navbatiga tushadi.
- **uz_cyrl qo'lda yozilmaydi** — uz_latn'dan deterministik transliteratsiya.
- **Model zanjiri.** Gemini band bo'lsa yoki kvota tugasa, tizim avtomatik
  keyingi modelga o'tadi. Pul to'lagan mijoz xato xabarini olmasligi kerak.
- **Chek rasmi proksi orqali ko'rsatiladi.** Telegram havolasida bot tokeni bor —
  uni brauzerga chiqarish botni boshqa qo'lga topshirish bilan barobar.
- **Bot matni va limitlari bazada.** Kodda faqat standart qiymat turadi; paneldagi
  qiymat ustun bo'ladi, bo'sh qoldirilsa standartga qaytadi. Shu sababli noto'g'ri
  tahrir botni hech qachon jim qoldirmaydi.
- **Xodim o'chirilmaydi, faolsizlantiriladi.** `orders.confirmed_by` unga bog'langan —
  kim qaysi chekni tasdiqlagani tarixi saqlanishi kerak.
- **Dizayn tokenlari** `src/app/globals.css` da, har mavzu uchun alohida blok.
  Brend rangini o'zgartirish uchun `--accent` ni tahrirlash kifoya.
- **Nisbiy vaqt `Intl.RelativeTimeFormat` bilan emas.** O'zbek tili uchun CLDR
  ma'lumoti to'liq emas va "-3 h" kabi natija beradi; o'z satrlarimiz ishlatiladi.

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `pnpm dev` | Ishlab chiqish serveri |
| `pnpm bot:poll` | Botni polling rejimida sinash |
| `pnpm db:generate` | Sxemadan migratsiya yaratish |
| `pnpm db:migrate` | Migratsiyalarni qo'llash |
| `pnpm db:studio` | Bazani brauzerda ko'rish |
| `pnpm seed` | Xizmat, karta va sozlamalarni yozish |
| `pnpm webhook:set` | Telegram webhook'ni o'rnatish |
| `pnpm admin <email> [ism] [rol]` | Admin yaratish / parolini yangilash |
