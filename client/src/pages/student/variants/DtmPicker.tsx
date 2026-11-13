import { useTranslation } from "react-i18next";
import clsx from "clsx";
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

/** DTM A — "Imtihon chiptalari": each subject is a 3D exam ticket with a
 * perforated edge; blocks are big glossy pill buttons. */
export function DtmTickets({ list, careerSubjects, info, onStart, pending }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] text-white p-6 sm:p-8 mb-5 flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-black mb-2">🎟️ {t("dtm.title")}</h1>
          <p className="text-white/80 max-w-xl">{t("dtm.intro")}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {BLOCKS.map((b) => (
              <span key={b} className="glass rounded-full px-3 py-1.5 text-sm font-bold">
                {t(`dtm.block_${b}`)} · {info[b].q} × {info[b].p}
              </span>
            ))}
            <span className="rounded-full px-3 py-1.5 text-sm font-black bg-amber-300 text-amber-950">max 189</span>
          </div>
        </div>
        <RobotMascot className="w-28 h-32 sm:w-44 sm:h-48 shrink-0 -my-4" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {list.map((s) => {
          const look = styleFor(s.code);
          const idx = careerSubjects.indexOf(s.code);
          const blocks: DtmBlock[] = s.compulsory ? BLOCKS : ["first", "second"];
          return (
            <div key={s.code} data-tilt className={clsx("ticket card !p-0 flex overflow-hidden", idx !== -1 && "ring-2 ring-brand-400")}>
              <div className="w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center text-white relative" style={{ background: `linear-gradient(160deg, ${look.from}, ${look.to})` }}>
                <look.Icon className="w-10 h-10" />
                <span className="text-[10px] font-black mt-2 tracking-widest">DTM</span>
              </div>
              <div className="ticket-body flex-1 p-4">
                <p className="font-black text-lg">{s.name}</p>
                {idx !== -1 && <p className="text-xs text-brand-600 dark:text-brand-300 font-semibold">{t(idx === 0 ? "dtm.yourFirst" : "dtm.yourSecond")}</p>}
                {s.available === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">⏳ {t("dtm.comingSoon")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {blocks.map((b) => (
                      <button
                        key={b}
                        disabled={pending}
                        onClick={() => onStart(s.code, b)}
                        className="pill-3d text-white text-sm font-bold rounded-full px-3.5 py-1.5"
                        style={{ background: `linear-gradient(135deg, ${BLOCK_COLORS[b][0]}, ${BLOCK_COLORS[b][1]})` }}
                      >
                        {t(`dtm.block_${b}`)} · {info[b].q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** DTM B — "Arena": a big 189-point ring, the three blocks as glowing 3D
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
              {s.available === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] mt-2">⏳ {t("dtm.comingSoon")}</p>
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
    </div>
  );
}
