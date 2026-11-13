import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ArrowRight, Clock, ListChecks, Sparkles, Laptop, Stethoscope, Palette, Scale, Building2, Wrench, Compass, type LucideIcon } from "lucide-react";
import { RobotMascot } from "../../../components/three/RobotMascot";

type Props = { onStart: () => void; hasResult: boolean; onBack: () => void };

const MIX_ICONS: [LucideIcon, string][] = [
  [Laptop, "#7c4dff"],
  [Stethoscope, "#0ea5e9"],
  [Palette, "#ec4899"],
  [Wrench, "#8b5cf6"],
  [Scale, "#f59e0b"],
  [Building2, "#10b981"],
];

/** Career intro: framed hero with text on the left and a wide fan
 * of flip cards on the right (tap a card to see its DTM subjects), then the
 * three steps below. */
export function CareerIntroMix({ onStart, hasResult, onBack }: Props) {
  const { t } = useTranslation();
  const cards = t("variants.deckCareers", { returnObjects: true }) as { code: string; name: string; exam: string }[];
  const [open, setOpen] = useState<number | null>(null);
  const mid = (cards.length - 1) / 2;
  return (
    <div>
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] text-white p-6 sm:p-10 grid lg:grid-cols-[1fr_1.15fr] items-center gap-6">
        <div className="relative z-10">
          <p className="section-badge mb-4 !inline-flex items-center gap-1.5"><Compass size={14} /> {t("career.title")}</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">{t("variants.careerHeadline")}</h1>
          <p className="text-white/80 mb-5">{t("career.introText")}</p>
          <div className="flex flex-wrap gap-2 mb-7">
            <span className="chip-stat bg-white/10 text-white"><ListChecks size={16} /> {t("variants.chipQuestions")}</span>
            <span className="chip-stat bg-white/10 text-white"><Clock size={16} /> {t("variants.chipTime")}</span>
            <span className="chip-stat bg-white/10 text-white"><Sparkles size={16} /> {t("variants.chipResult")}</span>
          </div>
          <button onClick={onStart} className="btn-glow">
            {t("career.startTest")} <ArrowRight size={20} />
          </button>
          {hasResult && (
            <button onClick={onBack} className="block mt-4 text-sm font-semibold text-cyan-200 hover:underline">
              ← {t("career.backToResult")}
            </button>
          )}
        </div>

        <div>
          <div className="relative h-[260px] sm:h-[330px]">
            <RobotMascot className="absolute left-1/2 -translate-x-1/2 -top-4 w-24 h-28 sm:w-28 sm:h-32 z-0" />
            {cards.map((c, i) => {
              const [Icon, color] = MIX_ICONS[i % MIX_ICONS.length];
              const k = i - mid;
              const isOpen = open === i;
              const right = k > 0;
              return (
                <button
                  key={c.code}
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-pressed={isOpen}
                  className={clsx("flip-card absolute left-1/2 bottom-0 w-[104px] h-40 sm:w-36 sm:h-52 text-left", isOpen && "is-open")}
                  style={{
                    ["--k" as string]: k,
                    ["--out" as string]: Math.sign(k),
                    ["--r" as string]: `${k * 7}deg`,
                    ["--y" as string]: `${k * k * 5}px`,
                    ["--c" as string]: color,
                    zIndex: isOpen ? 40 : 10 - Math.round(Math.abs(k) * 2),
                  }}
                >
                  <span className="flip-inner">
                    <span className={clsx("flip-face flip-front", right ? "is-right" : "is-left")}>
                      <span className="flip-icon career-tile rounded-xl inline-flex items-center justify-center text-white">
                        <Icon size={20} strokeWidth={1.75} />
                      </span>
                      <span className="flip-name font-black text-sm sm:text-base">{c.name}</span>
                    </span>
                    <span className="flip-face flip-back p-3 sm:p-4 flex flex-col">
                      <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/60 font-semibold">{t("variants.examLabel")}</span>
                      <span className="font-bold text-xs sm:text-sm leading-snug mt-1 flex-1">{c.exam}</span>
                      <Link to={`/career/${c.code}`} onClick={(e) => e.stopPropagation()} className="text-xs sm:text-sm font-semibold text-cyan-200 hover:underline">
                        {t("variants.more")} →
                      </Link>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-white/60 mt-12 sm:mt-10">{t("variants.flipHint")}</p>
        </div>
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
