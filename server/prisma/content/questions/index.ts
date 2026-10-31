import { SubjectQuestions } from "../types";
import { MATH } from "./math";
import { PHYSICS } from "./physics";
import { ENGLISH } from "./english";
import { RUSSIAN } from "./russian";
import { BIOLOGY } from "./biology";

export const ALL_QUESTIONS: Record<string, SubjectQuestions> = { MATH, PHYSICS, ENGLISH, RUSSIAN, BIOLOGY };
