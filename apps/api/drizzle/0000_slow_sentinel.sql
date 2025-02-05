CREATE TYPE "public"."cat_activity" AS ENUM('sleeping', 'eating', 'grooming', 'playing', 'loafing', 'knocking_things', 'box_sitting', 'scratching', 'hunting', 'zooming', 'keyboard_walking', 'screen_blocking', 'judging_humans', 'making_content', 'photoshoot');--> statement-breakpoint
CREATE TYPE "public"."cat_emotion" AS ENUM('annoyed', 'curious', 'happy', 'sad', 'angry', 'scared', 'excited', 'sleepy', 'smug', 'sassy', 'grumpy', 'derpy', 'judgy', 'mischievous', 'hungry', 'energetic', 'lazy', 'comfy', 'zoomies', 'affectionate', 'aloof', 'attention_seeking', 'suspicious', 'playful', 'content', 'confused');--> statement-breakpoint
CREATE TYPE "public"."favorite_spot" AS ENUM('keyboard', 'laptop', 'box', 'windowsill', 'bed', 'couch', 'high_shelf', 'paper_bag', 'sunny_spot', 'gaming_chair', 'kitchen');--> statement-breakpoint
CREATE TYPE "public"."input_validation_status" AS ENUM('VALID', 'INVALID', 'NOT_CHECKED');--> statement-breakpoint
CREATE TYPE "public"."interaction_status" AS ENUM('PENDING', 'PROCESSING', 'VALIDATION_FAILED', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('AUTONOMOUS_THOUGHT', 'PET', 'FEED', 'PLAY', 'CHAT');--> statement-breakpoint
CREATE TYPE "public"."thought_type" AS ENUM('REFLECTION', 'DESIRE', 'OBSERVATION');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('TOY', 'FOOD', 'FURNITURE');--> statement-breakpoint
CREATE TYPE "public"."transaction_category" AS ENUM('INTERACTION', 'SHOP', 'REWARD', 'DAILY_BONUS');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('EARNED', 'SPENT');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('ETHEREUM');--> statement-breakpoint
CREATE TABLE "cat_activities" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"cat_id" varchar(255) NOT NULL,
	"activity" "cat_activity" NOT NULL,
	"location" "favorite_spot" NOT NULL,
	"description" text NOT NULL,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"end_time" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cat_interactions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"cat_id" varchar(255) NOT NULL,
	"user_item_id" varchar(255),
	"type" "interaction_type" NOT NULL,
	"status" "interaction_status" DEFAULT 'PENDING' NOT NULL,
	"cost" numeric NOT NULL,
	"input" text,
	"processed_input" text,
	"output" text,
	"output_emotion" "cat_emotion"[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_memories" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"cat_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"interaction_id" varchar(255),
	"thought_id" varchar(255),
	"memory" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cats" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"hunger" integer NOT NULL,
	"happiness" integer NOT NULL,
	"energy" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_thoughts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"cat_id" varchar(255) NOT NULL,
	"type" "thought_type" NOT NULL,
	"content" text NOT NULL,
	"emotion" "cat_emotion"[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_user_affections" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"cat_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"affection" numeric NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"interaction_id" varchar(255),
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
	"type" "wallet_type" NOT NULL,
	"chain_id" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cat_activities" ADD CONSTRAINT "cat_activities_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_interactions" ADD CONSTRAINT "cat_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_interactions" ADD CONSTRAINT "cat_interactions_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_interactions" ADD CONSTRAINT "cat_interactions_user_item_id_user_items_id_fk" FOREIGN KEY ("user_item_id") REFERENCES "public"."user_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_memories" ADD CONSTRAINT "cat_memories_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_memories" ADD CONSTRAINT "cat_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_memories" ADD CONSTRAINT "cat_memories_interaction_id_cat_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."cat_interactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_memories" ADD CONSTRAINT "cat_memories_thought_id_cat_thoughts_id_fk" FOREIGN KEY ("thought_id") REFERENCES "public"."cat_thoughts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_thoughts" ADD CONSTRAINT "cat_thoughts_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_user_affections" ADD CONSTRAINT "cat_user_affections_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_user_affections" ADD CONSTRAINT "cat_user_affections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_interaction_id_cat_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."cat_interactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_cat_user" ON "cat_user_affections" USING btree ("cat_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cat_user_affections_affection_idx" ON "cat_user_affections" USING btree ("affection");--> statement-breakpoint
CREATE UNIQUE INDEX "normalized_email_idx" ON "users" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_address_chain_idx" ON "wallets" USING btree ("address","chain_id");