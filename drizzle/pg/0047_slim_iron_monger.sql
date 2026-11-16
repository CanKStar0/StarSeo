CREATE TABLE "weekly_briefing_preferences" (
	"project_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_briefings" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"week_key" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"read_at" text,
	"rank_tracked_keywords" integer,
	"rank_avg_position" real,
	"rank_avg_position_delta" real,
	"rank_improved_count" integer,
	"rank_declined_count" integer,
	"rank_top10_count" integer,
	"ai_prompts_tracked" integer,
	"ai_mention_rate" real,
	"ai_mention_rate_delta" real,
	"ai_citation_rate" real,
	"audit_id" text,
	"audit_pages_crawled" integer,
	"audit_critical_issues" integer,
	"audit_warning_issues" integer,
	"audit_avg_performance_score" real,
	"audit_avg_seo_score" real,
	"gsc_connected" boolean DEFAULT false NOT NULL,
	"gsc_clicks" integer,
	"gsc_clicks_delta_pct" real,
	"gsc_impressions" integer,
	"gsc_impressions_delta_pct" real,
	"gsc_avg_position" real,
	"ga4_connected" boolean DEFAULT false NOT NULL,
	"ga4_sessions" integer,
	"ga4_sessions_delta_pct" real,
	"ga4_users" integer,
	"ga4_users_delta_pct" real,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weekly_briefing_preferences" ADD CONSTRAINT "weekly_briefing_preferences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_briefing_preferences" ADD CONSTRAINT "weekly_briefing_preferences_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_briefings" ADD CONSTRAINT "weekly_briefings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_briefings" ADD CONSTRAINT "weekly_briefings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weekly_briefing_preferences_org_idx" ON "weekly_briefing_preferences" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_briefings_project_week_idx" ON "weekly_briefings" USING btree ("project_id","week_key");--> statement-breakpoint
CREATE INDEX "weekly_briefings_org_created_idx" ON "weekly_briefings" USING btree ("organization_id","created_at");