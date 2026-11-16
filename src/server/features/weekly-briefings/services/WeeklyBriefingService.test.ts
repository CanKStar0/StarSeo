import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listEligibleProjectsForWeek: vi.fn(),
  listOrganizationProjects: vi.fn(),
  upsertBriefing: vi.fn(),
  getConfigsForProject: vi.fn(),
  getLatestAuditForProject: vi.fn(),
  getGscConnection: vi.fn(),
  getGa4Connection: vi.fn(),
  loadAiTrend: vi.fn(),
  dbSelectWhere: vi.fn(),
}));

vi.mock(
  "@/server/features/weekly-briefings/repositories/WeeklyBriefingRepository",
  () => ({
    WeeklyBriefingRepository: {
      listEligibleProjectsForWeek: mocks.listEligibleProjectsForWeek,
      listOrganizationProjects: mocks.listOrganizationProjects,
      upsertBriefing: mocks.upsertBriefing,
    },
  }),
);

vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({
    RankTrackingRepository: {
      getConfigsForProject: mocks.getConfigsForProject,
    },
  }),
);

vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: {
    getLatestAuditForProject: mocks.getLatestAuditForProject,
  },
}));

vi.mock(
  "@/server/features/gsc/repositories/GscConnectionRepository",
  () => ({
    GscConnectionRepository: {
      getByProjectId: mocks.getGscConnection,
    },
  }),
);

vi.mock(
  "@/server/features/ga4/repositories/Ga4ConnectionRepository",
  () => ({
    Ga4ConnectionRepository: {
      getByProjectId: mocks.getGa4Connection,
    },
  }),
);

vi.mock(
  "@/server/features/ai-visibility/services/aiVisibilityTrend",
  () => ({
    loadAiTrend: mocks.loadAiTrend,
  }),
);

vi.mock("cloudflare:workers", () => ({ env: {} }));

vi.mock("@/db/schema", () => ({
  aiTrackers: { id: "id", projectId: "projectId" },
  aiPrompts: { id: "id", trackerId: "trackerId", archived: "archived" },
  auditLighthouseResults: {
    performanceScore: "performanceScore",
    seoScore: "seoScore",
    auditId: "auditId",
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: mocks.dbSelectWhere,
        }),
        where: mocks.dbSelectWhere,
      }),
    }),
  },
}));

import {
  getIsoWeekWindow,
  WeeklyBriefingService,
} from "./WeeklyBriefingService";

describe("WeeklyBriefingService", () => {
  beforeEach(() => {
    mocks.listEligibleProjectsForWeek.mockResolvedValue([]);
    mocks.listOrganizationProjects.mockResolvedValue([]);
    mocks.upsertBriefing.mockResolvedValue(undefined);
    mocks.getConfigsForProject.mockResolvedValue([]);
    mocks.getLatestAuditForProject.mockResolvedValue(null);
    mocks.getGscConnection.mockResolvedValue(null);
    mocks.getGa4Connection.mockResolvedValue(null);
    mocks.loadAiTrend.mockResolvedValue({
      mentions: { current: null, change: null },
      citations: { current: null },
      runs: [],
    });
    mocks.dbSelectWhere.mockResolvedValue([]);
  });

  it("computes ISO week key and 7-day comparison window", () => {
    const window = getIsoWeekWindow(new Date("2026-11-16T08:00:00.000Z"));
    expect(window.weekKey).toBe("2026-W47");
    expect(window.periodStart).toBe("2026-11-10");
    expect(window.periodEnd).toBe("2026-11-16");
    expect(window.prevStart).toBe("2026-11-03");
    expect(window.prevEnd).toBe("2026-11-09");
  });

  it("skips scheduled generation on Monday before 06:00 UTC", async () => {
    const result = await WeeklyBriefingService.runScheduledWeeklyBriefings(
      new Date("2026-11-16T05:30:00.000Z"),
    );
    expect(result).toEqual({ generated: 0 });
    expect(mocks.listEligibleProjectsForWeek).not.toHaveBeenCalled();
  });

  it("generates briefings for eligible projects after Monday 06:00 UTC", async () => {
    mocks.listEligibleProjectsForWeek.mockResolvedValue([
      {
        id: "proj_1",
        organizationId: "org_1",
        name: "Example",
        domain: "example.com",
      },
    ]);

    const result = await WeeklyBriefingService.runScheduledWeeklyBriefings(
      new Date("2026-11-16T07:00:00.000Z"),
    );

    expect(result).toEqual({ generated: 1, weekKey: "2026-W47" });
    expect(mocks.upsertBriefing).toHaveBeenCalledTimes(1);
    expect(mocks.upsertBriefing).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_1",
        organizationId: "org_1",
        weekKey: "2026-W47",
        status: "ready",
        readAt: null,
      }),
    );
  });
});
