ALTER TABLE "robots" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "robots" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_robot1_id_robots_id_fk" FOREIGN KEY ("robot1_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_robot2_id_robots_id_fk" FOREIGN KEY ("robot2_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;