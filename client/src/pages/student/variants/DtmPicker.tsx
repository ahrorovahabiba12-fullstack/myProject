import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Clock } from "lucide-react";
import { DtmBlock, DtmSubjects } from "../../../lib/api";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { Ring } from "../dashboards/shared";
import { styleFor } from "../subjectStyle";

type Props = {
  list: DtmSubjects["subjects"];
  careerSubjects: string[];
  info: Record<DtmBlock, { q: number; p: number }>;
  onStart: (subject: string, block: DtmBlock) => void;
  pending: boolean;
};
const BLOCKS: DtmBlock[] = ["compulsory", "first", "second"];
const BLOCK_COLORS: Record<DtmBlock, [string, string]> = {
  compulsory: ["#38bdf8", "#6366f1"],
  first: ["#a78bfa", "#7c3aed"],
  second: ["#f472b6", "#db2777"],
};

/** DTM subject picker ("Arena"): a big 189-point ring, the three blocks as glowing 3D
 * podium columns, and subjects as glossy spheres with block buttons. */
export function DtmArena({ list, careerSubjects, info, onStart, pending }: Props) {
  const { t } = useTranslation();
  const maxPts = Math.max(...BLOCKS.map((b) => info[b].q * info[b].p));
  return (
    <div>
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] text-white p-6 sm:p-8 mb-5 grid md:grid-cols-[auto_1fr_auto] items-end gap-6">
        <div className="flex flex-col items-center">
          <Ring id="dtm-ring" value={1} size={150} stroke={14}>
            <span className="text-5xl font-black leading-none">189</span>
            <span className="text-xs text-white/70">{t("dtm.points")}</span>
          </Ring>
          <h1 className="text-2xl font-black mt-3 text-center">{t("dtm.title")}</h1>
        </div>
        <div className="flex items-end justify-center gap-3 sm:gap-6 h-48">
          {BLOCKS.map((b) => {
            const pts = Math.round(info[b].q * info[b].p);
            return (
              <div key={b} className="flex flex-col items-center justify-end h-full w-20 sm:w-28">
                <span className="text-2xl font-black">{pts}</span>
                <div
                  className="podium w-full rounded-t-2xl mt-1"
                  style={{ height: `${30 + (pts / maxPts) * 60}%`, background: `linear-gradient(180deg, ${BLOCK_COLORS[b][0]}, ${BLOCK_COLORS[b][1]})`, boxShadow: `0 0 40px -6px ${BLOCK_COLORS[b][0]}` }}
                />
                <span className="text-xs font-bold mt-2 text-white/85 text-center">
                  {t(`dtm.block_${b}`)}
                  <br />
                  {info[b].q} × {info[b].p}
                </span>
              </div>
            );
          })}
        </div>
        <RobotMascot className="hidden md:block w-40 h-48" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {list.map((s) => {
          const look = styleFor(s.code);
          const idx = careerSubjects.indexOf(s.code);
          const blocks: DtmBlock[] = s.compulsory ? BLOCKS : ["first", "second"];
          return (
            <div key={s.code} className={clsx("card !p-4 flex flex-col items-center text-center", idx !== -1 && "ring-2 ring-brand-400")}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                style={{ background: `radial-gradient(circle at 32% 28%, #ffffffcc 0, transparent 32%), linear-gradient(145deg, ${look.from}, ${look.to})`, boxShadow: `0 14px 28px -12px ${look.to}` }}
              >
                <look.Icon className="w-8 h-8 text-white" />
              </div>
              <p className="font-black">{s.name}</p>
              {idx !== -1 && (
                <span className="text-[11px] rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 mt-1">
                  {t(idx === 0 ? "dtm.yourFirst" : "dtm.yourSecond")}
                </span>
              )}
              {s.available === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] mt-2 inline-flex items-center gap-1"><Clock size={12} /> {t("dtm.comingSoon")}</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {blocks.map((b) => (
                    <button
                      key={b}
                      disabled={pending}
                      onClick={() => onStart(s.code, b)}
                      className="pill-3d text-white text-xs font-bold rounded-full px-2.5 py-1"
                      style={{ background: `linear-gradient(135deg, ${BLOCK_COLORS[b][0]}, ${BLOCK_COLORS[b][1]})` }}
                    >
                      {t(`dtm.block_${b}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-4">{t("dtm.sourceNote")}</p>
    </div>
  );
}
