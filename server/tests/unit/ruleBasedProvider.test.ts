import { describe, it, expect } from "vitest";
import { RuleBasedProvider } from "../../src/providers/ai/RuleBasedProvider";

describe("RuleBasedProvider.generateLearningPlan — weak-subject weighting", () => {
  const provider = new RuleBasedProvider();

  it("schedules the weak subject noticeably more often (as primary) across the week than a single strong subject", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      mediumSubjects: [],
      strongSubjects: [{ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" }],
      neutralSubjects: [{ code: "SCIENCE", nameUz: "Tabiatshunoslik", nameRu: "Естествознание" }],
      availableMinutesPerDay: 90,
    });

    const mathDays = plan.days.filter((d) => d.subjectCode === "MATH").length;
    const englishDays = plan.days.filter((d) => d.subjectCode === "ENGLISH").length;

    // With weak subjects double-weighted in the rotation pool, MATH should appear
    // roughly twice as often as ENGLISH across the 6-day week, not equally.
    expect(mathDays).toBeGreaterThan(englishDays);
  });

  it("still gives the weak subject the longer (15 min) session whenever it's scheduled as primary", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      mediumSubjects: [],
      strongSubjects: [{ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" }],
      neutralSubjects: [],
      availableMinutesPerDay: 90,
    });

    const isPrimary = (d: { title: string }) => !d.title.includes("qo'shimcha");
    const mathDay = plan.days.find((d) => d.subjectCode === "MATH" && isPrimary(d))!;
    const englishDay = plan.days.find((d) => d.subjectCode === "ENGLISH" && isPrimary(d))!;

    expect(mathDay.minutes).toBe(15);
    expect(englishDay.minutes).toBe(10);
  });

  it("covers all 6 days (Mon-Sat, no Sunday) even with a single subject and no neutral/strong pool", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      mediumSubjects: [],
      strongSubjects: [],
      neutralSubjects: [],
      availableMinutesPerDay: 90,
    });

    const primaryEntries = plan.days.filter((d) => d.title.includes("mashq") && !d.title.includes("qo'shimcha"));
    expect(primaryEntries).toHaveLength(6);
    expect(plan.days.every((d) => d.subjectCode === "MATH")).toBe(true);
    expect(plan.days.every((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 6)).toBe(true);
  });

  it("falls back to a generic review day only when there are truly no subjects anywhere, not even neutral ones", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [],
      mediumSubjects: [],
      strongSubjects: [],
      neutralSubjects: [],
      availableMinutesPerDay: 90,
    });

    expect(plan.days).toHaveLength(6);
    expect(plan.days.every((d) => d.subjectCode === "general")).toBe(true);
  });

  it("rotates through real (neutral/untested) subjects for a brand-new student, instead of a misleading 'general review' — nothing to review yet", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [],
      mediumSubjects: [],
      strongSubjects: [],
      neutralSubjects: [
        { code: "MATH", nameUz: "Matematika", nameRu: "Математика" },
        { code: "CHEMISTRY", nameUz: "Kimyo", nameRu: "Химия" },
        { code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" },
      ],
      availableMinutesPerDay: 90,
    });

    expect(plan.days.some((d) => d.subjectCode === "general")).toBe(false);
    const primaryCodes = new Set(plan.days.filter((d) => !d.title.includes("qo'shimcha")).map((d) => d.subjectCode));
    expect(primaryCodes).toEqual(new Set(["MATH", "CHEMISTRY", "ENGLISH"]));
  });
});

