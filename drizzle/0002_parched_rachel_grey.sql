ALTER TABLE "transfer" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "transfer" ADD COLUMN "sender_online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transfer" ADD COLUMN "downloads_completed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transfer" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "transfer" ADD CONSTRAINT "transfer_code_unique" UNIQUE("code");