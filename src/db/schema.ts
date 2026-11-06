import {
  pgTable, pgEnum, uuid, text, integer, bigint, boolean,
  timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

/* ─────────────────────────── Enumlar ─────────────────────────── */

export const channelEnum = pgEnum('channel', ['telegram', 'instagram', 'web']);
export const localeEnum = pgEnum('locale', ['uz_latn', 'uz_cyrl', 'ru', 'en']);
export const clientTypeEnum = pgEnum('client_type', ['jismoniy', 'yuridik', 'chet_el']);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'yangi', 'ai', 'tolov_kutilmoqda', 'advokat_kutmoqda', 'advokat_faol', 'yopilgan',
]);

/** Voronka bosqichlari — konversiyani o'lchash uchun. Reja: 1-bo'lim. */
export const funnelStageEnum = pgEnum('funnel_stage', [
  'yangi', 'bepul_javob_berildi', 'pullik_faol',
  'hujjat_taklif', 'ofis_taklif', 'advokatga_topshirildi',
  'yopilgan', 'yoqotilgan',
]);

export const senderEnum = pgEnum('sender', ['user', 'ai', 'lawyer', 'system']);
export const serviceKindEnum = pgEnum('service_kind', [
  'savol', 'hujjat', 'konsultatsiya', 'offline', 'paket',
]);
export const orderStatusEnum = pgEnum('order_status', [
  'kutilmoqda', 'chek_yuborildi', 'tolandi', 'rad_etildi', 'bekor',
]);
export const paymentProviderEnum = pgEnum('payment_provider', ['manual_card', 'click', 'payme']);
export const entitlementKindEnum = pgEnum('entitlement_kind', ['question', 'document', 'consultation']);
export const documentStatusEnum = pgEnum('document_status', [
  'qoralama', 'advokat_kormoqda', 'tasdiqlangan', 'yuborilgan',
]);
export const levelEnum = pgEnum('level', ['past', 'orta', 'yuqori']);
export const nextActionEnum = pgEnum('next_action', [
  'paid_question', 'document_review', 'office_visit', 'lawyer_handoff', 'phone_call', 'none',
]);
export const adminRoleEnum = pgEnum('admin_role', ['lawyer', 'assistant', 'admin']);

/* ─────────────────────────── Mijozlar ─────────────────────────── */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Kanal boshidan abstraksiya — Instagram keyin qo'shilganda baza qayta yozilmaydi. */
  channel: channelEnum('channel').notNull().default('telegram'),
  externalId: text('external_id').notNull(),
  username: text('username'),
  fullName: text('full_name'),
  phone: text('phone'),
  locale: localeEnum('locale').notNull().default('uz_latn'),
  /** Mijoz tilni O'ZI tanladimi (Telegram sozlamasidan taxmin qilinganmi). */
  localeChosenAt: timestamp('locale_chosen_at', { withTimezone: true }),
  clientType: clientTypeEnum('client_type'),
  /** Nechta bepul savol ishlatilgan. Limit paneldan boshqariladi. */
  freeQuestionsUsed: integer('free_questions_used').notNull().default(0),
  /** Birinchi bepul savol qachon ishlatilgan (statistika uchun). */
  freeQuestionUsedAt: timestamp('free_question_used_at', { withTimezone: true }),
  isBlocked: boolean('is_blocked').notNull().default(false),
  referredBy: uuid('referred_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_channel_external_idx').on(t.channel, t.externalId),
  index('users_phone_idx').on(t.phone),
]);

