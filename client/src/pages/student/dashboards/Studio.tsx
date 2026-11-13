import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpenCheck, Flame, Lock, Star, Trophy } from "lucide-react";
import clsx from "clsx";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { styleFor } from "../subjectStyle";
import { Ring, useDashboardData, useSections } from "./shared";

/** Variant D — "Studiya": same language as the chosen sections (framed hero
 * like Kasb C, colourful 3D cards like Testlar B, drawn icons only, no emoji). */
export default function Studio() {
  const { t } = useTranslation();
  const d = useDashboardData();
  const sections = useSections(d.careerVisible);
  // The greeting string carries a 👋; this layout stays emoji-free.
  const greeting = t("dashboard.greeting", { name: d.name }).replace(/\s*\p{Extended_Pictographic}️?/gu, "");

  const stats = [
    { icon: Flame, value: d.dashboard?.streakDays ?? 0, label: t("dashboard.streakUnit"), color: "#f59e0b" },
    { icon: Star, value: d.points, label: t("dashboard.pointsUnit"), color: "#8b5cf6" },
    { icon: BookOpenCheck, value: d.dashboard?.todaySubjectCount ?? 0, label: t("dashboard.todaySubjectsUnit"), color: "#0ea5e9" },
    { icon: Trophy, value: d.dashboard?.badgeCount ?? 0, label: t("dashboard.badgesUnit"), color: "#10b981" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] text-white p-5 sm:p-8 grid sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto] items-center gap-5">
        <div className="relative z-10 min-w-0 pr-20 sm:pr-0">
          <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-cyan-200/90 mb-2">{t("dashboard.welcomeEyebrow")}</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">{greeting}</h1>
          <p className="text-white/80 max-w-xl">{d.coachMessage ?? t("dashboard.subtitle")}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="chip-stat bg-white/10 text-white"><Flame size={16} className="text-amber-300" /> {d.dashboard?.streakDays ?? 0} {t("dashboard.streakUnit")}</span>
            <span className="chip-stat bg-white/10 text-white"><Star size={16} className="text-violet-300" /> {d.points} {t("dashboard.pointsUnit")}</span>
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-center gap-2">
          <Ring id="st-level" value={d.levelProgress} size={136}>
            <span className="text-[11px] uppercase tracking-widest text-white/70">{t("dash.level")}</span>
            <span className="text-4xl font-black leading-none">{d.level}</span>
          </Ring>
          <p className="text-xs text-white/70 text-center max-w-[9rem]">{t("dash.toNext", { n: d.toNext })}</p>
        </div>
        <RobotMascot className="absolute right-0 bottom-0 w-28 h-32 sm:relative sm:w-48 sm:h-52 lg:w-56 lg:h-60 -mb-4 sm:-my-6" />
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 [perspective:1200px]">
        {sections.map((s, i) => {
          const body = (
            <div
              className={clsx(
                "group relative h-40 sm:h-56 rounded-[1.6rem] p-4 sm:p-5 text-white overflow-hidden flex flex-col",
                s.locked && "opacity-60 grayscale-[30%]"
              )}
              style={{ background: `linear-gradient(150deg, ${s.from}, ${s.to2})`, boxShadow: `0 24px 50px -22px ${s.to2}` }}
            >
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/15" />
              <s.icon
                className="absolute right-2 bottom-2 sm:right-3 sm:bottom-3 w-16 h-16 sm:w-20 sm:h-20 text-white/90 transition-transform duration-500 group-hover:-translate-y-1.5"
                strokeWidth={1.5}
                style={{ transform: "rotate(-12deg)", filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.28))" }}
              />
              <p className="relative font-black text-lg sm:text-xl leading-tight max-w-[85%]">{s.title}</p>
              <p className="relative text-xs sm:text-sm text-white/85 mt-1 max-w-[80%] line-clamp-2">{s.desc}</p>
              <span className="relative mt-auto w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                {s.locked ? <Lock size={16} /> : <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />}
              </span>
            </div>
          );
          const cls = clsx("block rounded-[1.6rem]", i === 0 && sections.length % 2 === 1 && "col-span-2 lg:col-span-1");
          return s.locked ? (
            <div key={s.to} className={cls} aria-disabled="true">{body}</div>
          ) : (
            <Link key={s.to} to={s.to} data-tilt className={cls}>
              {body}
            </Link>
          );
        })}
      </div>

      {/* Stats + skills */}
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {stats.map((st) => (
            <div key={st.label} className="card !p-4 flex items-center gap-3">
              <span className="career-tile w-12 h-12 rounded-2xl inline-flex items-center justify-center text-white shrink-0" style={{ ["--c" as string]: st.color }}>
                <st.icon size={22} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-black leading-none">{st.value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{st.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">{t("dash.skills")}</h2>
            <span className="text-3xl font-black text-gradient-brand">
              {d.avgScore}
              <span className="text-base text-[var(--text-secondary)] font-semibold">/100</span>
            </span>
          </div>
          {d.levels.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t("progress.noLevelsDesc")}</p>
          ) : (
            <div className="grid gap-3">
              {d.levels.slice(0, 6).map((s) => {
                const look = styleFor(s.subjectCode);
                return (
                  <div key={s.subjectCode} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(150deg, ${look.from}, ${look.to})` }}>
                      <look.Icon size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold truncate">{s.subjectNameUz}</span>
                        <span className="font-bold">{Math.round(s.score)}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: `linear-gradient(90deg, ${look.from}, ${look.to})`, boxShadow: `0 0 12px ${look.to}` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
