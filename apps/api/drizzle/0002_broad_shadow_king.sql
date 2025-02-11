DROP INDEX "wallet_address_chain_idx";--> statement-breakpoint
ALTER TABLE "battle_rounds" ADD COLUMN "winner_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN "created_by" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_battle_stats" ADD COLUMN "created_by" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "battle_rounds" ADD CONSTRAINT "battle_rounds_winner_id_robots_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_battle_stats" ADD CONSTRAINT "user_battle_stats_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_address_idx" ON "wallets" USING btree ("address");--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN "chain_id";--> statement-breakpoint
DROP TYPE "public"."wallet_type";