/* ─────────────────────────── Suhbatlar ─────────────────────────── */

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: channelEnum('channel').notNull().default('telegram'),
  status: conversationStatusEnum('status').notNull().default('yangi'),
  funnelStage: funnelStageEnum('funnel_stage').notNull().default('yangi'),
  assignedTo: uuid('assigned_to').references(() => admins.id),
  subject: text('subject'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('conversations_status_idx').on(t.status, t.lastMessageAt),
  index('conversations_user_idx').on(t.userId),
]);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  sender: senderEnum('sender').notNull(),
  /** Advokat yozgan bo'lsa — kim yozgani. */
  authorAdminId: uuid('author_admin_id').references(() => admins.id),
  body: text('body').notNull(),
  attachments: jsonb('attachments').$type<Attachment[]>().notNull().default([]),
  /** Telegram xabar ID — tahrirlash va javob berish uchun. */
  externalMessageId: text('external_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('messages_conversation_idx').on(t.conversationId, t.createdAt)]);

export type Attachment = {
  kind: 'photo' | 'document' | 'voice' | 'video';
  fileId: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
};

/* ───────────────────── AI javoblari va tasnifi ───────────────────── */

/**
 * Gemini har javobda matn bilan birga strukturalangan tasnif qaytaradi.
 * Tugmalar va narxlar shu tasnif asosida BAZADAN chiziladi — AI narx yozmaydi.
 */
export const aiAnswers = pgTable('ai_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  legalArea: text('legal_area'),
  clientTypeGuess: clientTypeEnum('client_type_guess'),
  urgency: levelEnum('urgency'),
  confidence: levelEnum('confidence'),
  deadline: jsonb('deadline').$type<{ name: string; endsAt?: string; note: string } | null>(),
  /** 2-4 ta aniq savol — voronkaning kaliti, aynan shu keyingi bosqichni sotadi. */
  missingInfo: jsonb('missing_info').$type<string[]>().notNull().default([]),
  needsDocuments: boolean('needs_documents').notNull().default(false),
  recommendedNext: nextActionEnum('recommended_next').notNull().default('none'),
  /** true bo'lsa bepul savol SARFLANMAYDI ("salom", "narx qancha"). */
  outOfScope: boolean('out_of_scope').notNull().default(false),
  /** Gemini safety filtri bloklaganmi. */
  blockedBySafety: boolean('blocked_by_safety').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('ai_answers_conversation_idx').on(t.conversationId)]);

/** Unit-ekonomika: bir mijozga AI xarajati ↔ bir mijozdan daromad. */
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  purpose: text('purpose').notNull(), // chat_free | chat_paid | case_card | document | classify
  provider: text('provider').notNull().default('google'),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  /** Mikro-dollarda (1 USD = 1_000_000) — float xatosidan qochish uchun. */
  costMicroUsd: bigint('cost_micro_usd', { mode: 'number' }).notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  ok: boolean('ok').notNull().default(true),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('ai_usage_created_idx').on(t.createdAt)]);

/** Voronka o'tishlari — panelda konversiya avtomatik chiziladi. */
export const funnelEvents = pgTable('funnel_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fromStage: funnelStageEnum('from_stage'),
  toStage: funnelStageEnum('to_stage').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('funnel_events_created_idx').on(t.createdAt)]);

