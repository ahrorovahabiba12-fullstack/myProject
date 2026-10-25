import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { PlayCircle, Sparkles, Info, Sunrise, Check, Flame, Star, Flag, Trophy } from "lucide-react";
import { studentApi, scheduleApi, recommendationApi, dailyCoachApi, DashboardSummary } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import { DailyMotivation } from "../../components/dashboard/DailyMotivation";

// More than 4 distinct subjects tested in one day is a genuinely strong
// showing — worth calling out, not just quietly logged.
const HIGH_ACTIVITY_SUBJECT_THRESHOLD = 4;

/** Purely decorative — a graduation cap resting on a stack of books, drawn
 * in the app's own brand palette rather than a stock illustration. */
function HeroIllustration() {
  return (
    <svg width="180" height="160" viewBox="0 0 240 220" className="shrink-0 hidden sm:block" aria-hidden="true">
      <defs>
        <linearGradient id="heroBlobGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6c3ffb" />
          <stop offset="100%" stopColor="#4f6df5" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="120" r="105" fill="url(#heroBlobGrad)" opacity="0.12" />
      <circle cx="55" cy="180" r="30" fill="#8b6bff" opacity="0.18" />
      <circle cx="34" cy="55" r="5" fill="#f59e0b" />
      <circle cx="212" cy="70" r="4" fill="#6c3ffb" />
      <circle cx="203" cy="172" r="6" fill="#4f6df5" opacity="0.5" />
      <path d="M45 26 L48 34 L56 37 L48 40 L45 48 L42 40 L34 37 L42 34 Z" fill="#f59e0b" />
      <rect x="55" y="150" width="150" height="20" rx="6" fill="#4f6df5" />
      <rect x="70" y="130" width="120" height="18" rx="6" fill="#8b6bff" />
      <rect x="82" y="112" width="96" height="16" rx="6" fill="#ffffff" stroke="#cfc4ff" strokeWidth="2" />
      <polygon points="130,62 195,90 130,118 65,90" fill="#1a1533" />
      <circle cx="130" cy="90" r="6" fill="#6c3ffb" />
      <path d="M182 84 L188 118" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="188.5" cy="121" r="5" fill="#f59e0b" />
    </svg>
  );
}