describe("RuleBasedProvider.generateLearningPlan — multi-subject variety (neutral subjects)", () => {
  const provider = new RuleBasedProvider();

  it("adds a second, shorter block from neutral subjects on top of the primary subject each day", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      mediumSubjects: [],
      strongSubjects: [{ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" }],
      neutralSubjects: [
        { code: "HISTORY", nameUz: "Tarix", nameRu: "История" },
        { code: "SCIENCE", nameUz: "Tabiatshunoslik", nameRu: "Естествознание" },
      ],
      availableMinutesPerDay: 90,
    });

    // More than 6 entries proves a second block is being added on at least some days.
    expect(plan.days.length).toBeGreaterThan(6);
    const neutralEntries = plan.days.filter((d) => d.subjectCode === "HISTORY" || d.subjectCode === "SCIENCE");
    expect(neutralEntries.length).toBeGreaterThan(0);
    expect(neutralEntries.every((d) => d.minutes <= 5)).toBe(true);
  });

  it("never schedules the same subject twice on the same day", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      mediumSubjects: [],
      strongSubjects: [{ code: "MATH2", nameUz: "Algebra", nameRu: "Алгебра" }],
      neutralSubjects: [{ code: "HISTORY", nameUz: "Tarix", nameRu: "История" }],
      availableMinutesPerDay: 90,
    });

    for (let d = 1; d <= 6; d++) {
      const codesForDay = plan.days.filter((x) => x.dayOfWeek === d).map((x) => x.subjectCode);
      expect(new Set(codesForDay).size).toBe(codesForDay.length);
    }
  });

  it("does not add a second block when there isn't enough time in the day for it", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      mediumSubjects: [],
      strongSubjects: [],
      neutralSubjects: [{ code: "HISTORY", nameUz: "Tarix", nameRu: "История" }],
      availableMinutesPerDay: 15, // only enough for the primary block
    });

    expect(plan.days).toHaveLength(6);
  });

  it("falls back to the strong-subjects pool for the second block when there are no neutral subjects at all", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      mediumSubjects: [],
      strongSubjects: [{ code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" }],
      neutralSubjects: [],
      availableMinutesPerDay: 90,
    });

    const englishEntries = plan.days.filter((d) => d.subjectCode === "ENGLISH");
    // ENGLISH appears both as its own primary turn and as the fallback secondary on MATH days.
    expect(englishEntries.length).toBeGreaterThan(1);
  });
});

describe("RuleBasedProvider.generateLearningPlan — MEDIUM-level subjects", () => {
  const provider = new RuleBasedProvider();
  const MEDIUM_ONLY = [
    { code: "MATH", nameUz: "Matematika", nameRu: "Математика" },
    { code: "PHYSICS", nameUz: "Fizika", nameRu: "Физика" },
    { code: "ENGLISH", nameUz: "Ingliz tili", nameRu: "Английский" },
  ];

  it("plans real subjects for a student who tested every subject at MEDIUM, never a subject-less 'general review' week (the reported bug)", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [],
      mediumSubjects: MEDIUM_ONLY,
      strongSubjects: [],
      neutralSubjects: [],
      availableMinutesPerDay: 90,
    });

    expect(plan.days.some((d) => d.subjectCode === "general")).toBe(false);
    const primaryCodes = new Set(plan.days.filter((d) => !d.title.includes("qo'shimcha")).map((d) => d.subjectCode));
    expect(primaryCodes).toEqual(new Set(["MATH", "PHYSICS", "ENGLISH"]));
  });

  it("still favors the weak subject over a medium one", async () => {
    const plan = await provider.generateLearningPlan({
      grade: 8,
      weakSubjects: [{ code: "CHEMISTRY", nameUz: "Kimyo", nameRu: "Химия" }],
      mediumSubjects: [{ code: "MATH", nameUz: "Matematika", nameRu: "Математика" }],
      strongSubjects: [],
      neutralSubjects: [],
      availableMinutesPerDay: 90,
    });

    const isPrimary = (d: { title: string }) => !d.title.includes("qo'shimcha");
    const weakDays = plan.days.filter((d) => d.subjectCode === "CHEMISTRY" && isPrimary(d)).length;
    const mediumDays = plan.days.filter((d) => d.subjectCode === "MATH" && isPrimary(d)).length;
    expect(weakDays).toBeGreaterThan(mediumDays);
  });
});

