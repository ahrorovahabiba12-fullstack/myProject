import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sparkles, Brain, TrendingUp, GraduationCap, ClipboardCheck, Compass, Target, ChevronDown, ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { LogoIcon } from "../../components/icons/LogoIcon";
import { SpaceBackground } from "../../components/three/SpaceBackground";
import { useReveal } from "../../lib/useReveal";
import type { SceneVariant } from "../../components/three/HeroScene3D";

// three.js is heavy, so the 3D scene is downloaded separately, only here.
const HeroScene3D = lazy(() => import("../../components/three/HeroScene3D"));
const KineticHero = lazy(() => import("../../components/three/KineticHero"));

const FEATURES = [
  { icon: ClipboardCheck, titleKey: "landing.feature1Title", descKey: "landing.feature1Desc", color: "from-violet-500 to-fuchsia-500" },
  { icon: Brain, titleKey: "landing.feature2Title", descKey: "landing.feature2Desc", color: "from-cyan-400 to-blue-500" },
  { icon: TrendingUp, titleKey: "landing.feature3Title", descKey: "landing.feature3Desc", color: "from-amber-400 to-orange-500" },
  { icon: GraduationCap, titleKey: "landing.feature4Title", descKey: "landing.feature4Desc", color: "from-pink-500 to-rose-500" },
];

const STEPS = [
  { icon: ClipboardCheck, titleKey: "landing.step1Title", descKey: "landing.step1Desc" },
  { icon: Target, titleKey: "landing.step2Title", descKey: "landing.step2Desc" },
  { icon: Compass, titleKey: "landing.step3Title", descKey: "landing.step3Desc" },
];

export default function Landing() {
  const { t } = useTranslation();
  const revealRef = useReveal<HTMLDivElement>();
  // ?scene=planet|ai|path lets us preview the other 3D looks.
  const sceneParam = new URLSearchParams(window.location.search).get("scene");
  const variant: SceneVariant = (["planet", "ai", "path", "robot", "student"] as const).find((v) => v === sceneParam) ?? "robot";

  return (
    // The landing always uses the dark "space" look, whatever the app theme.
    <div ref={revealRef} className="dark space-page min-h-screen text-white overflow-x-hidden">
      <SpaceBackground />

      <header className="relative z-20 max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center gap-2 font-bold text-base sm:text-lg">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white icon-3d glow-violet">
            <LogoIcon size={18} />
          </div>
          <span className="leading-tight">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <Link to="/login" className="glass-btn">
              {t("landing.ctaLogin")}
            </Link>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.05fr_1fr] items-center min-h-[calc(100svh-80px)] pb-10">
        {/* 3D scene: behind the text on phones, on the right on desktop */}
        <div className="absolute inset-x-0 top-0 h-[52svh] lg:static lg:h-[620px] lg:order-2 -z-10 lg:z-0 opacity-90 lg:opacity-100">
          <Suspense fallback={null}>
            {sceneParam === "kinetic" ? <KineticHero /> : <HeroScene3D className="w-full h-full" variant={variant} />}
          </Suspense>
        </div>

        <div className="pt-[46svh] lg:pt-0 lg:order-1">
          <span className="hero-in inline-flex items-center gap-2 glass text-violet-100 text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
            <Sparkles size={14} className="text-amber-300" /> {t("landing.badge")}
          </span>
          <h1 className="hero-in [animation-delay:80ms] text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-black tracking-tight mb-3">
            {t("landing.title1")}
            <br />
            {t("landing.title2")}
          </h1>
          <p className="hero-in [animation-delay:160ms] text-4xl sm:text-5xl font-black italic text-gradient mb-6">{t("landing.titleHighlight")}</p>
          <p className="hero-in [animation-delay:240ms] text-base sm:text-lg text-violet-100/75 max-w-lg mb-8">{t("landing.subtitle")}</p>

          <div className="hero-in [animation-delay:320ms] flex flex-wrap gap-3 sm:gap-4">
            <Link to="/register" className="btn-glow">
              {t("landing.ctaRegister")} <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="glass-btn text-lg px-7 py-3.5">
              {t("landing.ctaLogin")}
            </Link>
          </div>

          <div className="hero-in [animation-delay:400ms] grid grid-cols-3 gap-2 sm:gap-4 mt-10 max-w-lg">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-xl sm:text-3xl font-black text-gradient">{t(`landing.stat${i}Value`)}</p>
                <p className="text-[11px] sm:text-xs text-violet-100/70 leading-tight mt-1">{t(`landing.stat${i}Label`)}</p>
              </div>
            ))}
          </div>
        </div>

        <a
          href="#how"
          className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-xs text-violet-200/60 hover:text-white transition-colors"
        >
          {t("landing.scrollHint")}
          <ChevronDown size={18} className="animate-bounce" />
        </a>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12" data-reveal>
          <span className="section-badge">{t("landing.howBadge")}</span>
          <h2 className="text-3xl sm:text-5xl font-black mt-4">{t("landing.howTitle")}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 sm:gap-6 [perspective:1200px]">
          {STEPS.map((s, i) => (
            <div key={s.titleKey} data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
              <div data-tilt className="glass-card h-full p-6 sm:p-7">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center icon-3d glow-violet">
                    <s.icon size={26} />
                  </div>
                  <span className="text-6xl font-black text-outline">0{i + 1}</span>
                </div>
                <p className="text-xl font-bold mb-2">{t(s.titleKey)}</p>
                <p className="text-violet-100/70">{t(s.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center mb-12" data-reveal>
          <span className="section-badge">{t("landing.featuresBadge")}</span>
          <h2 className="text-3xl sm:text-5xl font-black mt-4">{t("landing.featuresTitle")}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => (
            <div key={f.titleKey} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
              <div data-tilt className="glass-card h-full p-6 flex flex-col gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center icon-3d`}>
                  <f.icon size={22} />
                </div>
                <p className="font-bold text-lg">{t(f.titleKey)}</p>
                <p className="text-sm text-violet-100/70">{t(f.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Final call to action ---------- */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-20" data-reveal>
        <div className="cta-panel text-center px-6 py-12 sm:py-16">
          <h2 className="text-3xl sm:text-5xl font-black mb-3">{t("landing.ctaTitle")}</h2>
          <p className="text-violet-100/75 mb-8">{t("landing.ctaSub")}</p>
          <Link to="/register" className="btn-glow">
            {t("landing.ctaRegister")} <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-violet-100/50">
        © {new Date().getFullYear()} {t("app.name")}
      </footer>
    </div>
  );
}
