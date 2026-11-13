import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, Compass, FileText, MessageCircle, TrendingUp } from "lucide-react";
import { studentApi, dailyCoachApi, DashboardSummary } from "../../../lib/api";

/** Data every dashboard layout needs, loaded once. */
export function useDashboardData() {
  const { dashboard } = useOutletContext<{ dashboard?: DashboardSummary }>();
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const coach = useQuery({ queryKey: ["daily-coach-today"], queryFn: dailyCoachApi.getToday, retry: false });
  const careerVisible = dashboard?.careerModuleVisible ?? profile.data?.careerModuleVisible ?? false;
  const levels = profile.data?.subjectLevels ?? [];
  const avgScore = levels.length ? Math.round(levels.reduce((sum, s) => sum + s.score, 0) / levels.length) : 0;
  const points = dashboard?.points ?? 0;
  // Purely visual "level" derived from points: every 200 points = 1 level.
  const level = Math.floor(points / 200) + 1;
  const levelProgress = (points % 200) / 200;
  return {
    dashboard,
    profile,
    name: dashboard?.fullName ?? profile.data?.fullName ?? "",
    careerVisible,
    levels,
    avgScore,
    points,
    level,
    levelProgress,
    toNext: 200 - (points % 200),
    coachMessage: coach.data?.message,
  };
}

export type Section = {
  to: string;
  emoji: string;
  icon: typeof BookOpenCheck;
  title: string;
  desc: string;
  from: string;
  to2: string;
  locked?: boolean;
};

export function useSections(careerVisible: boolean): Section[] {
  const { t } = useTranslation();
  const list: Section[] = [
    { to: "/quiz", emoji: "📚", icon: BookOpenCheck, title: t("dashboard.actionQuizTitle"), desc: t("dashboard.actionQuizDesc"), from: "#7c4dff", to2: "#4f6df5" },
    {
      to: "/career",
      emoji: "🧭",
      icon: Compass,
      title: t("dashboard.actionCareerTitle"),
      desc: careerVisible ? t("dashboard.actionCareerDesc") : t("dashboard.actionCareerLocked"),
      from: "#fbbf24",
      to2: "#f97316",
      locked: !careerVisible,
    },
  ];
  if (careerVisible)
    list.push({ to: "/dtm", emoji: "📝", icon: FileText, title: t("dashboard.actionDtmTitle"), desc: t("dashboard.actionDtmDesc"), from: "#fb7185", to2: "#ec4899" });
  list.push(
    { to: "/chat", emoji: "🤖", icon: MessageCircle, title: t("dashboard.actionChatTitle"), desc: t("dashboard.actionChatDesc"), from: "#38bdf8", to2: "#06b6d4" },
    { to: "/progress", emoji: "📈", icon: TrendingUp, title: t("dashboard.actionProgressTitle"), desc: t("dashboard.actionProgressDesc"), from: "#34d399", to2: "#14b8a6" }
  );
  return list;
}

/** Circular progress ring (SVG) with a glowing gradient stroke. */
export function Ring({ value, size = 120, stroke = 12, children, id }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; id: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_0_12px_rgba(124,77,255,0.55)]">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="55%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="ring-anim"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