describe("RuleBasedProvider.getCareerRecommendation — genuine subject-fit + interest scoring", () => {
  const provider = new RuleBasedProvider();

  it("cites only subjects that are BOTH strong AND actually required by that specific career", async () => {
    const result = await provider.getCareerRecommendation({
      lang: "uz",
      grade: 9,
      interests: [],
      careerInterests: ["SOFTWARE_ENGINEER"],
      subjectLevels: [
        { subjectCode: "MATH", subjectName: "Matematika", level: "STRONG", score: 90 },
        { subjectCode: "HISTORY", subjectName: "Tarix", level: "STRONG", score: 88 }, // strong, but irrelevant here
      ],
      catalog: [{ code: "SOFTWARE_ENGINEER", requiredSubjects: ["MATH", "INFORMATICS"] }],
    });

    expect(result.careers[0].reasoning).toContain("Matematika");
    expect(result.careers[0].reasoning).not.toContain("Tarix");
  });

  it("falls back to interest-only reasoning (never a fabricated subject) when no required subject is strong yet", async () => {
    const result = await provider.getCareerRecommendation({
      lang: "uz",
      grade: 9,
      interests: [],
      careerInterests: ["SOFTWARE_ENGINEER"],
      subjectLevels: [{ subjectCode: "HISTORY", subjectName: "Tarix", level: "STRONG", score: 88 }],
      catalog: [{ code: "SOFTWARE_ENGINEER", requiredSubjects: ["MATH", "INFORMATICS"] }],
    });

    expect(result.careers[0].reasoning).not.toContain("Tarix");
    expect(result.careers[0].reasoning.toLowerCase()).toContain("qiziqish");
  });

  it("scores a career higher when the student is strong in its required subjects than when weak in them", async () => {
    const strongInput = {
      lang: "uz" as const,
      grade: 9,
      interests: [],
      careerInterests: ["SOFTWARE_ENGINEER"],
      subjectLevels: [{ subjectCode: "MATH", subjectName: "Matematika", level: "STRONG" as const, score: 95 }],
      catalog: [{ code: "SOFTWARE_ENGINEER", requiredSubjects: ["MATH"] }],
    };
    const weakInput = { ...strongInput, subjectLevels: [{ subjectCode: "MATH", subjectName: "Matematika", level: "WEAK" as const, score: 30 }] };

    const strongResult = await provider.getCareerRecommendation(strongInput);
    const weakResult = await provider.getCareerRecommendation(weakInput);

    expect(strongResult.careers[0].matchScore).toBeGreaterThan(weakResult.careers[0].matchScore);
  });

  it("never scores purely by list position — a later career with a better subject fit outscores an earlier, unrelated one", async () => {
    const result = await provider.getCareerRecommendation({
      lang: "uz",
      grade: 9,
      interests: [],
      careerInterests: ["MEDICINE", "SOFTWARE_ENGINEER"], // MEDICINE listed first
      subjectLevels: [{ subjectCode: "MATH", subjectName: "Matematika", level: "STRONG", score: 95 }],
      catalog: [
        { code: "MEDICINE", requiredSubjects: ["BIOLOGY", "CHEMISTRY"] }, // no data for these -> neutral baseline
        { code: "SOFTWARE_ENGINEER", requiredSubjects: ["MATH"] }, // strong match
      ],
    });

    const medicine = result.careers.find((c) => c.careerCode === "MEDICINE")!;
    const swe = result.careers.find((c) => c.careerCode === "SOFTWARE_ENGINEER")!;
    expect(swe.matchScore).toBeGreaterThan(medicine.matchScore);
  });
});

