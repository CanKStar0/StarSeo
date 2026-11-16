import { queryOptions } from "@tanstack/react-query";
import {
  getUnreadBriefingCount,
  getWeeklyBriefings,
} from "@/serverFunctions/weeklyBriefings";

export const weeklyBriefingKeys = {
  all: ["weekly-briefings"] as const,
  list: (projectId?: string) =>
    ["weekly-briefings", "list", projectId ?? "all"] as const,
  unreadCount: () => ["weekly-briefings", "unread-count"] as const,
};

export function weeklyBriefingsQueryOptions(projectId?: string) {
  return queryOptions({
    queryKey: weeklyBriefingKeys.list(projectId),
    queryFn: () => getWeeklyBriefings({ data: { projectId } }),
  });
}

export function unreadBriefingCountQueryOptions() {
  return queryOptions({
    queryKey: weeklyBriefingKeys.unreadCount(),
    queryFn: () => getUnreadBriefingCount(),
    staleTime: 60_000,
  });
}
