import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Sparkles, BookOpenCheck, TrendingUp, Trophy, Compass, User, Settings } from "lucide-react";
import clsx from "clsx";
import { LogoIcon } from "../icons/LogoIcon";

export function StudentSidebar({ careerVisible, grade }: { careerVisible: boolean; grade?: number }) {
  const { t } = useTranslation();

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav_sidebar.dashboard") },
    { to: "/quiz", icon: BookOpenCheck, label: t("nav_sidebar.quiz") },
    ...(careerVisible ? [{ to: "/career", icon: Compass, label: t("nav_sidebar.career") }] : []),
    { to: "/chat", icon: Sparkles, label: t("nav_sidebar.aiChat") },
    { to: "/progress", icon: TrendingUp, label: t("nav_sidebar.progress") },
    { to: "/achievements", icon: Trophy, label: t("nav_sidebar.achievements") },
    { to: "/profile", icon: User, label: t("nav_sidebar.profile") },
    { to: "/settings", icon: Settings, label: t("nav_sidebar.settings") },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen overflow-y-auto bg-[#1a1533] text-white px-4 py-6 gap-1">
      <div className="flex items-center gap-2.5 font-bold text-lg px-2 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-900/40">
          <LogoIcon size={20} />
        </div>
        AI Advisor
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-colors",
              isActive ? "bg-brand-gradient text-white shadow-md shadow-brand-900/40" : "text-white/70 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <item.icon size={19} />
          {item.label}
        </NavLink>
      ))}
      {grade !== undefined && (
        <div className="mt-auto rounded-2xl bg-white/5 px-4 py-3 text-sm">
          <p className="text-white/60 text-xs">{t("auth.grade")}</p>
          <p className="font-bold">
            {grade}-{t("profile.grade")}
          </p>
        </div>
      )}
    </aside>
  );
}