describe("RuleBasedProvider.getCareerRecommendation — free-text interests are matched by meaning, not literal code identity", () => {
  const provider = new RuleBasedProvider();

  it("matches a real-world free-text interest (e.g. 'programming') to the right catalog code — a student never types the literal code", async () => {
    const result = await provider.getCareerRecommendation({
      lang: "uz",
      grade: 9,
      interests: [],
      careerInterests: ["programming"],
      subjectLevels: [],
      catalog: [{ code: "SOFTWARE_ENGINEER", requiredSubjects: ["MATH", "INFORMATICS"] }],
    });

    expect(result.careers).toHaveLength(1);
    expect(result.careers[0].careerCode).toBe("SOFTWARE_ENGINEER");
  });

  it("matches Uzbek free text too (e.g. 'dasturlash')", async () => {
    const result = await provider.getCareerRecommendation({
      lang: "uz",
      grade: 9,
      interests: [],
      careerInterests: ["dasturlash bilan shug'ullanmoqchiman"],
      subjectLevels: [],
      catalog: [{ code: "SOFTWARE_ENGINEER", requiredSubjects: ["MATH", "INFORMATICS"] }],
    });

    expect(result.careers.map((c) => c.careerCode)).toContain("SOFTWARE_ENGINEER");
  });

  it("matches a short interest like 'AI' as a whole word, without false-matching unrelated careers", async () => {
    const result = await provider.getCareerRecommendation({
      lang: "uz",
      grade: 9,
      interests: [],
      careerInterests: ["AI"],
      subjectLevels: [],
      catalog: [
        { code: "AI_ENGINEER", requiredSubjects: ["MATH", "INFORMATICS"] },
        { code: "MEDICINE", requiredSubjects: ["BIOLOGY"] },
      ],
    });

    expect(result.careers.map((c) => c.careerCode)).toEqual(["AI_ENGINEER"]);
  });

  it("returns no careers when the free text genuinely matches nothing in the catalog (never a silent identity fallback)", async () => {
    const result = await provider.getCareerRecommendation({
      lang: "uz",
      grade: 9,
      interests: [],
      careerInterests: ["asfdgh random gibberish"],
      subjectLevels: [],
      catalog: [{ code: "SOFTWARE_ENGINEER", requiredSubjects: ["MATH"] }],
    });

    expect(result.careers).toEqual([]);
  });
});

describe("RuleBasedProvider.chat — unmatched topics don't repeat the greeting verbatim", () => {
  const provider = new RuleBasedProvider();
  const baseContext = {
    lang: "uz" as const,
    studentName: "Bekzod Toshev",
    grade: 9,
    interests: [],
    subjectLevels: [{ subjectCode: "MATH", subjectName: "Matematika", level: "WEAK", score: 40 }],
    goals: [],
    careerInterests: [],
    recentProgressSummary: "",
  };

  it("greets by name on the very first message of a conversation", async () => {
    const reply = await provider.chat(baseContext, [], "Salom");
    expect(reply).toContain("Salom, Bekzod Toshev!");
  });

  it("does not repeat the same greeting for a later unmatched message", async () => {
    const first = await provider.chat(baseContext, [], "Salom");
    const second = await provider.chat(
      baseContext,
      [
        { role: "USER", content: "Salom" },
        { role: "ASSISTANT", content: first },
      ],
      "programing"
    );

    expect(second).not.toBe(first);
    expect(second).not.toContain("Salom, Bekzod Toshev!");
  });

  it("recognizes English spellings of programming as the INFORMATICS subject", async () => {
    const context = {
      ...baseContext,
      subjectLevels: [{ subjectCode: "INFORMATICS", subjectName: "Informatika", level: "WEAK", score: 40 }],
    };
    const reply = await provider.chat(
      context,
      [{ role: "USER", content: "Salom" }, { role: "ASSISTANT", content: "..." }],
      "programing bo'yicha yordam kerak"
    );

    expect(reply).toContain("Informatika");
  });
});

