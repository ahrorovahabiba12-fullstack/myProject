import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, Star, Trophy, BookOpenCheck } from "lucide-react";
import clsx from "clsx";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { Ring, useDashboardData, useSections } from "./shared";

/** Variant C — "Orbita": the robot sits in the middle of glowing orbit rings
 * and every section is a planet around it. On phones the planets fall into
 * a grid under the robot. */
export default function OrbitHub() {
  const { t } = useTranslation();
  const d = useDashboardData();
  const sections = useSections(d.careerVisible);
  const n = sections.length;
  // Only one robot is mounted (each one is its own WebGL scene).
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="orbit-panel relative rounded-[1.75rem] overflow-hidden text-white px-4 pt-6 pb-8 sm:px-8">
        <div className="text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black">{t("dashboard.greeting", { name: d.name })}</h1>
          <p className="text-white/75 mt-1">{d.coachMessage ?? t("dashboard.subtitle")}</p>
        </div>

        {/* Desktop: planets on an orbit */}
        <div className="orbit-stage relative mx-auto mt-4 hidden md:block">
          <div className="orbit-ring orbit-ring-1" />
          <div className="orbit-ring orbit-ring-2" />
          <div className="orbit-ring orbit-ring-3" />
          {wide && <RobotMascot className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-60" />}
          {sections.map((s, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(a) * 40;
            const y = 50 + Math.sin(a) * 40;
            return <Planet key={s.to} s={s} style={{ left: `${x}%`, top: `${y}%` }} delay={i * 0.4} />;
          })}
        </div>

        {/* Phones: robot then a grid */}
        <div className="md:hidden relative z-10">
          {!wide && <RobotMascot className="w-40 h-44 mx-auto" />}
          <div className="grid grid-cols-3 gap-3 mt-2">
            {sections.map((s, i) => (
              <Planet key={s.to} s={s} delay={i * 0.4} inline />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="card col-span-2 lg:col-span-1 flex items-center justify-center !p-4">
          <Ring id="orb-ring" value={d.avgScore / 100} size={110}>
            <span className="text-2xl font-black">{d.avgScore}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">{t("dashboard.learningHealth")}</span>
          </Ring>
        </div>
        {[
          { icon: Flame, v: d.dashboard?.streakDays ?? 0, l: t("dashboard.streakUnit"), c: "from-amber-400 to-orange-500" },
          { icon: Star, v: d.points, l: t("dashboard.pointsUnit"), c: "from-violet-500 to-indigo-500" },
          { icon: BookOpenCheck, v: d.dashboard?.todaySubjectCount ?? 0, l: t("dashboard.todaySubjectsUnit"), c: "from-sky-400 to-cyan-500" },
          { icon: Trophy, v: d.dashboard?.badgeCount ?? 0, l: t("dashboard.badgesUnit"), c: "from-emerald-400 to-teal-500" },
        ].map((st) => (
          <div key={st.l} data-tilt className="card !p-4 flex items-center gap-3">
            <span className={clsx("w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white icon-3d shrink-0", st.c)}>
              <st.icon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-black leading-none">{st.v}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate mt-1">{st.l}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Planet({ s, style, delay, inline }: { s: ReturnType<typeof useSections>[number]; style?: React.CSSProperties; delay: number; inline?: boolean }) {
  const body = (
    <div className={clsx("planet-wrap flex flex-col items-center text-center", !inline && "absolute -translate-x-1/2 -translate-y-1/2 w-36", s.locked && "opacity-55 grayscale")} style={{ ...style, animationDelay: `${-delay}s` }}>
      <div
        className={clsx("planet flex items-center justify-center", inline ? "w-20 h-20 text-3xl" : "w-24 h-24 text-4xl")}
        style={{
          background: `radial-gradient(circle at 32% 28%, #ffffffcc 0, transparent 30%), radial-gradient(circle at 70% 75%, rgba(0,0,0,0.3), transparent 55%), linear-gradient(145deg, ${s.from}, ${s.to2})`,
          boxShadow: `0 0 40px -6px ${s.from}, 0 20px 40px -14px ${s.to2}`,
        }}
      >
        {s.locked ? "🔒" : s.emoji}
      </div>
      <p className="mt-2 text-xs sm:text-sm font-bold leading-tight">{s.title}</p>
    </div>
  );
  if (s.locked) return <div aria-disabled="true" className={inline ? "" : "contents"}>{body}</div>;
  return (
    <Link to={s.to} className={inline ? "block" : "contents"}>
      {body}
    </Link>
  );
}
