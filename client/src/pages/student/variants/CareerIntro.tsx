import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ArrowRight, Clock, ListChecks, Sparkles, Laptop, Stethoscope, Palette, Scale, Building2, Microscope, Wrench, Compass, type LucideIcon } from "lucide-react";
import { RobotMascot } from "../../../components/three/RobotMascot";

type Props = { onStart: () => void; hasResult: boolean; onBack: () => void };

const CAREERS: [LucideIcon, string][] = [
  [Laptop, "#7c4dff"],
  [Stethoscope, "#0ea5e9"],
  [Palette, "#ec4899"],
  [Wrench, "#8b5cf6"],
  [Scale, "#f59e0b"],
  [Microscope, "#10b981"],
];

/** A glossy glass tile with a line icon: drawn, not an emoji sticker. */
function IconTile({ Icon, color, className = "" }: { Icon: LucideIcon; color: string; className?: string }) {
  return (
    <span
      className={`career-tile inline-flex items-center justify-center rounded-2xl ${className}`}
      style={{ ["--c" as string]: color }}
    >
      <Icon strokeWidth={1.75} className="w-1/2 h-1/2" />
    </span>
  );
}

/** Kasb A — "Robot yo'lboshchi": big space hero with the robot, glowing
 * start button, floating career emoji and 3D step cards. */
export function CareerIntroGuide({ onStart, hasResult, onBack }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] text-white p-6 sm:p-10 grid md:grid-cols-[1fr_auto] items-center gap-4">
        {CAREERS.map(([Icon, c], i) => (
          <span
            key={c}
            className={`absolute select-none ${i === 0 || i === 5 ? "hidden sm:block" : ""}`}
            style={{
              left: `${[52, 88, 60, 92, 72, 46][i]}%`,
              top: `${[8, 14, 72, 62, 88, 40][i]}%`,
              animation: `chip-float 5s ease-in-out ${-i}s infinite`,
            }}
          >
            <IconTile Icon={Icon} color={c} className="w-11 h-11 sm:w-14 sm:h-14 text-white" />
          </span>
        ))}
        <div className="relative z-10 max-w-xl">
          <p className="section-badge mb-4 !inline-flex items-center gap-1.5"><Compass size={14} /> {t("career.title")}</p>
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
        <p className="section-badge !text-brand-600 dark:!text-cyan-300 !border-brand-300/40 mb-4 !inline-flex items-center gap-1.5"><Compass size={14} /> {t("career.title")}</p>
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
        {CAREERS.map(([Icon, c], i) => {
          const mid = (CAREERS.length - 1) / 2;
          const k = i - mid;
          return (
            <div
              key={c}
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
              <IconTile Icon={Icon} color={c} className="relative w-14 h-14 sm:w-16 sm:h-16 text-white" />
              <span className="relative font-black text-lg leading-tight">{names[i] ?? ""}</span>
            </div>
          );
        })}
        <RobotMascot className="absolute left-1/2 -translate-x-1/2 -top-6 w-28 h-32 z-20" />
      </div>
    </div>
  );
}

const MIX_ICONS: [LucideIcon, string][] = [
  [Laptop, "#7c4dff"],
  [Stethoscope, "#0ea5e9"],
  [Palette, "#ec4899"],
  [Wrench, "#8b5cf6"],
  [Scale, "#f59e0b"],
  [Building2, "#10b981"],
];

/** Kasb C — A + B mixed: framed hero with text on the left and a wide fan
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
