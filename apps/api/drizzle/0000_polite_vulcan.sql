CREATE TYPE "public"."item_type" AS ENUM('CONSUMABLE', 'EQUIPMENT');--> statement-breakpoint
CREATE TYPE "public"."transaction_category" AS ENUM('INTERACTION', 'SHOP', 'REWARD', 'DAILY_BONUS');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('EARNED', 'SPENT');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."battle_room_status" AS ENUM('WAITING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."battle_status" AS ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."robot_class" AS ENUM('ASSAULT', 'DEFENSE', 'SUPPORT', 'STEALTH', 'HEAVY');--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"error" jsonb NOT NULL,
	"error_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(8) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "item_type" NOT NULL,
	"image_url" varchar(255) NOT NULL,
	"price" numeric NOT NULL,
	"effect" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"amount" numeric NOT NULL,
	"type" "transaction_type" NOT NULL,
	"category" "transaction_category" NOT NULL,
	"item_id" varchar(255),
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_items" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"item_id" varchar(255) NOT NULL,
	"quantity" numeric(10, 0) DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"normalized_email" varchar(255),
	"email_verified" boolean DEFAULT false,
	"hashed_password" varchar DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	"purrlons" numeric DEFAULT '0' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"address" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_robots" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"battle_id" varchar(255) NOT NULL,
	"robot_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_rounds" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"battle_id" varchar(255) NOT NULL,
	"round_number" integer NOT NULL,
	"description" text NOT NULL,
	"tactical_analysis" text NOT NULL,
	"image_url" text,
	"winner_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"status" "battle_status" NOT NULL,
	"winner_id" varchar(255),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"game_id" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robots" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"prompt" text NOT NULL,
	"image_url" text,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_battle_stats" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"selected_robot_id" varchar(255),
	"created_by" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_robots" ADD CONSTRAINT "battle_robots_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_robots" ADD CONSTRAINT "battle_robots_robot_id_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_rounds" ADD CONSTRAINT "battle_rounds_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_rounds" ADD CONSTRAINT "battle_rounds_winner_id_robots_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_id_robots_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "robots" ADD CONSTRAINT "robots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_battle_stats" ADD CONSTRAINT "user_battle_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_battle_stats" ADD CONSTRAINT "user_battle_stats_selected_robot_id_robots_id_fk" FOREIGN KEY ("selected_robot_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_battle_stats" ADD CONSTRAINT "user_battle_stats_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "normalized_email_idx" ON "users" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_address_idx" ON "wallets" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "user_battle_stats_user_id_idx" ON "user_battle_stats" USING btree ("user_id");