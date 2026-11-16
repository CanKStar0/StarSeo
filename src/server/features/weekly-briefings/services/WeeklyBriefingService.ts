import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { aiPrompts, aiTrackers, auditLighthouseResults } from "@/db/schema";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { getIssueTypePageCountsForAudit } from "@/server/features/audit/repositories/auditSummaryQueries";
import { loadAiTrend } from "@/server/features/ai-visibility/services/aiVisibilityTrend";
import { Ga4ConnectionRepository } from "@/server/features/ga4/repositories/Ga4ConnectionRepository";
import { Ga4OrganicOverviewService } from "@/server/features/ga4/services/Ga4OrganicOverviewService";
import { GscConnectionRepository } from "@/server/features/gsc/repositories/GscConnectionRepository";
import { GscService } from "@/server/features/gsc/services/GscService";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { getLatestResults } from "@/server/features/rank-tracking/services/rankTrackingResults";
import {
  WeeklyBriefingRepository,
  type EligibleBriefingProject,
  type NewWeeklyBriefingRow,
} from "../repositories/WeeklyBriefingRepository";

const DAY_MS = 86_400_000;

export type WeekWindow = {
  weekKey: string;
  periodStart: string;
  periodEnd: string;
  prevStart: string;
  prevEnd: string;
};

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO-8601 week key (e.g. "2026-W47") and 7-day comparison window. */
export function getIsoWeekWindow(now = new Date()): WeekWindow {
  const utc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7,
  );
  const weekKey = `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(end.getTime() - 6 * DAY_MS);
  const prevEnd = new Date(start.getTime() - DAY_MS);
  const prevStart = new Date(prevEnd.getTime() - 6 * DAY_MS);

  return {
    weekKey,
    periodStart: formatYmd(start),
    periodEnd: formatYmd(end),
    prevStart: formatYmd(prevStart),
    prevEnd: formatYmd(prevEnd),
  };
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

async function collectRankMetrics(projectId: string) {
  const configs = await RankTrackingRepository.getConfigsForProject(projectId);
  const activeConfigs = configs.filter((c) => c.isActive);
  if (activeConfigs.length === 0) {
    return {
      rankTrackedKeywords: null,
      rankAvgPosition: null,
      rankAvgPositionDelta: null,
      rankImprovedCount: null,
      rankDeclinedCount: null,
      rankTop10Count: null,
    };
  }

  let trackedKeywords = 0;
  let posSum = 0;
  let posCount = 0;
  let prevPosSum = 0;
  let prevPosCount = 0;
  let improvedCount = 0;
  let declinedCount = 0;
  let top10Count = 0;

  for (const config of activeConfigs) {
    const { rows } = await getLatestResults(config.id, projectId, "7d");
    trackedKeywords += rows.length;
    for (const row of rows) {
      const pos = row.desktop.position ?? row.mobile.position;
      const prev =
        row.desktop.previousPosition ?? row.mobile.previousPosition;
      if (pos !== null) {
        posSum += pos;
        posCount += 1;
        if (pos <= 10) top10Count += 1;
      }
      if (prev !== null) {
        prevPosSum += prev;
        prevPosCount += 1;
      }
      if (pos !== null && prev !== null) {
        if (pos < prev) improvedCount += 1;
        else if (pos > prev) declinedCount += 1;
      }
    }
  }

  const avgPos = posCount > 0 ? round1(posSum / posCount) : null;
  const prevAvgPos = prevPosCount > 0 ? prevPosSum / prevPosCount : null;
  const delta =
    avgPos !== null && prevAvgPos !== null
      ? round1(avgPos - prevAvgPos)
      : null;

  return {
    rankTrackedKeywords: trackedKeywords,
    rankAvgPosition: avgPos,
    rankAvgPositionDelta: delta,
    rankImprovedCount: improvedCount,
    rankDeclinedCount: declinedCount,
    rankTop10Count: top10Count,
  };
}

async function collectAiVisibilityMetrics(projectId: string) {
  const [promptRows, trend] = await Promise.all([
    db
      .select({ id: aiPrompts.id })
      .from(aiPrompts)
      .innerJoin(aiTrackers, eq(aiTrackers.id, aiPrompts.trackerId))
      .where(
        and(
          eq(aiTrackers.projectId, projectId),
          eq(aiPrompts.archived, false),
        ),
      ),
    loadAiTrend({ projectId, days: 7 }),
  ]);

  if (promptRows.length === 0 && trend.runs.length === 0) {
    return {
      aiPromptsTracked: null,
      aiMentionRate: null,
      aiMentionRateDelta: null,
      aiCitationRate: null,
    };
  }

  return {
    aiPromptsTracked: promptRows.length,
    aiMentionRate:
      trend.mentions.current !== null ? round1(trend.mentions.current) : null,
    aiMentionRateDelta:
      trend.mentions.change !== null ? round1(trend.mentions.change) : null,
    aiCitationRate:
      trend.citations.current !== null
        ? round1(trend.citations.current)
        : null,
  };
}

async function collectAuditMetrics(projectId: string) {
  const latest = await AuditRepository.getLatestAuditForProject(projectId);
  if (!latest || latest.status !== "completed") {
    return {
      auditId: null,
      auditPagesCrawled: null,
      auditCriticalIssues: null,
      auditWarningIssues: null,
      auditAvgPerformanceScore: null,
      auditAvgSeoScore: null,
    };
  }

  const [issueCounts, lhRows] = await Promise.all([
    getIssueTypePageCountsForAudit(latest.id),
    db
      .select({
        performanceScore: auditLighthouseResults.performanceScore,
        seoScore: auditLighthouseResults.seoScore,
      })
      .from(auditLighthouseResults)
      .where(
        and(
          eq(auditLighthouseResults.auditId, latest.id),
          isNotNull(auditLighthouseResults.performanceScore),
        ),
      ),
  ]);

  let critical = 0;
  let warning = 0;
  for (const item of issueCounts) {
    if (item.severity === "critical") critical += Number(item.pages);
    else if (item.severity === "warning") warning += Number(item.pages);
  }

  let perfSum = 0;
  let perfCount = 0;
  let seoSum = 0;
  let seoCount = 0;
  for (const row of lhRows) {
    if (row.performanceScore !== null) {
      perfSum += row.performanceScore;
      perfCount += 1;
    }
    if (row.seoScore !== null) {
      seoSum += row.seoScore;
      seoCount += 1;
    }
  }

  return {
    auditId: latest.id,
    auditPagesCrawled: latest.pagesCrawled,
    auditCriticalIssues: critical,
    auditWarningIssues: warning,
    auditAvgPerformanceScore:
      perfCount > 0 ? Math.round(perfSum / perfCount) : null,
    auditAvgSeoScore: seoCount > 0 ? Math.round(seoSum / seoCount) : null,
  };
}

async function collectGscMetrics(projectId: string, window: WeekWindow) {
  const conn = await GscConnectionRepository.getByProjectId(projectId);
  if (!conn) {
    return {
      ok: true,
      data: {
        gscConnected: false,
        gscClicks: null,
        gscClicksDeltaPct: null,
        gscImpressions: null,
        gscImpressionsDeltaPct: null,
        gscAvgPosition: null,
      },
    };
  }

  try {
    const [current, previous] = await Promise.all([
      GscService.getPerformance({
        projectId,
        startDate: window.periodStart,
        endDate: window.periodEnd,
        dimensions: ["date"],
      }),
      GscService.getPerformance({
        projectId,
        startDate: window.prevStart,
        endDate: window.prevEnd,
        dimensions: ["date"],
      }),
    ]);

    const sumRows = (rows: typeof current.rows) => {
      let clicks = 0;
      let impressions = 0;
      let weightedPos = 0;
      for (const r of rows) {
        clicks += r.clicks;
        impressions += r.impressions;
        weightedPos += r.position * r.impressions;
      }
      return {
        clicks,
        impressions,
        avgPosition:
          impressions > 0 ? round1(weightedPos / impressions) : null,
      };
    };

    const curr = sumRows(current.rows);
    const prev = sumRows(previous.rows);

    return {
      ok: true,
      data: {
        gscConnected: true,
        gscClicks: curr.clicks,
        gscClicksDeltaPct: pctDelta(curr.clicks, prev.clicks),
        gscImpressions: curr.impressions,
        gscImpressionsDeltaPct: pctDelta(curr.impressions, prev.impressions),
        gscAvgPosition: curr.avgPosition,
      },
    };
  } catch (err) {
    console.warn(`[weekly-briefing] GSC fetch failed for ${projectId}:`, err);
    return {
      ok: false,
      data: {
        gscConnected: true,
        gscClicks: null,
        gscClicksDeltaPct: null,
        gscImpressions: null,
        gscImpressionsDeltaPct: null,
        gscAvgPosition: null,
      },
    };
  }
}

async function collectGa4Metrics(projectId: string, window: WeekWindow) {
  const conn = await Ga4ConnectionRepository.getByProjectId(projectId);
  if (!conn) {
    return {
      ok: true,
      data: {
        ga4Connected: false,
        ga4Sessions: null,
        ga4SessionsDeltaPct: null,
        ga4Users: null,
        ga4UsersDeltaPct: null,
      },
    };
  }

  try {
    const overview = await Ga4OrganicOverviewService.getOrganicOverview({
      projectId,
      startDate: window.periodStart,
      endDate: window.periodEnd,
      trend: "weekly",
    });

    const sessionsComp = overview.comparison?.sessions;
    const usersComp = overview.comparison?.totalUsers;

    return {
      ok: true,
      data: {
        ga4Connected: true,
        ga4Sessions:
          typeof sessionsComp?.current === "number"
            ? Math.round(sessionsComp.current)
            : null,
        ga4SessionsDeltaPct:
          typeof sessionsComp?.percentChange === "number"
            ? round1(sessionsComp.percentChange * 100)
            : null,
        ga4Users:
          typeof usersComp?.current === "number"
            ? Math.round(usersComp.current)
            : null,
        ga4UsersDeltaPct:
          typeof usersComp?.percentChange === "number"
            ? round1(usersComp.percentChange * 100)
            : null,
      },
    };
  } catch (err) {
    console.warn(`[weekly-briefing] GA4 fetch failed for ${projectId}:`, err);
    return {
      ok: false,
      data: {
        ga4Connected: true,
        ga4Sessions: null,
        ga4SessionsDeltaPct: null,
        ga4Users: null,
        ga4UsersDeltaPct: null,
      },
    };
  }
}

async function buildBriefingRow(
  project: EligibleBriefingProject,
  window: WeekWindow,
): Promise<NewWeeklyBriefingRow> {
  const [rank, ai, audit, gsc, ga4] = await Promise.all([
    collectRankMetrics(project.id),
    collectAiVisibilityMetrics(project.id),
    collectAuditMetrics(project.id),
    collectGscMetrics(project.id, window),
    collectGa4Metrics(project.id, window),
  ]);

  const status = gsc.ok && ga4.ok ? "ready" : "partial";

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    organizationId: project.organizationId,
    weekKey: window.weekKey,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    status,
    readAt: null,
    ...rank,
    ...ai,
    ...audit,
    ...gsc.data,
    ...ga4.data,
    createdAt: new Date().toISOString(),
  };
}

export const WeeklyBriefingService = {
  async listForOrganization(
    organizationId: string,
    opts: { projectId?: string } = {},
  ) {
    const [briefings, preferences, unreadCount] = await Promise.all([
      WeeklyBriefingRepository.listForOrganization(organizationId, opts),
      WeeklyBriefingRepository.listPreferencesForOrganization(organizationId),
      WeeklyBriefingRepository.countUnreadForOrganization(organizationId),
    ]);

    return {
      briefings,
      preferences: preferences.map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        domain: p.domain,
        enabled: p.enabled ?? true,
      })),
      unreadCount,
    };
  },

  async getUnreadCount(organizationId: string) {
    return WeeklyBriefingRepository.countUnreadForOrganization(organizationId);
  },

  async markAsRead(organizationId: string, briefingId: string) {
    await WeeklyBriefingRepository.markAsRead(
      organizationId,
      briefingId,
      new Date().toISOString(),
    );
  },

  async markAllAsRead(organizationId: string, projectId?: string) {
    await WeeklyBriefingRepository.markAllAsRead(
      organizationId,
      new Date().toISOString(),
      projectId,
    );
  },

  async setProjectEnabled(
    projectId: string,
    organizationId: string,
    enabled: boolean,
  ) {
    await WeeklyBriefingRepository.upsertPreference(
      projectId,
      organizationId,
      enabled,
      new Date().toISOString(),
    );
  },

  async generateNowForOrganization(
    organizationId: string,
    projectId?: string,
  ) {
    const window = getIsoWeekWindow();
    const projects = await WeeklyBriefingRepository.listOrganizationProjects(
      organizationId,
      projectId,
    );

    let generated = 0;
    for (const project of projects) {
      const row = await buildBriefingRow(project, window);
      await WeeklyBriefingRepository.upsertBriefing(row);
      generated += 1;
    }

    return { generated, weekKey: window.weekKey };
  },

  /**
   * Called by the 5-minute cron in src/server.ts. Generates this week's
   * briefing for up to `limit` eligible projects per tick once Monday 06:00 UTC
   * has passed (so every domain gets its weekly briefing without bursting).
   */
  async runScheduledWeeklyBriefings(now = new Date(), limit = 15) {
    // Wait until Monday 06:00 UTC before generating the new ISO week's briefing.
    const day = now.getUTCDay();
    if (day === 1 && now.getUTCHours() < 6) {
      return { generated: 0 };
    }

    const window = getIsoWeekWindow(now);
    const eligible = await WeeklyBriefingRepository.listEligibleProjectsForWeek(
      window.weekKey,
      limit,
    );

    let generated = 0;
    for (const project of eligible) {
      try {
        const row = await buildBriefingRow(project, window);
        await WeeklyBriefingRepository.upsertBriefing(row);
        generated += 1;
      } catch (err) {
        console.error(
          `[weekly-briefing] Failed to build briefing for project ${project.id}:`,
          err,
        );
      }
    }

    return { generated, weekKey: window.weekKey };
  },
};
