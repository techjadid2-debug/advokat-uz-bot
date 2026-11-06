CREATE TYPE "public"."admin_role" AS ENUM('lawyer', 'assistant', 'admin');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('telegram', 'instagram', 'web');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('jismoniy', 'yuridik', 'chet_el');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('yangi', 'ai', 'tolov_kutilmoqda', 'advokat_kutmoqda', 'advokat_faol', 'yopilgan');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('qoralama', 'advokat_kormoqda', 'tasdiqlangan', 'yuborilgan');--> statement-breakpoint
CREATE TYPE "public"."entitlement_kind" AS ENUM('question', 'document', 'consultation');--> statement-breakpoint
CREATE TYPE "public"."funnel_stage" AS ENUM('yangi', 'bepul_javob_berildi', 'pullik_faol', 'hujjat_taklif', 'ofis_taklif', 'advokatga_topshirildi', 'yopilgan', 'yoqotilgan');--> statement-breakpoint
CREATE TYPE "public"."level" AS ENUM('past', 'orta', 'yuqori');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('uz_latn', 'uz_cyrl', 'ru', 'en');--> statement-breakpoint
CREATE TYPE "public"."next_action" AS ENUM('paid_question', 'document_review', 'office_visit', 'lawyer_handoff', 'phone_call', 'none');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('kutilmoqda', 'chek_yuborildi', 'tolandi', 'rad_etildi', 'bekor');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('manual_card', 'click', 'payme');--> statement-breakpoint
CREATE TYPE "public"."sender" AS ENUM('user', 'ai', 'lawyer', 'system');--> statement-breakpoint
CREATE TYPE "public"."service_kind" AS ENUM('savol', 'hujjat', 'konsultatsiya', 'offline', 'paket');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "admin_role" DEFAULT 'assistant' NOT NULL,
	"telegram_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"legal_area" text,
	"client_type_guess" "client_type",
	"urgency" "level",
	"confidence" "level",
	"deadline" jsonb,
	"missing_info" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"needs_documents" boolean DEFAULT false NOT NULL,
	"recommended_next" "next_action" DEFAULT 'none' NOT NULL,
	"out_of_scope" boolean DEFAULT false NOT NULL,
	"blocked_by_safety" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"purpose" text NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micro_usd" bigint DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"ok" boolean DEFAULT true NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_cards" (
	"conversation_id" uuid PRIMARY KEY NOT NULL,
	"summary" text,
	"legal_area" text,
	"key_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deadlines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_position" text,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "channel" DEFAULT 'telegram' NOT NULL,
	"status" "conversation_status" DEFAULT 'yangi' NOT NULL,
	"funnel_stage" "funnel_stage" DEFAULT 'yangi' NOT NULL,
	"assigned_to" uuid,
	"subject" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"doc_type" text NOT NULL,
	"facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_draft" text,
	"final_content" text,
	"status" "document_status" DEFAULT 'qoralama' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"pdf_path" text,
	"docx_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "entitlement_kind" NOT NULL,
	"remaining" integer NOT NULL,
	"source_order_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"from_stage" "funnel_stage",
	"to_stage" "funnel_stage" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender" "sender" NOT NULL,
	"author_admin_id" uuid,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"external_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"service_code" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"card_number" text,
	"card_holder" text,
	"ref_code" text NOT NULL,
	"provider" "payment_provider" DEFAULT 'manual_card' NOT NULL,
	"status" "order_status" DEFAULT 'kutilmoqda' NOT NULL,
	"receipt_file_id" text,
	"receipt_sha256" text,
	"receipt_at" timestamp with time zone,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"card_number" text NOT NULL,
	"holder_name" text NOT NULL,
	"card_type" text DEFAULT 'humo' NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_code" text NOT NULL,
	"old_amount_minor" bigint,
	"new_amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"title" text NOT NULL,
	"note" text,
	"due_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" "service_kind" NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"client_type" "client_type",
	"grants_kind" "entitlement_kind",
	"grants_qty" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "channel" DEFAULT 'telegram' NOT NULL,
	"external_id" text NOT NULL,
	"username" text,
	"full_name" text,
	"phone" text,
	"locale" "locale" DEFAULT 'uz_latn' NOT NULL,
	"locale_chosen_at" timestamp with time zone,
	"client_type" "client_type",
	"free_question_used_at" timestamp with time zone,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"referred_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_answers" ADD CONSTRAINT "ai_answers_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_answers" ADD CONSTRAINT "ai_answers_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_cards" ADD CONSTRAINT "case_cards_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_admins_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_approved_by_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_admin_id_admins_id_fk" FOREIGN KEY ("author_admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_code_services_code_fk" FOREIGN KEY ("service_code") REFERENCES "public"."services"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_confirmed_by_admins_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_service_code_services_code_fk" FOREIGN KEY ("service_code") REFERENCES "public"."services"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_admins_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ai_answers_conversation_idx" ON "ai_answers" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "entitlements_user_idx" ON "entitlements" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "funnel_events_created_idx" ON "funnel_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_ref_code_idx" ON "orders" USING btree ("ref_code");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_receipt_sha_idx" ON "orders" USING btree ("receipt_sha256");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("due_at","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_channel_external_idx" ON "users" USING btree ("channel","external_id");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");