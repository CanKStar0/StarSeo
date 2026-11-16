import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ClipboardCheck,
  ExternalLink,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader, SectionHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  weeklyBriefingKeys,
  weeklyBriefingsQueryOptions,
} from "@/client/features/weekly-briefings/weeklyBriefingQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { pageHead } from "@/client/lib/pageHead";
import {
  generateWeeklyBriefingsNow,
  markAllWeeklyBriefingsRead,
  markWeeklyBriefingRead,
  setWeeklyBriefingPreference,
} from "@/serverFunctions/weeklyBriefings";

export const Route = createFileRoute("/_app/briefings")({
  head: () => pageHead("Weekly Briefings"),
  component: WeeklyBriefingsPage,
});

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

function formatPct(value: number | null | undefined, suffix = "%"): string {
  if (value === null || value === undefined) return "—";
  return `${value}${suffix}`;
}

function DeltaBadge({
  value,
  invert = false,
  suffix = "",
}: {
  value: number | null | undefined;
  invert?: boolean;
  suffix?: string;
}) {
  if (value === null || value === undefined || value === 0) return null;
  const isPositive = invert ? value < 0 : value > 0;
  const sign = value > 0 ? "+" : "";
  return (
    <Badge variant={isPositive ? "default" : "destructive"} size="sm">
      {sign}
      {value}
      {suffix}
    </Badge>
  );
}

