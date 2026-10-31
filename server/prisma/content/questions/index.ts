import { SubjectQuestions } from "../types";
import { MATH } from "./math";
import { MATH_UPPER } from "./mathUpper";
import { PHYSICS } from "./physics";
import { ENGLISH } from "./english";
import { ENGLISH_UPPER } from "./englishUpper";
import { RUSSIAN } from "./russian";
import { BIOLOGY } from "./biology";

export const ALL_QUESTIONS: Record<string, SubjectQuestions> = {
  MATH: { ...MATH, ...MATH_UPPER },
  PHYSICS,
  ENGLISH: { ...ENGLISH, ...ENGLISH_UPPER },
  RUSSIAN,
  BIOLOGY,
};
