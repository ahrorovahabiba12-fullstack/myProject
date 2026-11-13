import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Sparkles, BookOpenCheck, TrendingUp, Trophy, Compass, User, Settings, FileText, Menu, X } from "lucide-react";
import clsx from "clsx";
import { LogoIcon } from "../icons/LogoIcon";

type Props = { careerVisible: boolean; grade?: number };

export function StudentSidebar(props: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 z-20 h-screen overflow-y-auto sidebar-3d text-white px-4 py-6 gap-1">
      <SidebarContent {...props} />
    </aside>
  );
}

/** Mobile: a ☰ button that opens the same menu as a slide-in drawer. */
export function MobileMenu(props: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("nav_sidebar.openMenu")}
        aria-expanded={open}
        className="lg:hidden mr-auto w-10 h-10 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] flex items-center justify-center"
      >
        <Menu size={20} />
      </button>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col overflow-y-auto sidebar-3d text-white px-4 py-6 gap-1 shadow-2xl animate-slide-in">
            <button
              onClick={() => setOpen(false)}
              aria-label={t("nav_sidebar.closeMenu")}
              className="absolute right-3 top-6 w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"
            >
              <X size={20} />
            </button>
            <SidebarContent {...props} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({ careerVisible, grade }: Props) {
  const { t } = useTranslation();

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav_sidebar.dashboard") },
    { to: "/quiz", icon: BookOpenCheck, label: t("nav_sidebar.quiz") },
    ...(careerVisible
      ? [
          { to: "/career", icon: Compass, label: t("nav_sidebar.career") },
          { to: "/dtm", icon: FileText, label: t("nav_sidebar.dtm") },
        ]
      : []),
    { to: "/chat", icon: Sparkles, label: t("nav_sidebar.aiChat") },
    { to: "/progress", icon: TrendingUp, label: t("nav_sidebar.progress") },
    { to: "/achievements", icon: Trophy, label: t("nav_sidebar.achievements") },
    { to: "/profile", icon: User, label: t("nav_sidebar.profile") },
    { to: "/settings", icon: Settings, label: t("nav_sidebar.settings") },
  ];

  return (
    <>
      <div className="flex items-center gap-2.5 font-bold text-lg px-2 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center icon-3d glow-violet logo-3d">
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
    </>
  );
}