function WeeklyBriefingsPage() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = React.useState<
    string | undefined
  >(undefined);

  const query = useQuery(weeklyBriefingsQueryOptions(selectedProjectId));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: weeklyBriefingKeys.all });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateWeeklyBriefingsNow({ data: { projectId: selectedProjectId } }),
    onSuccess: (res) => {
      toast.success(
        res.generated > 0
          ? `${res.generated} domain için haftalık özet güncellendi (${res.weekKey}).`
          : "Özet oluşturulacak aktif domain bulunamadı.",
      );
      void invalidate();
    },
    onError: (err) => toast.error(getStandardErrorMessage(err)),
  });

  const markReadMutation = useMutation({
    mutationFn: (briefingId: string) =>
      markWeeklyBriefingRead({ data: { briefingId } }),
    onSuccess: () => void invalidate(),
    onError: (err) => toast.error(getStandardErrorMessage(err)),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      markAllWeeklyBriefingsRead({ data: { projectId: selectedProjectId } }),
    onSuccess: () => {
      toast.success("Tüm bildirimler okundu olarak işaretlendi.");
      void invalidate();
    },
    onError: (err) => toast.error(getStandardErrorMessage(err)),
  });

  const togglePrefMutation = useMutation({
    mutationFn: ({
      projectId,
      enabled,
    }: {
      projectId: string;
      enabled: boolean;
    }) => setWeeklyBriefingPreference({ data: { projectId, enabled } }),
    onSuccess: (_res, vars) => {
      toast.success(
        vars.enabled
          ? "Haftalık bilgilendirme açıldı."
          : "Haftalık bilgilendirme duraklatıldı.",
      );
      void invalidate();
    },
    onError: (err) => toast.error(getStandardErrorMessage(err)),
  });

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Weekly Briefings"
          description="Her hafta tüm domainleriniz için sıralama, AI görünürlük, teknik audit ve trafik özeti."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {query.data && query.data.unreadCount > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  <CheckCheck data-icon="inline-start" />
                  Tümünü okundu işaretle ({query.data.unreadCount})
                </Button>
              ) : null}
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={generateMutation.isPending ? "animate-spin" : ""}
                />
                Bu Haftayı Şimdi Oluştur
              </Button>
            </div>
          }
        />

        <QueryState
          query={query}
          errorFallback="Haftalık özetler yüklenemedi."
        >
          {(data) => (
            <div className="space-y-6">
              {data.preferences.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Domain Bildirim Ayarları
                    </CardTitle>
                    <CardDescription>
                      Domain bazında filtreleyin veya haftalık otomatik özeti
                      açıp kapatın.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={
                        selectedProjectId === undefined ? "default" : "outline"
                      }
                      onClick={() => setSelectedProjectId(undefined)}
                    >
                      Tüm Domainler ({data.preferences.length})
                    </Button>
                    {data.preferences.map((pref) => (
                      <div
                        key={pref.projectId}
                        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProjectId(
                              selectedProjectId === pref.projectId
                                ? undefined
                                : pref.projectId,
                            )
                          }
                          className={`text-sm font-medium transition-colors ${
                            selectedProjectId === pref.projectId
                              ? "text-primary"
                              : "text-foreground hover:text-primary"
                          }`}
                        >
                          {pref.domain ?? pref.projectName}
                        </button>
                        <button
                          type="button"
                          aria-label={`${pref.domain ?? pref.projectName} haftalık bildirim`}
                          onClick={() =>
                            togglePrefMutation.mutate({
                              projectId: pref.projectId,
                              enabled: !pref.enabled,
                            })
                          }
                          disabled={togglePrefMutation.isPending}
                          className={`ml-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                            pref.enabled
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {pref.enabled ? "Aktif" : "Kapalı"}
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {data.briefings.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="Henüz haftalık özet yok"
                  description="Otomatik özetler her Pazartesi oluşturulur. Hemen görmek için 'Bu Haftayı Şimdi Oluştur' butonunu kullanabilirsiniz."
                  action={
                    <Button
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                    >
                      <RefreshCw data-icon="inline-start" />
                      İlk Özeti Oluştur
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  <SectionHeader
                    title="Haftalık Domain Özetleri"
                    hint="En güncel haftadan eskiye doğru sıralanmıştır."
                  />
                  {data.briefings.map((b) => {
                    const isUnread = b.readAt === null;
                    return (
                      <Card
                        key={b.id}
                        className={isUnread ? "border-primary/40" : undefined}
                      >
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {isUnread ? (
                                <span
                                  className="size-2 rounded-full bg-primary"
                                  aria-label="Okunmadı"
                                />
                              ) : null}
                              <CardTitle className="text-lg">
                                {b.domain ?? b.projectName}
                              </CardTitle>
                              <Badge variant="secondary" size="sm">
                                {b.weekKey}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {b.periodStart} → {b.periodEnd}
                              </span>
                              {b.status === "partial" ? (
                                <Badge variant="outline" size="sm">
                                  Kısmi veri
                                </Badge>
                              ) : null}
                            </div>
                            <CardDescription>{b.projectName}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUnread ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markReadMutation.mutate(b.id)}
                                disabled={markReadMutation.isPending}
                              >
                                Okundu işaretle
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              render={
                                <Link
                                  to="/p/$projectId"
                                  params={{ projectId: b.projectId }}
                                />
                              }
                            >
                              Panele Git
                              <ExternalLink data-icon="inline-end" />
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {/* Rank Tracking */}
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <TrendingUp className="size-3.5" />
                              Rank Tracking
                            </div>
                            {b.rankTrackedKeywords !== null ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-semibold">
                                    {b.rankAvgPosition !== null
                                      ? `#${b.rankAvgPosition}`
                                      : "—"}
                                  </span>
                                  <DeltaBadge
                                    value={b.rankAvgPositionDelta}
                                    invert
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatNumber(b.rankTrackedKeywords)} kelime ·{" "}
                                  {formatNumber(b.rankTop10Count)} Top 10 · ↑
                                  {formatNumber(b.rankImprovedCount)} / ↓
                                  {formatNumber(b.rankDeclinedCount)}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Aktif rank takibi yok
                              </p>
                            )}
                          </div>

                          {/* AI Visibility */}
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Sparkles className="size-3.5" />
                              AI Visibility
                            </div>
                            {b.aiPromptsTracked !== null ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-semibold">
                                    {formatPct(b.aiMentionRate)}
                                  </span>
                                  <DeltaBadge
                                    value={b.aiMentionRateDelta}
                                    suffix=" puan"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatNumber(b.aiPromptsTracked)} prompt ·
                                  Atıf: {formatPct(b.aiCitationRate)}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                AI görünürlük takibi yok
                              </p>
                            )}
                          </div>

                          {/* Site Audit */}
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <ClipboardCheck className="size-3.5" />
                              Teknik SEO / Audit
                            </div>
                            {b.auditId ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-semibold">
                                    {b.auditCriticalIssues ?? 0} kritik
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {b.auditWarningIssues ?? 0} uyarı
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatNumber(b.auditPagesCrawled)} sayfa ·
                                  Perf:{" "}
                                  {b.auditAvgPerformanceScore !== null
                                    ? b.auditAvgPerformanceScore
                                    : "—"}{" "}
                                  · SEO:{" "}
                                  {b.auditAvgSeoScore !== null
                                    ? b.auditAvgSeoScore
                                    : "—"}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Tamamlanmış audit yok
                              </p>
                            )}
                          </div>

                          {/* GSC & GA4 */}
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                            <div className="text-xs font-medium text-muted-foreground">
                              GSC & GA4 Trafik
                            </div>
                            {b.gscConnected || b.ga4Connected ? (
                              <div className="space-y-1 text-xs">
                                {b.gscConnected ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">
                                      GSC Tıklama:
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                      {formatNumber(b.gscClicks)}
                                      <DeltaBadge
                                        value={b.gscClicksDeltaPct}
                                        suffix="%"
                                      />
                                    </span>
                                  </div>
                                ) : null}
                                {b.ga4Connected ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">
                                      GA4 Oturum:
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                      {formatNumber(b.ga4Sessions)}
                                      <DeltaBadge
                                        value={b.ga4SessionsDeltaPct}
                                        suffix="%"
                                      />
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                GSC / GA4 bağlı değil
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
}
