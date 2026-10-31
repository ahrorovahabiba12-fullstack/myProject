import { AIProvider, CareerRecommendationInput, CareerRecommendationOutput, ChatContext, ChatMessageInput, DailyCoachInput, DailyCoachOutput, LearningRecommendationInput, LearningRecommendationOutput, ParentReportInput, ParentReportOutput, ProgressAnalysisInput, ProgressAnalysisOutput } from "./AIProvider";

/**
 * Fully static provider for tests and offline demos — no computation over
 * input, just stable canned output so snapshot tests never flake.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async getLearningRecommendation(_i: LearningRecommendationInput): Promise<LearningRecommendationOutput> {
    return {
      title: "Demo tavsiya",
      items: [{ subjectCode: "MATH", reason: "Demo sabab", minutesPerWeek: 90, priority: 1 }],
      confidence: 0.5,
    };
  }

  async getCareerRecommendation(_i: CareerRecommendationInput): Promise<CareerRecommendationOutput> {
    return { careers: [{ careerCode: "SOFTWARE_ENGINEER", matchScore: 0.8, reasoning: "Demo sabab" }] };
  }

  async generateParentReport(_i: ParentReportInput): Promise<ParentReportOutput> {
    return {
      summary: "Demo hisobot",
      strengths: ["Matematika"],
      attentionAreas: ["Ingliz tili"],
      nextSteps: ["Demo qadam"],
    };
  }

  async chat(_c: ChatContext, _h: ChatMessageInput[], _m: string): Promise<string> {
    return "Bu demo rejimidagi javob.";
  }

  async analyzeProgress(_i: ProgressAnalysisInput): Promise<ProgressAnalysisOutput> {
    return { improvement: "Demo tahlil", weakPoints: [], nextSteps: ["Demo qadam"] };
  }

  async generateDailyCoachMessage(_i: DailyCoachInput): Promise<DailyCoachOutput> {
    return { message: "Demo kunlik xabar", recommendedActions: ["Demo harakat"] };
  }
}
