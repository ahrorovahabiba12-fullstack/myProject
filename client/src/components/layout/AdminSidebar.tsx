import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, ShieldCheck, Bell } from "lucide-react";
import clsx from "clsx";

export function useAdminNavItems() {
  const { t } = useTranslation();
  return [
    { to: "/admin", icon: LayoutDashboard, label: t("nav_sidebar.adminDashboard"), end: true },
    { to: "/admin/users", icon: Users, label: t("nav_sidebar.adminUsers"), end: false },
    { to: "/admin/notifications", icon: Bell, label: t("nav_sidebar.adminNotifications"), end: false },
  ];
}

export function AdminSidebar() {
  const items = useAdminNavItems();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 z-20 h-screen overflow-y-auto sidebar-3d text-white px-4 py-6 gap-1">
      <div className="flex items-center gap-2.5 font-bold text-lg px-2 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center icon-3d glow-violet logo-3d">
          <ShieldCheck size={20} />
        </div>
        AI Advisor
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
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
    </aside>
  );
}
