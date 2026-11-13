import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, BookOpenCheck, Compass, Trophy, Sparkles, User, FileText } from "lucide-react";
import clsx from "clsx";

export function MobileBottomNav({ careerVisible }: { careerVisible: boolean }) {
  const { t } = useTranslation();
  const items = [
    { to: "/dashboard", icon: Home, label: t("mobileNav.home") },
    { to: "/quiz", icon: BookOpenCheck, label: t("mobileNav.quiz") },
    careerVisible
      ? { to: "/career", icon: Compass, label: t("mobileNav.career") }
      : { to: "/achievements", icon: Trophy, label: t("mobileNav.achievements") },
    ...(careerVisible ? [{ to: "/dtm", icon: FileText, label: t("mobileNav.dtm") }] : []),
    { to: "/chat", icon: Sparkles, label: t("mobileNav.ai") },
    { to: "/profile", icon: User, label: t("mobileNav.profile") },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-nav border-t border-[var(--border-subtle)] flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold min-w-[52px] min-h-[48px] justify-center transition-colors",
              isActive ? "text-brand-600 bg-brand-50 dark:bg-brand-900/30" : "text-[var(--text-secondary)]"
            )
          }
        >
          <item.icon size={22} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
