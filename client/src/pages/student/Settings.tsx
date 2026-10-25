import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { ThemeToggle } from "../../components/layout/ThemeToggle";

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    if (!window.confirm(t("settings.confirmLogout"))) return;
    try {
      await authApi.logout();
    } catch {
      // Logging out locally still succeeds even if the network call fails.
    }
    clearSession();
    // Logout is an in-app navigation, not a reload — without this the next
    // person to log in on this device would briefly see this user's cached
    // profile, chat and progress before their own data arrives.
    queryClient.clear();
    navigate("/login");
  };

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card className="flex items-center justify-between">
        <span className="font-medium">{t("settings.language")}</span>
        <LanguageSwitcher />
      </Card>

      <Card className="flex items-center justify-between">
        <span className="font-medium">{t("settings.appearance")}</span>
        <ThemeToggle />
      </Card>

      <Card>
        <Button variant="secondary" onClick={handleLogout} className="text-danger border-red-200">
          <LogOut size={16} className="inline mr-1.5" /> {t("settings.logout")}
        </Button>
      </Card>
    </div>
  );
}
