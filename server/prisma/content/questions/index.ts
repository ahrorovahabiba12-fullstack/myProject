import { SubjectQuestions } from "../types";
import { MATH } from "./math";
import { MATH_UPPER } from "./mathUpper";
import { PHYSICS } from "./physics";
import { ENGLISH } from "./english";
import { ENGLISH_UPPER } from "./englishUpper";
import { RUSSIAN } from "./russian";
import { RUSSIAN_UPPER } from "./russianUpper";
import { BIOLOGY } from "./biology";
import { BIOLOGY_UPPER } from "./biologyUpper";

export const ALL_QUESTIONS: Record<string, SubjectQuestions> = {
  MATH: { ...MATH, ...MATH_UPPER },
  PHYSICS,
  ENGLISH: { ...ENGLISH, ...ENGLISH_UPPER },
  RUSSIAN: { ...RUSSIAN, ...RUSSIAN_UPPER },
  BIOLOGY: { ...BIOLOGY, ...BIOLOGY_UPPER },
};
