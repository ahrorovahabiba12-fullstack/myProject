import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sparkles, Flame, BarChart3 } from "lucide-react";
import { progressApi, consistencyApi, studyAnalyticsApi } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";

type Overview = {
  daily: { date: string; studyMinutes: number; completedTasks: number }[];
  quizHistory: { subjectCode: string; subjectName: string; score: number; attemptDate: string }[];
  subjectLevels: { subjectCode: string; subjectName: string; level: string; score: number }[];
};
type Analysis = { improvement: string; weakPoints: string[]; nextSteps: string[] };

export default function Progress() {
  const { t } = useTranslation();
  const overview = useQuery<Overview>({ queryKey: ["progress-overview"], queryFn: progressApi.getOverview });
  const consistency = useQuery({ queryKey: ["consistency-score"], queryFn: consistencyApi.getScore });
  const stats = useQuery({ queryKey: ["study-stats"], queryFn: studyAnalyticsApi.getStats });
  const recommendation = useQuery({
    queryKey: ["study-recommendation"],
    queryFn: studyAnalyticsApi.getRecommendation,
  });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      setAnalysis(await progressApi.analyze());
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = (overview.data?.daily ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" }),
    minutes: d.studyMinutes,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("progress.title")}</h1>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Flame size={18} className="text-brand-500" />
          <p className="font-semibold">{t("progress.consistencyTitle")}</p>
        </div>
        {consistency.isLoading ? (
          <Skeleton className="h-16" />
        ) : consistency.isError ? (
          <ErrorState message={t("progress.consistencyError")} onRetry={() => consistency.refetch()} />
        ) : (
          <div className="flex items-center gap-6">
            <p className="text-4xl font-extrabold text-brand-600">
              {consistency.data?.score}
              <span className="text-lg text-[var(--text-secondary)] font-medium">%</span>
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("progress.consistencyDesc", {
                active: consistency.data?.activeDays,
                planned: consistency.data?.plannedDays,
              })}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-brand-500" />
          <p className="font-semibold">{t("progress.studyStatsTitle")}</p>
        </div>
        {stats.isLoading ? (
          <Skeleton className="h-32" />
        ) : stats.isError ? (
          <ErrorState message={t("progress.studyStatsError")} onRetry={() => stats.refetch()} />
        ) : !stats.data || stats.data.sessionCount === 0 ? (
          <EmptyState title={t("progress.studyStatsEmptyTitle")} description={t("progress.studyStatsEmptyDesc")} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-extrabold text-brand-600">{stats.data.actualMinutes}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t("progress.actualMinutes")}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-brand-600">{stats.data.sessionCount}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t("progress.sessionCount")}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-brand-600">{stats.data.avgSessionMinutes}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t("progress.avgSessionMinutes")}</p>
              </div>
            </div>

            {stats.data.subjectBreakdown.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{t("progress.subjectBreakdown")}</p>
                <div className="flex flex-col gap-2">
                  {stats.data.subjectBreakdown.map((s) => (
                    <div key={s.subjectId} className="flex items-center justify-between text-sm">
                      <span>{s.subjectName}</span>
                      <span className="text-[var(--text-secondary)]">
                        {s.sessionCount} {t("progress.sessions")} · {s.minutes} {t("progress.minutes")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendation.data?.recommendation && (
              <p className="text-sm text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-3">
                💡 {recommendation.data.recommendation}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <p className="font-semibold mb-4">{t("progress.weeklyActivity")}</p>
        {overview.isLoading ? (
          <Skeleton className="h-56" />
        ) : chartData.length === 0 ? (
          <EmptyState title={t("progress.noActivityTitle")} description={t("progress.noActivityDesc")} />
        ) : (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="#6c3ffb" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <p className="font-semibold mb-4">{t("progress.levelsBySubject")}</p>
        {overview.isLoading ? (
          <Skeleton className="h-32" />
        ) : (overview.data?.subjectLevels ?? []).length === 0 ? (
          <EmptyState title={t("progress.noLevelsTitle")} description={t("progress.noLevelsDesc")} />
        ) : (
          <div className="flex flex-col gap-3">
            {overview.data!.subjectLevels.map((s) => (
              <div key={s.subjectCode} className="flex items-center gap-3">
                <span className="text-sm w-28 shrink-0">{s.subjectName}</span>
                <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-gradient" style={{ width: `${s.score}%` }} />
                </div>
                <span className="text-xs text-[var(--text-secondary)] w-10 text-right">{Math.round(s.score)}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-brand-500" />
          <p className="font-semibold">{t("progress.aiAnalysis")}</p>
        </div>
        {analysis ? (
          <div className="flex flex-col gap-3 text-sm">
            <p>{analysis.improvement}</p>
            {analysis.weakPoints.length > 0 && (
              <p>
                <span className="font-semibold">{t("progress.attentionNeeded")}</span> {analysis.weakPoints.join(", ")}
              </p>
            )}
            <ul className="list-disc list-inside text-[var(--text-secondary)]">
              {analysis.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        ) : (
          <Button onClick={runAnalysis} loading={analyzing} variant="secondary">
            {t("progress.analyzeButton")}
          </Button>
        )}
      </Card>
    </div>
  );
}
