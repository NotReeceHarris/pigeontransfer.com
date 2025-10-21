ALTER TABLE "transfer" ALTER COLUMN "offer" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transfer" ADD COLUMN "virus_checked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transfer" DROP COLUMN "max_recipients";