import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sparkles, Brain, TrendingUp, GraduationCap, ClipboardCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { ThemeToggle } from "../../components/layout/ThemeToggle";
import { LogoIcon } from "../../components/icons/LogoIcon";

const FEATURES = [
  { icon: ClipboardCheck, titleKey: "landing.feature1Title", descKey: "landing.feature1Desc" },
  { icon: Brain, titleKey: "landing.feature2Title", descKey: "landing.feature2Desc" },
  { icon: TrendingUp, titleKey: "landing.feature3Title", descKey: "landing.feature3Desc" },
  { icon: GraduationCap, titleKey: "landing.feature4Title", descKey: "landing.feature4Desc" },
];

/** Purely decorative — same flat-vector, brand-colored illustration
 * language as the student dashboard's hero (graduation cap on a stack of
 * books), extended here with a compass and a growth line for "career" and
 * "progress" — original artwork, not a stock illustration. */
function HeroIllustration() {
  return (
    <svg width="100%" height="380" viewBox="0 0 420 380" className="max-w-[420px] justify-self-center hidden lg:block" aria-hidden="true">
      <defs>
        <linearGradient id="landingHeroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6c3ffb" />
          <stop offset="100%" stopColor="#4f6df5" />
        </linearGradient>
      </defs>
      <circle cx="210" cy="200" r="175" fill="url(#landingHeroGrad)" opacity="0.1" />
      <circle cx="90" cy="300" r="46" fill="#8b6bff" opacity="0.16" />

      {/* compass — career direction */}
      <circle cx="80" cy="90" r="42" fill="#ffffff" stroke="#cfc4ff" strokeWidth="3" />
      <path d="M80 66 L92 90 L80 114 L68 90 Z" fill="#4f6df5" />
      <circle cx="80" cy="90" r="5" fill="#1a1533" />

      {/* growth line */}
      <polyline points="250,270 290,240 320,255 360,190" fill="none" stroke="#4f6df5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M345,190 L365,185 L360,205 Z" fill="#4f6df5" />

      <circle cx="55" cy="200" r="5" fill="#f59e0b" />
      <circle cx="370" cy="110" r="4" fill="#6c3ffb" />
      <circle cx="330" cy="320" r="6" fill="#4f6df5" opacity="0.5" />
      <path d="M300 60 L303 68 L311 71 L303 74 L300 82 L297 74 L289 71 L297 68 Z" fill="#f59e0b" />

      {/* books + graduation cap */}
      <rect x="105" y="260" width="230" height="30" rx="8" fill="#4f6df5" />
      <rect x="130" y="230" width="185" height="27" rx="8" fill="#8b6bff" />
      <rect x="150" y="203" width="150" height="25" rx="8" fill="#ffffff" stroke="#cfc4ff" strokeWidth="2.5" />
      <polygon points="210,120 300,158 210,196 120,158" fill="#1a1533" />
      <circle cx="210" cy="158" r="9" fill="#6c3ffb" />
      <path d="M282 150 L290 200" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      <circle cx="291" cy="204" r="7" fill="#f59e0b" />
    </svg>
  );
}

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white">
            <LogoIcon size={18} />
          </div>
          {t("app.name")}
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center py-12">
          <div>
            <span className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              <Sparkles size={14} /> {t("landing.badge")}
            </span>
            <h1 className="text-5xl font-extrabold leading-tight mb-2">
              {t("landing.title1")}
              <br />
              {t("landing.title2")}
            </h1>
            <p className="text-4xl font-bold text-brand-500 italic mb-6">{t("landing.titleHighlight")}</p>
            <p className="text-lg text-[var(--text-secondary)] max-w-md mb-8">{t("landing.subtitle")}</p>

            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button className="text-lg px-7 py-3.5">{t("landing.ctaRegister")} →</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" className="text-lg px-7 py-3.5">
                  {t("landing.ctaLogin")}
                </Button>
              </Link>
            </div>
          </div>

          <HeroIllustration />
        </div>

        {/* Features — full-width row below the hero */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-16">
          {FEATURES.map((f) => (
            <div key={f.titleKey} data-tilt className="card flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-gradient flex items-center justify-center text-white icon-3d">
                <f.icon size={20} />
              </div>
              <p className="font-semibold">{t(f.titleKey)}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)] py-8 text-center text-sm text-[var(--text-secondary)]">
        © {new Date().getFullYear()} {t("app.name")}
      </footer>
    </div>
  );
}
