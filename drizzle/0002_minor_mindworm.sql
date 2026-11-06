ALTER TABLE "admins" ADD COLUMN "failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "locked_until" timestamp with time zone;