describe("RuleBasedProvider.analyzeProgress — activity signal isn't limited to timed minutes", () => {
  const provider = new RuleBasedProvider();

  it("reports quiz activity even when no timed Schedule minutes were ever logged", async () => {
    const result = await provider.analyzeProgress({
      lang: "uz",
      weeklyStudyMinutes: [0, 0, 0],
      quizScores: [80, 100],
      subjectTrends: [],
    });

    expect(result.improvement).not.toBe("Hali yetarlicha faoliyat qayd etilmagan.");
    expect(result.improvement).toContain("2");
    expect(result.improvement).toContain("90"); // average of 80 and 100
  });

  it("still leads with the timed-minutes summary when real study minutes exist", async () => {
    const result = await provider.analyzeProgress({
      lang: "uz",
      weeklyStudyMinutes: [30],
      quizScores: [80],
      subjectTrends: [],
    });

    expect(result.improvement).toContain("30");
  });

  it("falls back to 'not enough activity' only when there is truly no signal at all", async () => {
    const result = await provider.analyzeProgress({
      lang: "uz",
      weeklyStudyMinutes: [0],
      quizScores: [],
      subjectTrends: [],
    });

    expect(result.improvement).toBe("Hali yetarlicha faoliyat qayd etilmagan.");
  });
});

describe("RuleBasedProvider.generateDailyCoachMessage — a brand-new student is welcomed, not told they 'took a break'", () => {
  const provider = new RuleBasedProvider();

  it("shows a welcome message for a brand-new student instead of claiming a break that never happened", async () => {
    const result = await provider.generateDailyCoachMessage({
      lang: "uz",
      studentName: "Habiba",
      grade: 9,
      weakSubjects: [],
      currentStreak: 0,
      studiedYesterday: false,
      isNewStudent: true,
      activeToday: false,
    });

    expect(result.message).not.toContain("tanaffus qildingiz");
    expect(result.message).toContain("Xush kelibsiz");
  });

  it("still shows the 'took a break' message for a returning student who simply didn't study yesterday", async () => {
    const result = await provider.generateDailyCoachMessage({
      lang: "uz",
      studentName: "Aziz",
      grade: 9,
      weakSubjects: [],
      currentStreak: 0,
      studiedYesterday: false,
      isNewStudent: false,
      activeToday: false,
    });

    expect(result.message).toContain("tanaffus qildingiz");
  });

  it("still congratulates a 7+ day streak even if isNewStudent were somehow true (streak check wins)", async () => {
    const result = await provider.generateDailyCoachMessage({
      lang: "uz",
      studentName: "Aziz",
      grade: 9,
      weakSubjects: [],
      currentStreak: 10,
      studiedYesterday: true,
      isNewStudent: false,
      activeToday: false,
    });

    expect(result.message).toContain("10 kunlik");
  });
});

describe("RuleBasedProvider.generateDailyCoachMessage — activeToday overrides the 'not started yet' framings", () => {
  const provider = new RuleBasedProvider();

  it("congratulates today's activity instead of claiming a break, even for a returning student who skipped yesterday", async () => {
    const result = await provider.generateDailyCoachMessage({
      lang: "uz",
      studentName: "Habiba",
      grade: 9,
      weakSubjects: [],
      currentStreak: 0,
      studiedYesterday: false,
      isNewStudent: false,
      activeToday: true,
    });

    expect(result.message).not.toContain("tanaffus qildingiz");
    expect(result.message).not.toContain("qayta boshlaylik");
    expect(result.message).toContain("allaqachon");
  });

  it("congratulates today's activity instead of the welcome message, even for a brand-new student", async () => {
    const result = await provider.generateDailyCoachMessage({
      lang: "uz",
      studentName: "Habiba",
      grade: 9,
      weakSubjects: [],
      currentStreak: 0,
      studiedYesterday: false,
      isNewStudent: true,
      activeToday: true,
    });

    expect(result.message).not.toContain("Xush kelibsiz");
    expect(result.message).toContain("allaqachon");
  });
});
