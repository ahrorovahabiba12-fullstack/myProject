import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { t } = useTranslation();
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label={t("settings.toggleTheme")}
      className="w-9 h-9 rounded-full border border-[var(--border-subtle)] flex items-center justify-center bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-brand-500 transition-colors"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
