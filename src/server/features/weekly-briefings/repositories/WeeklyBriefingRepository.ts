import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  weeklyBriefingPreferences,
  weeklyBriefings,
} from "@/db/schema";

export type WeeklyBriefingRow = typeof weeklyBriefings.$inferSelect;
export type NewWeeklyBriefingRow = typeof weeklyBriefings.$inferInsert;

export type WeeklyBriefingWithProject = WeeklyBriefingRow & {
  projectName: string;
  domain: string | null;
};

export type EligibleBriefingProject = {
  id: string;
  organizationId: string;
  name: string;
  domain: string;
};

export const WeeklyBriefingRepository = {
  async listForOrganization(
    organizationId: string,
    opts: { projectId?: string; limit?: number } = {},
  ): Promise<WeeklyBriefingWithProject[]> {
    const conditions = [
      eq(weeklyBriefings.organizationId, organizationId),
      isNull(projects.archivedAt),
    ];
    if (opts.projectId) {
      conditions.push(eq(weeklyBriefings.projectId, opts.projectId));
    }

    return db
      .select({
        id: weeklyBriefings.id,
        projectId: weeklyBriefings.projectId,
        organizationId: weeklyBriefings.organizationId,
        weekKey: weeklyBriefings.weekKey,
        periodStart: weeklyBriefings.periodStart,
        periodEnd: weeklyBriefings.periodEnd,
        status: weeklyBriefings.status,
        readAt: weeklyBriefings.readAt,
        rankTrackedKeywords: weeklyBriefings.rankTrackedKeywords,
        rankAvgPosition: weeklyBriefings.rankAvgPosition,
        rankAvgPositionDelta: weeklyBriefings.rankAvgPositionDelta,
        rankImprovedCount: weeklyBriefings.rankImprovedCount,
        rankDeclinedCount: weeklyBriefings.rankDeclinedCount,
        rankTop10Count: weeklyBriefings.rankTop10Count,
        aiPromptsTracked: weeklyBriefings.aiPromptsTracked,
        aiMentionRate: weeklyBriefings.aiMentionRate,
        aiMentionRateDelta: weeklyBriefings.aiMentionRateDelta,
        aiCitationRate: weeklyBriefings.aiCitationRate,
        auditId: weeklyBriefings.auditId,
        auditPagesCrawled: weeklyBriefings.auditPagesCrawled,
        auditCriticalIssues: weeklyBriefings.auditCriticalIssues,
        auditWarningIssues: weeklyBriefings.auditWarningIssues,
        auditAvgPerformanceScore: weeklyBriefings.auditAvgPerformanceScore,
        auditAvgSeoScore: weeklyBriefings.auditAvgSeoScore,
        gscConnected: weeklyBriefings.gscConnected,
        gscClicks: weeklyBriefings.gscClicks,
        gscClicksDeltaPct: weeklyBriefings.gscClicksDeltaPct,
        gscImpressions: weeklyBriefings.gscImpressions,
        gscImpressionsDeltaPct: weeklyBriefings.gscImpressionsDeltaPct,
        gscAvgPosition: weeklyBriefings.gscAvgPosition,
        ga4Connected: weeklyBriefings.ga4Connected,
        ga4Sessions: weeklyBriefings.ga4Sessions,
        ga4SessionsDeltaPct: weeklyBriefings.ga4SessionsDeltaPct,
        ga4Users: weeklyBriefings.ga4Users,
        ga4UsersDeltaPct: weeklyBriefings.ga4UsersDeltaPct,
        createdAt: weeklyBriefings.createdAt,
        projectName: projects.name,
        domain: projects.domain,
      })
      .from(weeklyBriefings)
      .innerJoin(projects, eq(projects.id, weeklyBriefings.projectId))
      .where(and(...conditions))
      .orderBy(desc(weeklyBriefings.periodEnd), desc(weeklyBriefings.createdAt))
      .limit(opts.limit ?? 100);
  },

  async countUnreadForOrganization(organizationId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(weeklyBriefings)
      .innerJoin(projects, eq(projects.id, weeklyBriefings.projectId))
      .where(
        and(
          eq(weeklyBriefings.organizationId, organizationId),
          isNull(weeklyBriefings.readAt),
          isNull(projects.archivedAt),
        ),
      );
    return Number(rows[0]?.count ?? 0);
  },

  async markAsRead(organizationId: string, briefingId: string, readAt: string) {
    await db
      .update(weeklyBriefings)
      .set({ readAt })
      .where(
        and(
          eq(weeklyBriefings.id, briefingId),
          eq(weeklyBriefings.organizationId, organizationId),
          isNull(weeklyBriefings.readAt),
        ),
      );
  },

  async markAllAsRead(
    organizationId: string,
    readAt: string,
    projectId?: string,
  ) {
    const conditions = [
      eq(weeklyBriefings.organizationId, organizationId),
      isNull(weeklyBriefings.readAt),
    ];
    if (projectId) {
      conditions.push(eq(weeklyBriefings.projectId, projectId));
    }
    await db
      .update(weeklyBriefings)
      .set({ readAt })
      .where(and(...conditions));
  },

  async listPreferencesForOrganization(organizationId: string) {
    return db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        domain: projects.domain,
        enabled: weeklyBriefingPreferences.enabled,
      })
      .from(projects)
      .leftJoin(
        weeklyBriefingPreferences,
        eq(weeklyBriefingPreferences.projectId, projects.id),
      )
      .where(
        and(
          eq(projects.organizationId, organizationId),
          isNull(projects.archivedAt),
          isNotNull(projects.domain),
        ),
      );
  },

  async upsertPreference(
    projectId: string,
    organizationId: string,
    enabled: boolean,
    updatedAt: string,
  ) {
    await db
      .insert(weeklyBriefingPreferences)
      .values({ projectId, organizationId, enabled, updatedAt })
      .onConflictDoUpdate({
        target: weeklyBriefingPreferences.projectId,
        set: { enabled, updatedAt },
      });
  },

  async listEligibleProjectsForWeek(
    weekKey: string,
    limit: number,
  ): Promise<EligibleBriefingProject[]> {
    const existingForWeek = await db
      .select({ projectId: weeklyBriefings.projectId })
      .from(weeklyBriefings)
      .where(eq(weeklyBriefings.weekKey, weekKey));

    const existingIds = new Set(existingForWeek.map((r) => r.projectId));

    const disabledPrefs = await db
      .select({ projectId: weeklyBriefingPreferences.projectId })
      .from(weeklyBriefingPreferences)
      .where(eq(weeklyBriefingPreferences.enabled, false));

    const disabledIds = new Set(disabledPrefs.map((r) => r.projectId));

    const candidates = await db
      .select({
        id: projects.id,
        organizationId: projects.organizationId,
        name: projects.name,
        domain: projects.domain,
      })
      .from(projects)
      .where(and(isNull(projects.archivedAt), isNotNull(projects.domain)));

    const eligible: EligibleBriefingProject[] = [];
    for (const row of candidates) {
      if (!row.domain) continue;
      if (existingIds.has(row.id) || disabledIds.has(row.id)) continue;
      eligible.push({
        id: row.id,
        organizationId: row.organizationId,
        name: row.name,
        domain: row.domain,
      });
      if (eligible.length >= limit) break;
    }
    return eligible;
  },

  async listOrganizationProjects(
    organizationId: string,
    projectId?: string,
  ): Promise<EligibleBriefingProject[]> {
    const conditions = [
      eq(projects.organizationId, organizationId),
      isNull(projects.archivedAt),
      isNotNull(projects.domain),
    ];
    if (projectId) {
      conditions.push(eq(projects.id, projectId));
    }

    const rows = await db
      .select({
        id: projects.id,
        organizationId: projects.organizationId,
        name: projects.name,
        domain: projects.domain,
      })
      .from(projects)
      .where(and(...conditions));

    return rows.filter(
      (r): r is EligibleBriefingProject => typeof r.domain === "string",
    );
  },

  async upsertBriefing(row: NewWeeklyBriefingRow) {
    const { id: _id, readAt: _readAt, ...updatable } = row;
    await db
      .insert(weeklyBriefings)
      .values(row)
      .onConflictDoUpdate({
        target: [weeklyBriefings.projectId, weeklyBriefings.weekKey],
        set: updatable,
      });
  },

  async findExistingWeeksForProjects(projectIds: string[], weekKey: string) {
    if (projectIds.length === 0) return new Set<string>();
    const rows = await db
      .select({ projectId: weeklyBriefings.projectId })
      .from(weeklyBriefings)
      .where(
        and(
          inArray(weeklyBriefings.projectId, projectIds),
          eq(weeklyBriefings.weekKey, weekKey),
        ),
      );
    return new Set(rows.map((r) => r.projectId));
  },
};
