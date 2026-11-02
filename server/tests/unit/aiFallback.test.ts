import { describe, it, expect, vi } from "vitest";
import { FallbackAIProvider } from "../../src/providers/ai";
import { AIProvider } from "../../src/providers/ai/AIProvider";

function makeProvider(name: string, overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    name,
    getLearningRecommendation: vi.fn(),
    getCareerRecommendation: vi.fn(),
    generateParentReport: vi.fn(),
    chat: vi.fn(),
    analyzeProgress: vi.fn(),
    ...overrides,
  } as unknown as AIProvider;
}

describe("FallbackAIProvider — AI failure falls back to RuleBasedProvider (never surfaces a broken-AI error)", () => {
  it("returns the primary provider's result when the primary succeeds", async () => {
    const primary = makeProvider("openai", { chat: vi.fn().mockResolvedValue("primary reply") });
    const fallback = makeProvider("rule-based", { chat: vi.fn().mockResolvedValue("fallback reply") });
    const provider = new FallbackAIProvider(primary, fallback);

    const reply = await provider.chat({} as any, [], "hi");

    expect(reply).toBe("primary reply");
    expect(fallback.chat).not.toHaveBeenCalled();
  });

  it("transparently falls back to the rule-based provider when the primary throws", async () => {
    const primary = makeProvider("openai", { chat: vi.fn().mockRejectedValue(new Error("network down")) });
    const fallback = makeProvider("rule-based", { chat: vi.fn().mockResolvedValue("fallback reply") });
    const provider = new FallbackAIProvider(primary, fallback);

    const reply = await provider.chat({} as any, [], "hi");

    expect(reply).toBe("fallback reply");
  });

  it("falls back for every AIProvider method, not just chat", async () => {
    const primary = makeProvider("openai", {
      analyzeProgress: vi.fn().mockRejectedValue(new Error("bad json")),
    });
    const fallback = makeProvider("rule-based", {
      analyzeProgress: vi.fn().mockResolvedValue({ items: [] }),
    });
    const provider = new FallbackAIProvider(primary, fallback);

    const plan = await provider.analyzeProgress({} as any);

    expect(plan).toEqual({ items: [] });
  });

  it("propagates the error if the fallback also fails (never silently returns nothing)", async () => {
    const primary = makeProvider("openai", { chat: vi.fn().mockRejectedValue(new Error("network down")) });
    const fallback = makeProvider("rule-based", { chat: vi.fn().mockRejectedValue(new Error("fallback broke too")) });
    const provider = new FallbackAIProvider(primary, fallback);

    await expect(provider.chat({} as any, [], "hi")).rejects.toThrow("fallback broke too");
  });
});
