CREATE TYPE "public"."log_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."steps" AS ENUM('metadata', 'transcode');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "processing_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"step" "steps" NOT NULL,
	"status" "log_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"data" jsonb,
	"error" text,
	"resolution" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processing_logs_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "processing" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid NOT NULL,
	"status" "processing_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	CONSTRAINT "processing_videoId_unique" UNIQUE("video_id")
);
