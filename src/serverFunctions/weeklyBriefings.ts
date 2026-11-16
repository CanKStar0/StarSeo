import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { WeeklyBriefingService } from "@/server/features/weekly-briefings/services/WeeklyBriefingService";
import {
  requireAuthenticatedContext,
  requireProjectContext,
} from "@/serverFunctions/middleware";

const listBriefingsSchema = z.object({
  projectId: z.string().min(1).optional(),
});

const markReadSchema = z.object({
  briefingId: z.string().min(1),
});

const markAllReadSchema = z.object({
  projectId: z.string().min(1).optional(),
});

const setPreferenceSchema = z.object({
  projectId: z.string().min(1),
  enabled: z.boolean(),
});

const generateNowSchema = z.object({
  projectId: z.string().min(1).optional(),
});

export const getWeeklyBriefings = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(listBriefingsSchema)
  .handler(async ({ data, context }) =>
    WeeklyBriefingService.listForOrganization(context.organizationId, {
      projectId: data.projectId,
    }),
  );

export const getUnreadBriefingCount = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => ({
    unreadCount: await WeeklyBriefingService.getUnreadCount(
      context.organizationId,
    ),
  }));

export const markWeeklyBriefingRead = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(markReadSchema)
  .handler(async ({ data, context }) => {
    await WeeklyBriefingService.markAsRead(
      context.organizationId,
      data.briefingId,
    );
    return { ok: true };
  });

export const markAllWeeklyBriefingsRead = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(markAllReadSchema)
  .handler(async ({ data, context }) => {
    await WeeklyBriefingService.markAllAsRead(
      context.organizationId,
      data.projectId,
    );
    return { ok: true };
  });

export const setWeeklyBriefingPreference = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(setPreferenceSchema)
  .handler(async ({ data, context }) => {
    await WeeklyBriefingService.setProjectEnabled(
      context.projectId,
      context.organizationId,
      data.enabled,
    );
    return { ok: true };
  });

export const generateWeeklyBriefingsNow = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(generateNowSchema)
  .handler(async ({ data, context }) =>
    WeeklyBriefingService.generateNowForOrganization(
      context.organizationId,
      data.projectId,
    ),
  );
