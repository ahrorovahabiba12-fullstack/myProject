import { useTranslation } from "react-i18next";
import { ArrowRight, Clock, ListChecks, Sparkles } from "lucide-react";
import { RobotMascot } from "../../../components/three/RobotMascot";

type Props = { onStart: () => void; hasResult: boolean; onBack: () => void };

const CAREERS: [string, string][] = [
  ["💻", "#7c4dff"],
  ["🩺", "#22d3ee"],
  ["🎨", "#f472b6"],
  ["⚖️", "#fbbf24"],
  ["🏗️", "#a78bfa"],
  ["🔬", "#34d399"],
];

/** Kasb A — "Robot yo'lboshchi": big space hero with the robot, glowing
 * start button, floating career emoji and 3D step cards. */
export function CareerIntroGuide({ onStart, hasResult, onBack }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] text-white p-6 sm:p-10 grid md:grid-cols-[1fr_auto] items-center gap-4">
        {CAREERS.map(([e, c], i) => (
          <span
            key={e}
            className="absolute text-3xl sm:text-4xl select-none opacity-90"
            style={{
              left: `${[52, 88, 60, 92, 72, 46][i]}%`,
              top: `${[8, 14, 72, 62, 88, 40][i]}%`,
              filter: `drop-shadow(0 0 16px ${c})`,
              animation: `chip-float 5s ease-in-out ${-i}s infinite`,
            }}
          >
            {e}
          </span>
        ))}
        <div className="relative z-10 max-w-xl">
          <p className="section-badge mb-4">🧭 {t("career.title")}</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">{t("variants.careerHeadline")}</h1>
          <p className="text-white/80 mb-1">{t("career.introText")}</p>
          <p className="text-white/60 text-sm mb-7">{t("career.introHint")}</p>
          <button onClick={onStart} className="btn-glow">
            {t("career.startTest")} <ArrowRight size={20} />
          </button>
          {hasResult && (
            <button onClick={onBack} className="block mt-4 text-sm font-semibold text-cyan-200 hover:underline">
              ← {t("career.backToResult")}
            </button>
          )}
        </div>
        <RobotMascot className="relative z-10 w-48 h-52 sm:w-64 sm:h-72 mx-auto" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-5 [perspective:1000px]">
        {(["step1", "step2", "step3"] as const).map((k, i) => (
          <div key={k} data-tilt className="card relative overflow-hidden !p-5">
            <span className="absolute -right-2 -top-6 text-[7rem] font-black text-outline-brand select-none">{i + 1}</span>
            <span className="w-11 h-11 rounded-2xl bg-brand-gradient text-white flex items-center justify-center icon-3d font-black text-lg">{i + 1}</span>
            <p className="relative text-sm mt-4 font-medium">{t(`career.${k}`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kasb B — "Kasb kartalari": a fanned 3D deck of career cards next to the
 * intro text and three info chips. */
export function CareerIntroDeck({ onStart, hasResult, onBack }: Props) {
  const { t } = useTranslation();
  const names = t("landing.kineticCareers", { returnObjects: true }) as string[];
  return (
    <div className="grid lg:grid-cols-2 gap-8 items-center">
      <div>
        <p className="section-badge !text-brand-600 dark:!text-cyan-300 !border-brand-300/40 mb-4">🧭 {t("career.title")}</p>
        <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">{t("variants.careerHeadline")}</h1>
        <p className="text-[var(--text-secondary)] mb-6">{t("career.introText")}</p>
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="chip-stat bg-violet-500/10 text-violet-600 dark:text-violet-300"><ListChecks size={16} /> {t("variants.chipQuestions")}</span>
          <span className="chip-stat bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"><Clock size={16} /> {t("variants.chipTime")}</span>
          <span className="chip-stat bg-pink-500/10 text-pink-600 dark:text-pink-300"><Sparkles size={16} /> {t("variants.chipResult")}</span>
        </div>
        <button onClick={onStart} className="btn-glow">
          {t("career.startTest")} <ArrowRight size={20} />
        </button>
        {hasResult && (
          <button onClick={onBack} className="block mt-4 text-sm font-semibold text-brand-600 hover:underline">
            ← {t("career.backToResult")}
          </button>
        )}
      </div>
      <div className="deck relative h-[340px] sm:h-[420px]">
        {CAREERS.map(([e, c], i) => {
          const mid = (CAREERS.length - 1) / 2;
          const k = i - mid;
          return (
            <div
              key={e}
              className="deck-card absolute left-1/2 bottom-6 w-36 h-52 sm:w-44 sm:h-64 rounded-[1.4rem] p-4 flex flex-col justify-between text-white"
              style={{
                background: `linear-gradient(160deg, ${c}, #1e1b4b 140%)`,
                boxShadow: `0 25px 50px -20px ${c}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                ["--r" as string]: `${k * 8}deg`,
                ["--x" as string]: `${k * 34}px`,
                ["--y" as string]: `${k * k * 6}px`,
                zIndex: 10 - Math.round(Math.abs(k) * 2),
              }}
            >
              <span className="text-5xl sm:text-6xl">{e}</span>
              <span className="font-black text-lg leading-tight">{names[i] ?? ""}</span>
            </div>
          );
        })}
        <RobotMascot className="absolute left-1/2 -translate-x-1/2 -top-6 w-28 h-32 z-20" />
      </div>
    </div>
  );
}
