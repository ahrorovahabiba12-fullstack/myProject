import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { Sparkles, Info, Sunrise, Check, Flame } from "lucide-react";
import { recommendationApi, dailyCoachApi, DashboardSummary } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import { DailyMotivation } from "../../components/dashboard/DailyMotivation";

import Studio from "./dashboards/Studio";

// More than 4 distinct subjects tested in one day is a genuinely strong
// showing — worth calling out, not just quietly logged.
const HIGH_ACTIVITY_SUBJECT_THRESHOLD = 4;

function DailyCoachCard() {
  const { t } = useTranslation();
  const dailyCoach = useQuery({ queryKey: ["daily-coach-today"], queryFn: dailyCoachApi.getToday });

  if (dailyCoach.isLoading) {
    return (
      <Card>
        <Skeleton className="h-20" />
      </Card>
    );
  }

  if (dailyCoach.isError) {
    return (
      <Card>
        <ErrorState message={t("dashboard.dailyCoachError")} onRetry={() => dailyCoach.refetch()} />
      </Card>
    );
  }

  if (!dailyCoach.data) {
    return (
      <Card>
        <EmptyState icon="☀️" title={t("dashboard.dailyCoachEmptyTitle")} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-2xl bg-amber-100 p-2.5 text-amber-600">
          <Sunrise size={20} />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg mb-1">{t("dashboard.dailyCoachTitle")}</h2>
          <p className="text-[var(--text-secondary)] mb-3">{dailyCoach.data.message}</p>
          {dailyCoach.data.recommendedActions.length > 0 && (
            <ul className="flex flex-col gap-1 mb-3">
              {dailyCoach.data.recommendedActions.map((action, i) => (
                <li key={i} className="text-sm text-[var(--text-secondary)]">
                  • {action}
                </li>
              ))}
            </ul>
          )}
          {dailyCoach.data.activeToday ? (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 animate-scale-in">
              <Check size={16} /> {t("dashboard.dailyCoachDone")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]">
              <Info size={14} /> {t("dashboard.dailyCoachNotYetActive")}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <Studio />
      <DashboardExtras />
    </div>
  );
}

/** Daily coach, AI insight and motivation, under the main dashboard. */
function DashboardExtras() {
  const { t } = useTranslation();
  const { dashboard } = useOutletContext<{ dashboard?: DashboardSummary }>();
  const recommendation = useQuery({ queryKey: ["recommendation-learning"], queryFn: recommendationApi.getLearning });

  return (
    <>
      {dashboard && dashboard.todaySubjectCount > HIGH_ACTIVITY_SUBJECT_THRESHOLD && (
        <Card className="flex items-center gap-4 py-3 bg-amber-50 border-amber-200 animate-scale-in">
          <span className="shrink-0 rounded-full bg-amber-100 p-2 text-amber-600">
            <Flame size={20} />
          </span>
          <p className="font-semibold text-sm text-amber-700">{t("dashboard.highActivityMessage", { count: dashboard.todaySubjectCount })}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <DailyCoachCard />

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-brand-500" />
              <h2 className="font-bold text-lg">{t("dashboard.aiInsight")}</h2>
            </div>
            {recommendation.isLoading ? (
              <Skeleton className="h-24" />
            ) : recommendation.data?.items?.length ? (
              <ul className="flex flex-col gap-2 mb-3">
                {recommendation.data.items.slice(0, 3).map((item, i) => (
                  <li key={i} className="text-sm text-[var(--text-secondary)]">
                    • {item.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] mb-3">{t("dashboard.noRecommendation")}</p>
            )}
            <Link to="/chat">
              <Button variant="secondary" className="w-full">
                {t("dashboard.discussWithAI")}
              </Button>
            </Link>
          </Card>
        </div>

        <DailyMotivation />
      </div>
    </>
  );
}
