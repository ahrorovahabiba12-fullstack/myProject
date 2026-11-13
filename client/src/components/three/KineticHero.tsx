import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const CHIPS: [string, string, string][] = [
  ["💻", "chip-a", "#7c4dff"],
  ["🩺", "chip-b", "#22d3ee"],
  ["🎨", "chip-c", "#f472b6"],
  ["⚖️", "chip-d", "#fbbf24"],
  ["🔬", "chip-e", "#4f6df5"],
  ["🏗️", "chip-f", "#a78bfa"],
];

/**
 * Hero visual without WebGL: a morphing liquid-gradient blob with a
 * "Who will you be?" question in the middle, where the career name keeps
 * flipping, surrounded by floating emoji chips. Pure CSS + a timer.
 */
export default function KineticHero() {
  const { t } = useTranslation();
  const careers = t("landing.kineticCareers", { returnObjects: true }) as string[];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((n) => n + 1), 1800);
    return () => window.clearInterval(id);
  }, []);

  const word = careers[i % careers.length];

  return (
    <div className="kinetic relative w-full h-full flex items-center justify-center" aria-hidden="true" data-ready="true">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />
      <div className="relative z-10 text-center px-6">
        <p className="text-base sm:text-xl font-bold text-white/85 mb-2">{t("landing.kineticQuestion")}</p>
        <p key={i} className="kinetic-word text-5xl sm:text-7xl font-black text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]">
          {word}
        </p>
      </div>
      {CHIPS.map(([emoji, cls, color]) => (
        <span key={cls} className={`chip ${cls}`} style={{ boxShadow: `0 10px 40px -8px ${color}` }}>
          {emoji}
        </span>
      ))}
    </div>
  );
}
