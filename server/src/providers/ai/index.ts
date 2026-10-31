import { env } from "../../config/env";
import {
  AIProvider,
  CareerRecommendationInput,
  CareerRecommendationOutput,
  ChatContext,
  ChatMessageInput,
  DailyCoachInput,
  DailyCoachOutput,
  LearningRecommendationInput,
  LearningRecommendationOutput,
  ParentReportInput,
  ParentReportOutput,
  ProgressAnalysisInput,
  ProgressAnalysisOutput,
} from "./AIProvider";
import { MockAIProvider } from "./MockAIProvider";
import { RuleBasedProvider } from "./RuleBasedProvider";
import { OpenAIProvider } from "./OpenAIProvider";

/**
 * Decorator: tries the primary provider first; on ANY failure (network,
 * invalid credentials, malformed JSON, schema mismatch) transparently
 * falls back to the deterministic rule-based provider so the product
 * never surfaces a broken AI feature to the user.
 */
export class FallbackAIProvider implements AIProvider {
  readonly name: string;
  constructor(private primary: AIProvider, private fallback: AIProvider = new RuleBasedProvider()) {
    this.name = `${primary.name}+fallback`;
  }

  private async run<T>(fn: (p: AIProvider) => Promise<T>): Promise<T> {
    try {
      return await fn(this.primary);
    } catch (err) {
      console.warn(`[AI] primary provider "${this.primary.name}" failed, using fallback:`, (err as Error).message);
      return fn(this.fallback);
    }
  }

  getLearningRecommendation(i: LearningRecommendationInput): Promise<LearningRecommendationOutput> {
    return this.run((p) => p.getLearningRecommendation(i));
  }
  getCareerRecommendation(i: CareerRecommendationInput): Promise<CareerRecommendationOutput> {
    return this.run((p) => p.getCareerRecommendation(i));
  }
  generateParentReport(i: ParentReportInput): Promise<ParentReportOutput> {
    return this.run((p) => p.generateParentReport(i));
  }
  chat(c: ChatContext, h: ChatMessageInput[], m: string): Promise<string> {
    return this.run((p) => p.chat(c, h, m));
  }
  analyzeProgress(i: ProgressAnalysisInput): Promise<ProgressAnalysisOutput> {
    return this.run((p) => p.analyzeProgress(i));
  }
  generateDailyCoachMessage(i: DailyCoachInput): Promise<DailyCoachOutput> {
    return this.run((p) => p.generateDailyCoachMessage(i));
  }
}

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;

  if (env.AI_PROVIDER === "openai" && env.AI_API_KEY) {
    cached = new FallbackAIProvider(new OpenAIProvider());
  } else if (env.NODE_ENV === "test") {
    cached = new MockAIProvider();
  } else {
    // No credential configured — rule-based fallback IS the primary provider.
    cached = new RuleBasedProvider();
  }
  return cached;
}
