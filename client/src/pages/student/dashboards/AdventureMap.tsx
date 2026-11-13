import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, Star, Lock, CheckCircle2, Circle } from "lucide-react";
import clsx from "clsx";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { useDashboardData, useSections } from "./shared";

/** Variant B — "Sarguzasht xaritasi": a game-like journey map. Each section
 * is a glossy 3D "station" on a glowing path; daily quests below. */
export default function AdventureMap() {
  const { t } = useTranslation();
  const d = useDashboardData();
  const sections = useSections(d.careerVisible);
  const streak = d.dashboard?.streakDays ?? 0;
  const today = d.dashboard?.todaySubjectCount ?? 0;

  const quests = [
    { label: t("dash.quest1"), done: today >= 1, progress: `${Math.min(today, 1)}/1` },
    { label: t("dash.quest2"), done: today >= 3, progress: `${Math.min(today, 3)}/3` },
    { label: t("dash.quest3"), done: streak >= 7, progress: `${Math.min(streak, 7)}/7` },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Player bar */}
      <div className="card !p-4 sm:!p-5 flex flex-wrap items-center gap-4">
        <RobotMascot className="w-16 h-16 -my-2" />
        <div className="flex-1 min-w-[180px]">
          <p className="font-black text-xl">{t("dashboard.greeting", { name: d.name })}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-gradient text-white">
              {t("dash.level")} {d.level}
            </span>
            <div className="flex-1 min-w-[120px] h-3 rounded-full bg-brand-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full xp-bar rounded-full" style={{ width: `${Math.max(4, d.levelProgress * 100)}%` }} />
            </div>
            <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">{t("dash.toNext", { n: d.toNext })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="chip-stat bg-amber-400/15 text-amber-500"><Flame size={18} /> {streak}</span>
          <span className="chip-stat bg-violet-400/15 text-violet-500"><Star size={18} /> {d.points}</span>
        </div>
      </div>

      {/* Journey map */}
      <div className="map-panel relative rounded-[1.75rem] overflow-hidden px-4 py-8 sm:px-10 sm:py-12">
        <h2 className="relative z-10 text-white font-black text-2xl sm:text-3xl mb-8 text-center">{t("dash.mapTitle")}</h2>
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
          <path d="M60 300 C 200 300, 220 140, 340 150 S 520 320, 640 260 S 820 90, 950 140" fill="none" stroke="url(#mapPath)" strokeWidth="6" strokeDasharray="14 12" strokeLinecap="round" className="map-dash" />
          <defs>
            <linearGradient id="mapPath" x1="0" x2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-3 md:items-center">
          {sections.map((s, i) => (
            <Station key={s.to} s={s} n={i + 1} offset={[40, -50, 30, -70, -30][i % 5]} />
          ))}
        </div>
      </div>

      {/* Daily quests + skills */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="font-bold text-lg mb-3">🎯 {t("dash.questsTitle")}</h2>
          <ul className="flex flex-col gap-2.5">
            {quests.map((q) => (
              <li key={q.label} className={clsx("flex items-center gap-3 rounded-2xl px-3 py-3 border", q.done ? "border-emerald-400/50 bg-emerald-400/10" : "border-[var(--border-subtle)]")}>
                {q.done ? <CheckCircle2 className="text-emerald-500 shrink-0" size={22} /> : <Circle className="text-[var(--text-secondary)] shrink-0" size={22} />}
                <span className="flex-1 text-sm font-medium">{q.label}</span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">{q.progress}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="font-bold text-lg mb-3">⚡ {t("dash.skills")}</h2>
          {d.levels.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("progress.noLevelsDesc")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {d.levels.slice(0, 5).map((s) => (
                <div key={s.subjectCode}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">{s.subjectNameUz}</span>
                    <span className="text-[var(--text-secondary)]">{Math.round(s.score)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-brand-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full xp-bar rounded-full" style={{ width: `${s.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Station({ s, n, offset }: { s: ReturnType<typeof useSections>[number]; n: number; offset: number }) {
  const body = (
    <div className={clsx("flex flex-col items-center text-center text-white", s.locked && "opacity-55 grayscale")} style={{ ["--off" as string]: `${offset}px` }}>
      <div className="station relative" style={{ background: `radial-gradient(circle at 30% 25%, #ffffffaa, transparent 40%), linear-gradient(145deg, ${s.from}, ${s.to2})`, boxShadow: `0 18px 40px -10px ${s.to2}, inset 0 -10px 18px rgba(0,0,0,0.25), inset 0 6px 10px rgba(255,255,255,0.35)` }}>
        <span className="text-4xl sm:text-5xl">{s.locked ? "🔒" : s.emoji}</span>
        <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white text-brand-700 text-xs font-black flex items-center justify-center shadow-lg">{n}</span>
      </div>
      <p className="font-bold text-sm sm:text-base mt-3 leading-tight">{s.title}</p>
      {s.locked && <p className="text-[11px] text-white/70 mt-1 flex items-center gap-1"><Lock size={11} /> {s.desc}</p>}
    </div>
  );
  if (s.locked) return <div className="station-wrap" aria-disabled="true">{body}</div>;
  return (
    <Link to={s.to} className="station-wrap group focus:outline-none">
      {body}
    </Link>
  );
}
