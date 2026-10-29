import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut } from "lucide-react";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { ThemeToggle } from "../../components/layout/ThemeToggle";
import { NotificationPanel } from "../../components/layout/NotificationPanel";
import { LogoIcon } from "../../components/icons/LogoIcon";

export default function ParentLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

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
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="border-b border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-bold">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
              <LogoIcon size={16} />
            </div>
            {t("parent.headerTitle")}
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <NavLink to="/parent" end className="flex items-center gap-1.5 text-[var(--text-secondary)] [&.active]:text-brand-600">
              <LayoutDashboard size={16} /> {t("parent.dashboard")}
            </NavLink>
            <NotificationPanel />
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              aria-label={t("parent.logout")}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-danger"
            >
              <LogOut size={16} />
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-sm text-[var(--text-secondary)] mb-1">{t("parent.welcome")}, {user?.fullName}</p>
        <Outlet />
      </main>
    </div>
  );
}
