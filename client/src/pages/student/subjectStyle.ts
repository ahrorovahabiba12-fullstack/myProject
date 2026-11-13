import { BookOpen, BookOpenText, Calculator, Globe, Languages, Atom, FlaskConical, Sprout, Laptop, Landmark, type LucideIcon } from "lucide-react";

// Subject tiles: white card, a gradient circle with a white line icon (variant A
// Habiba picked), name and an arrow chip below.
export type SubjectLook = { Icon: LucideIcon; from: string; to: string };
const SUBJECT_STYLE: Record<string, SubjectLook> = {
  MATH: { Icon: Calculator, from: "#5b8cff", to: "#7c5cff" },
  MOTHER_LANG: { Icon: BookOpenText, from: "#8bc34a", to: "#3fae5a" },
  ENGLISH: { Icon: Globe, from: "#36c2e0", to: "#2f8ee8" },
  RUSSIAN: { Icon: Languages, from: "#f59e6b", to: "#ef6c5a" },
  PHYSICS: { Icon: Atom, from: "#4cc9a6", to: "#14a394" },
  CHEMISTRY: { Icon: FlaskConical, from: "#f7c948", to: "#f0a020" },
  BIOLOGY: { Icon: Sprout, from: "#9ccc65", to: "#43a047" },
  INFORMATICS: { Icon: Laptop, from: "#7a5cff", to: "#3d6fe0" },
  HISTORY: { Icon: Landmark, from: "#e0a15f", to: "#c2703d" },
};
export const styleFor = (code: string): SubjectLook =>
  SUBJECT_STYLE[code] ?? { Icon: BookOpen, from: "#8b6cff", to: "#6c3ffb" };
