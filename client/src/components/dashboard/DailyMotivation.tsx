import { useTranslation } from "react-i18next";
import { Sprout, BookOpen, Rocket, Lightbulb, TrendingUp, KeyRound, Dumbbell, Star, Target, Flame, Trophy, DoorOpen, Sparkles, Hourglass } from "lucide-react";
import { Card } from "../ui/primitives";

// Kept in step order with the uz/ru quote arrays in the locale files —
// index i's icon illustrates quote i in every language (drawn icons, no emoji).
const ICONS = [Sprout, BookOpen, Rocket, Lightbulb, TrendingUp, KeyRound, Dumbbell, Star, Target, Flame, Trophy, DoorOpen, Sparkles, Hourglass];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function DailyMotivation() {
  const { t } = useTranslation();
  const quotes = t("dashboard.motivationalQuotes", { returnObjects: true }) as string[];
  if (!Array.isArray(quotes) || quotes.length === 0) return null;

  // Same index all day, changes tomorrow — deterministic from the calendar
  // date alone, no state or storage needed.
  const index = dayOfYear(new Date()) % quotes.length;

  return (
    <Card className="flex items-center gap-4 py-3">
      {(() => {
        const Icon = ICONS[index % ICONS.length];
        return (
          <span className="career-tile w-11 h-11 rounded-2xl inline-flex items-center justify-center text-white shrink-0" style={{ ["--c" as string]: "#f59e0b" }} aria-hidden="true">
            <Icon size={20} />
          </span>
        );
      })()}
      <p className="font-medium text-sm">{quotes[index]}</p>
    </Card>
  );
}
