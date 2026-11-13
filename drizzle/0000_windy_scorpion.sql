CREATE TYPE "public"."attempt_status" AS ENUM('awaiting_booking', 'booked', 'reschedule_required', 'passed', 'failed', 'retake_later', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."award_status" AS ENUM('active', 'nullified');--> statement-breakpoint
CREATE TYPE "public"."badge_level" AS ENUM('novice', 'specialist', 'expert', 'master', 'grand_master');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('active', 'completed', 'cancelled_by_student', 'cancelled_by_interviewer', 'cancelled_by_system', 'no_show_student');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('open', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'interviewer', 'team_admin');--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interviewer_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "slot_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slots_end_after_start_check" CHECK (end_at > start_at)
);
--> statement-breakpoint
CREATE TABLE "badge_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "award_status" DEFAULT 'active' NOT NULL,
	"nullified_at" timestamp with time zone,
	"nullified_by" uuid,
	"nullification_reason" text,
	CONSTRAINT "badge_awards_attempt_id_unique" UNIQUE("attempt_id"),
	CONSTRAINT "awards_nullified_fields_check" CHECK (status = 'active' OR (nullified_at IS NOT NULL AND nullification_reason IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"level" "badge_level" NOT NULL,
	"level_rank" smallint NOT NULL,
	"bonus_miles" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"interviewer_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'active' NOT NULL,
	"meeting_url" text NOT NULL,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "demo_meta" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"seeded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eligibilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text
);
--> statement-breakpoint
CREATE TABLE "interview_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"eligibility_id" uuid NOT NULL,
	"attempt_no" smallint NOT NULL,
	"status" "attempt_status" NOT NULL,
	"not_before" timestamp with time zone DEFAULT now() NOT NULL,
	"reschedule_count" smallint DEFAULT 0 NOT NULL,
	"outcome_reason" text,
	"outcome_notes" text,
	"outcome_recorded_by" uuid,
	"outcome_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_outcome_recorded_check" CHECK (status NOT IN ('passed', 'failed', 'retake_later') OR outcome_recorded_at IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_id" uuid,
	"template_key" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"cta_label" text,
	"cta_href" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tracks_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_attempt_id_interview_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."interview_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_nullified_by_users_id_fk" FOREIGN KEY ("nullified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_attempt_id_interview_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."interview_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_availability_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."availability_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibilities" ADD CONSTRAINT "eligibilities_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibilities" ADD CONSTRAINT "eligibilities_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_attempts" ADD CONSTRAINT "interview_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_attempts" ADD CONSTRAINT "interview_attempts_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_attempts" ADD CONSTRAINT "interview_attempts_eligibility_id_eligibilities_id_fk" FOREIGN KEY ("eligibility_id") REFERENCES "public"."eligibilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_attempts" ADD CONSTRAINT "interview_attempts_outcome_recorded_by_users_id_fk" FOREIGN KEY ("outcome_recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_attempt_id_interview_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."interview_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slots_interviewer_start_unique" ON "availability_slots" USING btree ("interviewer_id","start_at");--> statement-breakpoint
CREATE INDEX "slots_open_start_idx" ON "availability_slots" USING btree ("start_at") WHERE status = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "awards_student_badge_active_unique" ON "badge_awards" USING btree ("student_id","badge_id") WHERE status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "badges_track_level_unique" ON "badges" USING btree ("track_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_slot_active_unique" ON "bookings" USING btree ("slot_id") WHERE status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_student_active_unique" ON "bookings" USING btree ("student_id") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "bookings_interviewer_status_idx" ON "bookings" USING btree ("interviewer_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "eligibilities_active_unique" ON "eligibilities" USING btree ("student_id","badge_id") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_student_badge_attempt_no_unique" ON "interview_attempts" USING btree ("student_id","badge_id","attempt_no");--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_student_badge_open_unique" ON "interview_attempts" USING btree ("student_id","badge_id") WHERE status IN ('awaiting_booking', 'booked', 'reschedule_required');--> statement-breakpoint
CREATE INDEX "attempts_status_badge_idx" ON "interview_attempts" USING btree ("status","badge_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);