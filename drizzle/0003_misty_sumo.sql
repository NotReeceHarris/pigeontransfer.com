ALTER TABLE "transfer" ADD COLUMN "offer" varchar(5000);--> statement-breakpoint
ALTER TABLE "transfer" ADD COLUMN "answer" varchar(5000);--> statement-breakpoint
ALTER TABLE "transfer" DROP COLUMN "sender_online";