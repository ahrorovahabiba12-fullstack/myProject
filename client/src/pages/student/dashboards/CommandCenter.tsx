import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, Star, Trophy, BookOpenCheck, Lock, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { Ring, useDashboardData, useSections } from "./shared";

/** Variant A — "Kosmik markaz": robot with a speech bubble, a level ring and
 * a bento grid of glowing section tiles. */
export default function CommandCenter() {
  const { t } = useTranslation();
  const d = useDashboardData();
  const sections = useSections(d.careerVisible);
  const [main, ...rest] = sections;

  const stats = [
    { icon: Flame, value: d.dashboard?.streakDays ?? 0, label: t("dashboard.streakUnit"), color: "#f59e0b" },
    { icon: Star, value: d.points, label: t("dashboard.pointsUnit"), color: "#a78bfa" },
    { icon: BookOpenCheck, value: d.dashboard?.todaySubjectCount ?? 0, label: t("dashboard.todaySubjectsUnit"), color: "#22d3ee" },
    { icon: Trophy, value: d.dashboard?.badgeCount ?? 0, label: t("dashboard.badgesUnit"), color: "#34d399" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero: robot + speech bubble + level ring */}
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] p-5 sm:p-7 text-white grid sm:grid-cols-[auto_1fr_auto] items-center gap-4 sm:gap-6">
        <RobotMascot className="w-36 h-40 sm:w-48 sm:h-52 mx-auto -my-4" />
        <div>
          <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-cyan-200/90 mb-2">{t("dashboard.welcomeEyebrow")}</p>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">{t("dashboard.greeting", { name: d.name })}</h1>
          <div className="speech relative rounded-2xl px-4 py-3 text-sm sm:text-base max-w-xl">
            {d.coachMessage ?? t("dashboard.subtitle")}
          </div>
        </div>
        <div className="flex sm:flex-col items-center gap-3 justify-center">
          <Ring id="cc-level" value={d.levelProgress} size={128}>
            <span className="text-[11px] uppercase tracking-widest text-white/70">{t("dash.level")}</span>
            <span className="text-4xl font-black leading-none">{d.level}</span>
          </Ring>
          <p className="text-xs text-white/75 text-center max-w-[9rem]">{t("dash.toNext", { n: d.toNext })}</p>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-[minmax(130px,auto)]">
        <BentoTile s={main} big />
        {rest.map((s) => (
          <BentoTile key={s.to} s={s} />
        ))}
        {/* Stats as neon tiles */}
        {stats.map((st) => (
          <div key={st.label} className="card !p-4 flex flex-col justify-between">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center icon-3d" style={{ background: st.color, boxShadow: `0 8px 24px -6px ${st.color}` }}>
              <st.icon size={20} className="text-white" />
            </span>
            <div>
              <p className="text-3xl font-black leading-none mt-3">{st.value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{st.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Skills */}
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
          <div className="flex items-end gap-4 sm:gap-6 h-40">
            {d.levels.slice(0, 8).map((s) => (
              <div key={s.subjectCode} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-xs font-bold">{Math.round(s.score)}%</span>
                <div className="w-full max-w-[56px] rounded-t-xl skill-bar" style={{ height: `${Math.max(8, s.score)}%` }} />
                <span className="text-xs text-[var(--text-secondary)] truncate max-w-full">{s.subjectNameUz}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BentoTile({ s, big }: { s: ReturnType<typeof useSections>[number]; big?: boolean }) {
  const body = (
    <div
      className={clsx("bento relative h-full rounded-[1.5rem] p-4 sm:p-5 text-white overflow-hidden flex flex-col", s.locked && "opacity-60 grayscale-[30%]")}
      style={{ background: `linear-gradient(140deg, ${s.from}, ${s.to2})`, boxShadow: `0 20px 40px -18px ${s.to2}` }}
    >
      <span className={clsx("bento-emoji absolute select-none", big ? "text-[7rem] sm:text-[9rem] -right-3 -bottom-6" : "text-6xl -right-2 -bottom-3")}>{s.emoji}</span>
      <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center icon-3d">
        {s.locked ? <Lock size={20} /> : <s.icon size={22} />}
      </span>
      <div className={clsx("mt-auto relative", big ? "pt-10" : "pt-4")}>
        <p className={clsx("font-black leading-tight", big ? "text-2xl sm:text-3xl max-w-[65%]" : "text-base sm:text-lg max-w-[80%]")}>{s.title}</p>
        <p className={clsx("text-white/85 mt-1", big ? "text-sm sm:text-base max-w-[70%]" : "text-xs")}>{s.desc}</p>
      </div>
      {!s.locked && <ArrowUpRight className="absolute right-4 top-4 text-white/80" size={22} />}
    </div>
  );
  const cls = big ? "col-span-2 row-span-2" : "";
  if (s.locked) return <div className={cls} aria-disabled="true">{body}</div>;
  return (
    <Link to={s.to} data-tilt className={clsx("block rounded-[1.5rem]", cls)}>
      {body}
    </Link>
  );
}
