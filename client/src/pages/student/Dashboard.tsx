import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useOutletContext } from "react-router-dom";
import { Sparkles, Info, Sunrise, Check, Flame, Star, BookOpenCheck, Trophy, Compass, MessageCircle, TrendingUp, Lock, ChevronRight, FileText } from "lucide-react";
import clsx from "clsx";
import { studentApi, recommendationApi, dailyCoachApi, DashboardSummary } from "../../lib/api";
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
    <svg width="170" height="150" viewBox="0 0 240 220" className="shrink-0 hidden sm:block" aria-hidden="true">
      <circle cx="130" cy="120" r="105" fill="#ffffff" opacity="0.12" />
      <circle cx="55" cy="180" r="30" fill="#ffffff" opacity="0.1" />
      <circle cx="34" cy="55" r="5" fill="#fcd34d" />
      <circle cx="212" cy="70" r="4" fill="#ffffff" />
      <path d="M45 26 L48 34 L56 37 L48 40 L45 48 L42 40 L34 37 L42 34 Z" fill="#fcd34d" />
      <rect x="55" y="150" width="150" height="20" rx="6" fill="#c7d2fe" />
      <rect x="70" y="130" width="120" height="18" rx="6" fill="#a5b4fc" />
      <rect x="82" y="112" width="96" height="16" rx="6" fill="#ffffff" />
      <polygon points="130,62 195,90 130,118 65,90" fill="#1a1533" />
      <circle cx="130" cy="90" r="6" fill="#8b6bff" />
      <path d="M182 84 L188 118" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="188.5" cy="121" r="5" fill="#fcd34d" />
    </svg>
  );
}

function StatPill({ icon, iconBg, value, label }: { icon: React.ReactNode; iconBg: string; value: string | number; label: string }) {
  return (
    <Card className="flex items-center gap-3.5 py-3.5 pl-3.5">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-extrabold leading-tight">{value}</p>
        <p className="text-xs text-[var(--text-secondary)] truncate">{label}</p>
      </div>
    </Card>
  );
}

type Tone = "violet" | "amber" | "sky" | "emerald" | "rose";

const TONES: Record<Tone, { tile: string; icon: string }> = {
  violet: { tile: "from-brand-500 to-accentBlue text-white", icon: "bg-white/20 text-white" },
  amber: { tile: "from-amber-400 to-orange-500 text-white", icon: "bg-white/20 text-white" },
  sky: { tile: "from-sky-400 to-cyan-500 text-white", icon: "bg-white/20 text-white" },
  emerald: { tile: "from-emerald-400 to-teal-500 text-white", icon: "bg-white/20 text-white" },
  rose: { tile: "from-rose-400 to-pink-500 text-white", icon: "bg-white/20 text-white" },
};

/** A big, colourful, tappable tile — the main way into each section, sized
 * for small hands (the app is used from grade 1). */
