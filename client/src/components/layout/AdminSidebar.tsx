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
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#1a1533] text-white min-h-screen px-4 py-6 gap-1">
      <div className="flex items-center gap-2 font-bold text-lg px-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
          <ShieldCheck size={18} />
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
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              isActive ? "bg-brand-500 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <item.icon size={18} />
          {item.label}
        </NavLink>
      ))}
    </aside>
  );
}
