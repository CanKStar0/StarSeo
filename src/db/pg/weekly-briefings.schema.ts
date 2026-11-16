import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./better-auth-schema";
import { projects } from "./app.schema";

const isoNowPg = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const weeklyBriefingPreferences = pgTable(
  "weekly_briefing_preferences",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: text("updated_at").notNull().default(isoNowPg),
  },
  (table) => [
    index("weekly_briefing_preferences_org_idx").on(table.organizationId),
  ],
);

export const weeklyBriefings = pgTable(
  "weekly_briefings",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    weekKey: text("week_key").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    status: text("status", { enum: ["ready", "partial"] })
      .notNull()
      .default("ready"),
    readAt: text("read_at"),

    // Rank tracking
    rankTrackedKeywords: integer("rank_tracked_keywords"),
    rankAvgPosition: real("rank_avg_position"),
    rankAvgPositionDelta: real("rank_avg_position_delta"),
    rankImprovedCount: integer("rank_improved_count"),
    rankDeclinedCount: integer("rank_declined_count"),
    rankTop10Count: integer("rank_top10_count"),

    // AI visibility
    aiPromptsTracked: integer("ai_prompts_tracked"),
    aiMentionRate: real("ai_mention_rate"),
    aiMentionRateDelta: real("ai_mention_rate_delta"),
    aiCitationRate: real("ai_citation_rate"),

    // Site audit
    auditId: text("audit_id"),
    auditPagesCrawled: integer("audit_pages_crawled"),
    auditCriticalIssues: integer("audit_critical_issues"),
    auditWarningIssues: integer("audit_warning_issues"),
    auditAvgPerformanceScore: real("audit_avg_performance_score"),
    auditAvgSeoScore: real("audit_avg_seo_score"),

    // Google Search Console
    gscConnected: boolean("gsc_connected").notNull().default(false),
    gscClicks: integer("gsc_clicks"),
    gscClicksDeltaPct: real("gsc_clicks_delta_pct"),
    gscImpressions: integer("gsc_impressions"),
    gscImpressionsDeltaPct: real("gsc_impressions_delta_pct"),
    gscAvgPosition: real("gsc_avg_position"),

    // Google Analytics 4
    ga4Connected: boolean("ga4_connected").notNull().default(false),
    ga4Sessions: integer("ga4_sessions"),
    ga4SessionsDeltaPct: real("ga4_sessions_delta_pct"),
    ga4Users: integer("ga4_users"),
    ga4UsersDeltaPct: real("ga4_users_delta_pct"),

    createdAt: text("created_at").notNull().default(isoNowPg),
  },
  (table) => [
    uniqueIndex("weekly_briefings_project_week_idx").on(
      table.projectId,
      table.weekKey,
    ),
    index("weekly_briefings_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
