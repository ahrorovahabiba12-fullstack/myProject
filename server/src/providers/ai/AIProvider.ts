import { Lang } from "../../middleware/language";

/**
 * Every AI-backed capability the product needs, behind one interface.
 * RecommendationService and others depend on THIS, never on a concrete
 * provider — swapping OpenAI for a mock/rule-based fallback is a config
 * change (AI_PROVIDER env var), not a code change (Dependency Inversion).
 */
export interface LearningRecommendationInput {
  lang: Lang;
  grade: number;
  interests: string[];
  favoriteSubjects: string[];
  subjectLevels: { subjectCode: string; subjectName: string; level: "WEAK" | "MEDIUM" | "STRONG"; score: number }[];
  goals: string[];
}

export interface LearningRecommendationOutput {
  title: string;
  items: { subjectCode: string; reason: string; minutesPerWeek: number; priority: number }[];
  confidence: number;
}

export interface CareerRecommendationInput {
  lang: Lang;
  grade: number;
  interests: string[];
  careerInterests: string[];
  subjectLevels: { subjectCode: string; subjectName: string; level: "WEAK" | "MEDIUM" | "STRONG"; score: number }[];
  // Real catalog data (which subjects each career actually requires) — lets
  // the match score/reasoning be grounded in genuine subject-career overlap
  // instead of citing whichever subjects the student happens to be strong
  // in, regardless of relevance to that specific career.
  catalog: { code: string; requiredSubjects: string[] }[];
}

export interface CareerRecommendationOutput {
  careers: { careerCode: string; matchScore: number; reasoning: string }[];
}

export interface ParentReportInput {
  lang: Lang;
  studentName: string;
  grade: number;
  weeklyStudyMinutes: number;
  quizAverage: number;
  quizCount: number;
  streakDays: number;
  strongSubjects: string[];
  weakSubjects: string[];
}

export interface ParentReportOutput {
  summary: string;
  strengths: string[];
  attentionAreas: string[];
  nextSteps: string[];
}

export interface LearningPlanInput {
  grade: number;
  weakSubjects: { code: string; nameUz: string; nameRu: string }[];
  mediumSubjects: { code: string; nameUz: string; nameRu: string }[];
  strongSubjects: { code: string; nameUz: string; nameRu: string }[];
  // Subjects the student hasn't been tested in yet (no weak/strong signal). Included so
  // the week isn't limited to only the 1-2 subjects that happen to have a quiz result —
  // broad, everyday-useful subjects deserve occasional exposure too.
  neutralSubjects: { code: string; nameUz: string; nameRu: string }[];
  availableMinutesPerDay: number;
}

// Both title fields are always generated together (not just the caller's current
// UI language) and stored side by side — a weekly plan carries real status/study-session
// state per item, so unlike other AI content it's never silently regenerated just because
// the student toggles the UI language; storing both up front is what keeps it in sync.
export interface LearningPlanOutput {
  days: { dayOfWeek: number; subjectCode: string; minutes: number; title: string; titleRu: string }[];
}

export interface ChatMessageInput {
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface ChatContext {
  lang: Lang;
  studentName: string;
  grade: number;
  interests: string[];
  subjectLevels: { subjectCode: string; subjectName: string; level: string; score: number }[];
  goals: string[];
  careerInterests: string[];
  recentProgressSummary: string;
}

export interface ProgressAnalysisInput {
  lang: Lang;
  weeklyStudyMinutes: number[];
  quizScores: number[];
  subjectTrends: { subjectCode: string; subjectName: string; delta: number }[];
}

export interface ProgressAnalysisOutput {
  improvement: string;
  weakPoints: string[];
  nextSteps: string[];
}

export interface DailyCoachInput {
  lang: Lang;
  studentName: string;
  grade: number;
  weakSubjects: string[];
  currentStreak: number;
  studiedYesterday: boolean;
  // True only when the student has NEVER recorded any activity at all — distinct
  // from studiedYesterday=false, which also (wrongly) covers a brand-new account
  // and would otherwise claim a "break" that never happened.
  isNewStudent: boolean;
  // True when the student has already completed something TODAY — takes priority
  // over studiedYesterday/isNewStudent framing, which both assume the day hasn't
  // started yet and would otherwise contradict an already-shown "done today" badge.
  activeToday: boolean;
}

export interface DailyCoachOutput {
  message: string;
  recommendedActions: string[];
}

export interface AIProvider {
  readonly name: string;
  getLearningRecommendation(input: LearningRecommendationInput): Promise<LearningRecommendationOutput>;
  getCareerRecommendation(input: CareerRecommendationInput): Promise<CareerRecommendationOutput>;
  generateParentReport(input: ParentReportInput): Promise<ParentReportOutput>;
  generateLearningPlan(input: LearningPlanInput): Promise<LearningPlanOutput>;
  chat(context: ChatContext, history: ChatMessageInput[], userMessage: string): Promise<string>;
  analyzeProgress(input: ProgressAnalysisInput): Promise<ProgressAnalysisOutput>;
  generateDailyCoachMessage(input: DailyCoachInput): Promise<DailyCoachOutput>;
}