function StatPill({ icon, iconBg, value, label }: { icon: React.ReactNode; iconBg: string; value: string | number; label: string }) {
  return (
    <Card className="flex items-center gap-3.5 py-3.5 pl-3.5">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xl font-extrabold leading-tight">{value}</p>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    </Card>
  );
}

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
        <div className="shrink-0 rounded-full bg-brand-100 p-2 text-brand-600">
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
  const { t } = useTranslation();
  const { dashboard } = useOutletContext<{ dashboard?: DashboardSummary }>();

  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const schedule = useQuery({ queryKey: ["schedule-current"], queryFn: scheduleApi.getCurrentWeek });
  const recommendation = useQuery({ queryKey: ["recommendation-learning"], queryFn: recommendationApi.getLearning });

  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayTasks = (schedule.data ?? []).filter((s) => s.dayOfWeek === todayDow);
  // Completed tasks (including ones auto-inserted by a quiz taken outside the
  // original plan) would otherwise just keep piling up here — once done,
  // there's nothing left to act on, so only pending ones stay actionable.
  const pendingTodayTasks = todayTasks.filter((task) => task.status !== "COMPLETED");
  const allDoneToday = todayTasks.length > 0 && pendingTodayTasks.length === 0;
  const todayTasksLabel = todayTasks.length > 0 ? `${todayTasks.length - pendingTodayTasks.length}/${todayTasks.length}` : "—";

  const weakestSubject = profile.data?.subjectLevels.length
    ? profile.data.subjectLevels.reduce((min, s) => (s.score < min.score ? s : min))
    : null;
  const suggestWeakestSubject = weakestSubject && weakestSubject.level !== "STRONG";

  return (
    <div className="flex flex-col gap-6">
      {/* HERO — greeting + a bit of decoration */}
      <Card className="flex items-center justify-between gap-6 py-8 bg-gradient-to-br from-brand-50 to-white">
        <div>
          <p className="text-xs font-extrabold tracking-wide uppercase text-brand-600 mb-1.5">{t("dashboard.welcomeEyebrow")}</p>
          <h1 className="text-[28px] font-extrabold mb-1.5 text-[#1a1530]">{t("dashboard.greeting", { name: dashboard?.fullName ?? profile.data?.fullName ?? "" })}</h1>
          <p className="text-[var(--text-secondary)]">{t("dashboard.subtitle")}</p>
        </div>
        <HeroIllustration />
      </Card>

      {/* Stat pills — always-visible summary rail */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatPill icon={<Flame size={20} className="text-amber-600" />} iconBg="bg-amber-100" value={dashboard?.streakDays ?? 0} label={t("dashboard.streakUnit")} />
        <StatPill icon={<Star size={20} className="text-brand-600" />} iconBg="bg-brand-100" value={dashboard?.points ?? 0} label={t("dashboard.pointsUnit")} />
        <StatPill icon={<Flag size={20} className="text-blue-600" />} iconBg="bg-blue-100" value={todayTasksLabel} label={t("dashboard.todayTasksUnit")} />
        <StatPill icon={<Trophy size={20} className="text-amber-600" />} iconBg="bg-amber-100" value={dashboard?.badgeCount ?? 0} label={t("dashboard.badgesUnit")} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT — main flow */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
          {dashboard && dashboard.todaySubjectCount > HIGH_ACTIVITY_SUBJECT_THRESHOLD && (
            <Card className="flex items-center gap-4 py-3 bg-amber-50 border-amber-200 animate-scale-in">
              <span className="shrink-0 rounded-full bg-amber-100 p-2 text-amber-600">
                <Flame size={20} />
              </span>
              <p className="font-semibold text-sm text-amber-700">
                {t("dashboard.highActivityMessage", { count: dashboard.todaySubjectCount })}
              </p>
            </Card>
          )}

          {/* Today's tasks */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{t("dashboard.today")}</h2>
              <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">{t("dashboard.aiBadge")}</span>
            </div>

            {schedule.isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : todayTasks.length === 0 ? (
              // Sunday is a rest day with no plan by design (see Schedule page).
              todayDow === 7 ? (
                <EmptyState icon="🌿" title={t("schedule.sundayEmptyTitle")} description={t("schedule.sundayEmptyDesc")} />
              ) : (
                <EmptyState icon="📋" title={t("dashboard.noTasksTitle")} description={t("dashboard.noTasksDesc")} />
              )
            ) : allDoneToday ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <span className="text-3xl" aria-hidden="true">
                  🎉
                </span>
                <p className="font-semibold">{t("dashboard.allTasksDoneTitle")}</p>
                {suggestWeakestSubject ? (
                  <>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t("dashboard.extraPracticeSuggestion", { subject: weakestSubject!.subjectNameUz })}
                    </p>
                    <Link to={`/quiz?subject=${weakestSubject!.subjectCode}`} className="w-full">
                      <Button className="w-full">{t("dashboard.startExtraPractice")}</Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">{t("dashboard.allTasksDoneDesc")}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingTodayTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3">
                    <div>
                      <p className="font-semibold">{task.subject?.name ?? task.title}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{task.minutes} {t("dashboard.minutes")}</p>
                    </div>
                    <Link to={task.subject?.code ? `/quiz?subject=${task.subject.code}` : "/schedule"}>
                      <PlayCircle className="text-brand-500" size={28} />
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {!allDoneToday && (
              <Link to="/schedule">
                <Button className="w-full mt-4">{t("dashboard.startFirstTask")}</Button>
              </Link>
            )}
          </Card>

          <DailyCoachCard />
        </div>

        {/* RIGHT — persistent summary rail */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-6 lg:sticky lg:top-6">
          <DailyMotivation />

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-bold text-lg">{t("dashboard.learningHealth")}</h2>
              <Info size={14} className="text-[var(--text-secondary)]" />
            </div>
            {profile.isLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <>
                <p className="text-4xl font-extrabold text-brand-600 mb-3">
                  {Math.round(
                    (profile.data?.subjectLevels.reduce((sum, s) => sum + s.score, 0) ?? 0) /
                      Math.max(profile.data?.subjectLevels.length ?? 1, 1)
                  )}
                  <span className="text-lg text-[var(--text-secondary)] font-medium">/100</span>
                </p>
                <div className="flex flex-col gap-2">
                  {profile.data?.subjectLevels.slice(0, 4).map((s) => (
                    <div key={s.subjectCode} className="flex items-center gap-2">
                      <span className="text-sm w-24 shrink-0">{s.subjectNameUz}</span>
                      <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-gradient" style={{ width: `${s.score}%` }} />
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] w-8 text-right">{Math.round(s.score)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

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
      </div>
    </div>
  );
}