function ActionTile({
  to,
  icon,
  title,
  description,
  tone,
  locked,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: Tone;
  locked?: boolean;
}) {
  const body = (
    <div
      className={clsx(
        "relative h-full rounded-card p-4 sm:p-5 flex flex-col gap-3 bg-gradient-to-br shadow-card overflow-hidden transition-transform",
        TONES[tone].tile,
        locked ? "opacity-60 grayscale-[30%]" : ""
      )}
    >
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10" aria-hidden="true" />
      <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", TONES[tone].icon)}>{locked ? <Lock size={22} /> : icon}</div>
      <div className="flex-1">
        <p className="font-extrabold text-base sm:text-lg leading-snug">{title}</p>
        <p className="text-xs sm:text-sm text-white/85 mt-1">{description}</p>
      </div>
      {!locked && <ChevronRight className="absolute right-4 top-5 text-white/70 hidden sm:block" size={22} aria-hidden="true" />}
    </div>
  );
  if (locked) return <div aria-disabled="true">{body}</div>;
  return (
    <Link to={to} data-tilt className="block h-full rounded-card focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300">
      {body}
    </Link>
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
  const { t } = useTranslation();
  const { dashboard } = useOutletContext<{ dashboard?: DashboardSummary }>();

  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const recommendation = useQuery({ queryKey: ["recommendation-learning"], queryFn: recommendationApi.getLearning });

  const careerVisible = dashboard?.careerModuleVisible ?? profile.data?.careerModuleVisible ?? false;
  const levels = profile.data?.subjectLevels ?? [];
  const avgScore = levels.length ? Math.round(levels.reduce((sum, s) => sum + s.score, 0) / levels.length) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* HERO — greeting */}
      <div className="relative overflow-hidden rounded-card bg-brand-gradient text-white px-6 py-7 sm:px-8 flex items-center justify-between gap-6 shadow-card">
        <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-extrabold tracking-wide uppercase text-white/80 mb-1.5">{t("dashboard.welcomeEyebrow")}</p>
          <h1 className="text-2xl sm:text-[28px] font-extrabold mb-1.5">
            {t("dashboard.greeting", { name: dashboard?.fullName ?? profile.data?.fullName ?? "" })}
          </h1>
          <p className="text-white/85 max-w-md">{t("dashboard.subtitle")}</p>
          {dashboard?.grade && (
            <span className="inline-block mt-3 text-xs font-bold bg-white/20 rounded-full px-3 py-1">
              {dashboard.grade}-{t("profile.grade")}
            </span>
          )}
        </div>
        <HeroIllustration />
      </div>

      {/* Main sections — big tiles */}
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="font-bold text-lg mb-3">
          {t("dashboard.quickActionsTitle")}
        </h2>
        <div className={clsx("grid grid-cols-2 gap-3 sm:gap-4", careerVisible ? "md:grid-cols-3 xl:grid-cols-5" : "xl:grid-cols-4")}>
          <ActionTile
            to="/quiz"
            tone="violet"
            icon={<BookOpenCheck size={24} />}
            title={t("dashboard.actionQuizTitle")}
            description={t("dashboard.actionQuizDesc")}
          />
          <ActionTile
            to="/career"
            tone="amber"
            icon={<Compass size={24} />}
            title={t("dashboard.actionCareerTitle")}
            description={careerVisible ? t("dashboard.actionCareerDesc") : t("dashboard.actionCareerLocked")}
            locked={!careerVisible}
          />
          {careerVisible && (
            <ActionTile
              to="/dtm"
              tone="rose"
              icon={<FileText size={24} />}
              title={t("dashboard.actionDtmTitle")}
              description={t("dashboard.actionDtmDesc")}
            />
          )}
          <ActionTile
            to="/chat"
            tone="sky"
            icon={<MessageCircle size={24} />}
            title={t("dashboard.actionChatTitle")}
            description={t("dashboard.actionChatDesc")}
          />
          <ActionTile
            to="/progress"
            tone="emerald"
            icon={<TrendingUp size={24} />}
            title={t("dashboard.actionProgressTitle")}
            description={t("dashboard.actionProgressDesc")}
          />
        </div>
      </section>

      {/* Stat pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatPill icon={<Flame size={20} className="text-amber-600" />} iconBg="bg-amber-100" value={dashboard?.streakDays ?? 0} label={t("dashboard.streakUnit")} />
        <StatPill icon={<Star size={20} className="text-brand-600" />} iconBg="bg-brand-100" value={dashboard?.points ?? 0} label={t("dashboard.pointsUnit")} />
        <StatPill
          icon={<BookOpenCheck size={20} className="text-sky-600" />}
          iconBg="bg-sky-100"
          value={dashboard?.todaySubjectCount ?? 0}
          label={t("dashboard.todaySubjectsUnit")}
        />
        <StatPill icon={<Trophy size={20} className="text-emerald-600" />} iconBg="bg-emerald-100" value={dashboard?.badgeCount ?? 0} label={t("dashboard.badgesUnit")} />
      </div>

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

        <div className="flex flex-col gap-6">
          <DailyMotivation />

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-bold text-lg">{t("dashboard.learningHealth")}</h2>
            </div>
            {profile.isLoading ? (
              <Skeleton className="h-24" />
            ) : levels.length === 0 ? (
              <EmptyState icon="📚" title={t("progress.noLevelsTitle")} description={t("progress.noLevelsDesc")} />
            ) : (
              <>
                <p className="text-4xl font-extrabold text-brand-600 mb-3">
                  {avgScore}
                  <span className="text-lg text-[var(--text-secondary)] font-medium">/100</span>
                </p>
                <div className="flex flex-col gap-2">
                  {levels.slice(0, 5).map((s) => (
                    <div key={s.subjectCode} className="flex items-center gap-2">
                      <span className="text-sm w-24 shrink-0 truncate">{s.subjectNameUz}</span>
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
        </div>
      </div>
    </div>
  );
}
