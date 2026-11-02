import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, LogOut } from "lucide-react";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { ThemeToggle } from "../../components/layout/ThemeToggle";
import { AdminSidebar, useAdminNavItems } from "../../components/layout/AdminSidebar";

export default function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();
  const navItems = useAdminNavItems();

  const handleLogout = async () => {
    if (!window.confirm(t("settings.confirmLogout"))) return;
    try {
      await authApi.logout();
    } catch {
      /* local logout still proceeds */
    }
    clearSession();
    queryClient.clear(); // see Settings.tsx — never leak cached data to the next user
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <header className="border-b border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 font-bold lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
                <ShieldCheck size={16} />
              </div>
              {t("admin.headerTitle")}
            </div>
            <div className="hidden lg:block" />
            <nav className="flex items-center gap-4 text-sm font-medium">
              <ThemeToggle />
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                aria-label={t("admin.logout")}
                className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-danger"
              >
                <LogOut size={16} />
              </button>
            </nav>
          </div>
          {/* Mobile: the sidebar is hidden, so show its links as tabs. */}
          <nav className="lg:hidden flex gap-2 overflow-x-auto px-4 pb-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium",
                    isActive ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)]"
                  )
                }
              >
                <item.icon size={14} /> {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-[var(--text-secondary)] mb-1">
            {t("admin.welcome")}, {user?.fullName}
          </p>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