/** Advokat suhbatni ochganda 30 soniyada kontekstni oladi. */
export const caseCards = pgTable('case_cards', {
  conversationId: uuid('conversation_id').primaryKey().references(() => conversations.id, { onDelete: 'cascade' }),
  summary: text('summary'),
  legalArea: text('legal_area'),
  keyFacts: jsonb('key_facts').$type<string[]>().notNull().default([]),
  deadlines: jsonb('deadlines').$type<{ name: string; endsAt?: string; note: string }[]>().notNull().default([]),
  suggestedPosition: text('suggested_position'),
  risks: jsonb('risks').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────── Xizmatlar, narxlar, sozlamalar ─────────────────── */

/** Narxlar KODDA EMAS, bazada — advokat panelidan tahrirlaydi, deploy shart emas. */
export const services = pgTable('services', {
  code: text('code').primaryKey(),
  kind: serviceKindEnum('kind').notNull(),
  /** 4 tilda nom va tavsif: { uz_latn: {...}, uz_cyrl: {...}, ru: {...}, en: {...} } */
  title: jsonb('title').$type<Record<string, string>>().notNull(),
  description: jsonb('description').$type<Record<string, string>>().notNull().default({}),
  /** Minor birlikda: UZS → tiyin, USD → sent. Ikkalasi ham ×100. */
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('UZS'),
  clientType: clientTypeEnum('client_type'),
  /** Nechta huquq beradi (masalan paket: 3 ta savol). */
  grantsKind: entitlementKindEnum('grants_kind'),
  grantsQty: integer('grants_qty').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceCode: text('service_code').notNull().references(() => services.code, { onDelete: 'cascade' }),
  oldAmountMinor: bigint('old_amount_minor', { mode: 'number' }),
  newAmountMinor: bigint('new_amount_minor', { mode: 'number' }).notNull(),
  currency: text('currency').notNull(),
  changedBy: uuid('changed_by').references(() => admins.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Karta raqami kodda emas. Karta bloklanishi yoki bank almashishi odatiy hol —
 * bunday paytda bot bir daqiqada qayta sozlanishi kerak.
 */
export const paymentAccounts = pgTable('payment_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  cardNumber: text('card_number').notNull(),
  holderName: text('holder_name').notNull(),
  cardType: text('card_type').notNull().default('humo'),
  currency: text('currency').notNull().default('UZS'),
  isActive: boolean('is_active').notNull().default(true),
  note: text('note'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Salomlashuv, disclaimer, oferta, ofis manzili — 4 tilda, paneldan tahrirlanadi. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedBy: uuid('updated_by').references(() => admins.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ─────────────────────────── To'lovlar ─────────────────────────── */

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  serviceCode: text('service_code').notNull().references(() => services.code),
  /** SNAPSHOT: buyurtma paytidagi summa. Narx ertaga oshsa, bu o'zgarmaydi. */
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: text('currency').notNull(),
  /** SNAPSHOT: chek qaysi kartaga tushganini keyin tekshirish uchun. */
  cardNumber: text('card_number'),
  cardHolder: text('card_holder'),
  /** Har buyurtmaga unikal 4 xonali kod — mijoz izohga yozadi. */
  refCode: text('ref_code').notNull(),
  provider: paymentProviderEnum('provider').notNull().default('manual_card'),
  status: orderStatusEnum('status').notNull().default('kutilmoqda'),
  receiptFileId: text('receipt_file_id'),
  /** Takroriy chek rasmini avtomatik aniqlash uchun. */
  receiptSha256: text('receipt_sha256'),
  receiptAt: timestamp('receipt_at', { withTimezone: true }),
  confirmedBy: uuid('confirmed_by').references(() => admins.id),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('orders_ref_code_idx').on(t.refCode),
  index('orders_status_idx').on(t.status, t.createdAt),
  index('orders_receipt_sha_idx').on(t.receiptSha256),
]);

/** To'langan savol/hujjat balansi. */
export const entitlements = pgTable('entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: entitlementKindEnum('kind').notNull(),
  remaining: integer('remaining').notNull(),
  sourceOrderId: uuid('source_order_id').references(() => orders.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('entitlements_user_idx').on(t.userId, t.kind)]);

/* ─────────────────────────── Hujjatlar ─────────────────────────── */

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  docType: text('doc_type').notNull(),
  facts: jsonb('facts').$type<Record<string, unknown>>().notNull().default({}),
  aiDraft: text('ai_draft'),
  finalContent: text('final_content'),
  status: documentStatusEnum('status').notNull().default('qoralama'),
  approvedBy: uuid('approved_by').references(() => admins.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  pdfPath: text('pdf_path'),
  docxPath: text('docx_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('documents_status_idx').on(t.status, t.createdAt)]);

/** Muddat eslatmalari — mijozni qaytarib keltiradigan asosiy mexanika. */
export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  note: text('note'),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('reminders_due_idx').on(t.dueAt, t.sentAt)]);

/* ─────────────────────── Xodimlar va audit ─────────────────────── */

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: adminRoleEnum('role').notNull().default('assistant'),
  telegramId: text('telegram_id'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  /** Ketma-ket noto'g'ri urinishlar. Muvaffaqiyatli kirishda nolga qaytadi. */
  failedAttempts: integer('failed_attempts').notNull().default(0),
  /** Bloklangan bo'lsa — shu vaqtgacha kirish taqiqlanadi. */
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('admins_email_idx').on(t.email)]);

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  adminId: uuid('admin_id').notNull().references(() => admins.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Huquqiy xizmatda majburiy: kim nimani qachon o'zgartirdi. */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  before: jsonb('before').$type<unknown>(),
  after: jsonb('after').$type<unknown>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('audit_created_idx').on(t.createdAt)]);
