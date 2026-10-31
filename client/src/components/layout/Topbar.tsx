import { Flame, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationPanel } from "./NotificationPanel";

export function Topbar({ streakDays, points }: { streakDays: number; points: number }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-end gap-2 sm:gap-3 mb-6">
      <div className="flex items-center gap-1.5 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full px-3 sm:px-3.5 py-1.5 text-sm font-semibold">
        <Flame size={16} className="text-amber-500" /> {streakDays}
        <span className="hidden sm:inline">{t("topbar.streak")}</span>
      </div>
      <div className="flex items-center gap-1.5 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full px-3 sm:px-3.5 py-1.5 text-sm font-semibold">
        <Star size={16} className="text-brand-500" /> {points}
        <span className="hidden sm:inline">{t("topbar.points")}</span>
      </div>
      <NotificationPanel />
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  );
}
