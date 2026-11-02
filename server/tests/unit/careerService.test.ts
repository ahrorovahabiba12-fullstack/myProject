import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { CareerService } from "../../src/services/careerService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser, createCareer, createSubject } from "../helpers/fixtures";

// NODE_ENV=test (set by vitest) makes getAIProvider() resolve to the real
// MockAIProvider, which always returns a SOFTWARE_ENGINEER recommendation
// regardless of input — deterministic, no network, and a real production
// code path rather than a hand-rolled test double.
describe("CareerService — grade business rule (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("rejects career recommendations for grade 7, and never persists a recommendation", async () => {
    const { student } = await createStudentUser({ grade: 7 });
    await createCareer({ code: "SOFTWARE_ENGINEER" });
    const service = new CareerService();

    await expect(service.getCareerRecommendations(student.id, "uz")).rejects.toMatchObject({ statusCode: 403 });

    const saved = await prisma.careerRecommendation.findMany({ where: { studentId: student.id } });
    expect(saved).toHaveLength(0);
  });

  it("allows career recommendations for grade 8+ and persists the match", async () => {
    const { student } = await createStudentUser({ grade: 8 });
    await createCareer({ code: "SOFTWARE_ENGINEER", nameUz: "Dasturchi", nameRu: "Программист" });

    const service = new CareerService();
    const result = await service.getCareerRecommendations(student.id, "uz");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ career: { code: "SOFTWARE_ENGINEER", name: "Dasturchi" } });

    const saved = await prisma.careerRecommendation.findMany({ where: { studentId: student.id } });
    expect(saved).toHaveLength(1);
  });

  it("skips a recommendation for a career code that isn't in our catalog (no hallucinated careers persisted)", async () => {
    const { student } = await createStudentUser({ grade: 10 });
    // Deliberately no SOFTWARE_ENGINEER career row — the mock AI provider's
    // fixed response now stands in for a hallucinated/unknown career code.

    const service = new CareerService();
    const result = await service.getCareerRecommendations(student.id, "uz");

    expect(result).toHaveLength(0);
    const saved = await prisma.careerRecommendation.findMany({ where: { studentId: student.id } });
    expect(saved).toHaveLength(0);
  });
});

describe("CareerService.listUniversities (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("localizes name, description, city, and country against the requested language", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "INFORMATICS" });
    await createSubject({ code: "INFORMATICS", nameUz: "Informatika", nameRu: "Информатика" });
    await prisma.university.create({
      data: {
        nameUz: "TATU",
        nameRu: "ТУИТ",
        description: "Yetakchi IT universiteti",
        descriptionRu: "Ведущий IT-вуз",
        country: "O'zbekiston",
        countryRu: "Узбекистан",
        city: "Toshkent",
        cityRu: "Ташкент",
        programs: ["IT"],
      },
    });

    const uz = await new CareerService().listUniversities(student.id, "uz");
    const ru = await new CareerService().listUniversities(student.id, "ru");

    expect(uz.universities[0]).toMatchObject({ name: "TATU", description: "Yetakchi IT universiteti", city: "Toshkent", country: "O'zbekiston" });
    expect(ru.universities[0]).toMatchObject({ name: "ТУИТ", description: "Ведущий IT-вуз", city: "Ташкент", country: "Узбекистан" });
  });

  it("falls back to the Uzbek city/country when a row hasn't been backfilled with Russian values yet", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "INFORMATICS" });
    await createSubject({ code: "INFORMATICS", nameUz: "Informatika", nameRu: "Информатика" });
    await prisma.university.create({
      data: { nameUz: "TATU", nameRu: "ТУИТ", country: "O'zbekiston", city: "Toshkent", programs: ["IT"] },
    });

    const ru = await new CareerService().listUniversities(student.id, "ru");

    expect(ru.universities[0]).toMatchObject({ city: "Toshkent", country: "O'zbekiston" });
  });

  it("rejects for grade < 8 same as other career-module endpoints", async () => {
    const { student } = await createStudentUser({ grade: 7 });

    await expect(new CareerService().listUniversities(student.id, "uz")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns an empty list with no top subject when the student has no quiz activity yet", async () => {
    const { student } = await createStudentUser({ grade: 9 }); // no subjectLevels
    await prisma.university.create({
      data: { nameUz: "TATU", nameRu: "ТУИТ", country: "O'zbekiston", city: "Toshkent", programs: ["IT"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result).toEqual({ universities: [], topSubject: null });
  });

  it("uses the strongest quiz-derived subject", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: math.id, level: "STRONG", score: 90, source: "quiz" } });
    const mathUni = await prisma.university.create({
      data: { nameUz: "Math Uni", nameRu: "Math Uni", country: "O'zbekiston", city: "Toshkent", programs: ["Mathematics"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.topSubject).toBe("Matematika");
    expect(result.universities.map((u) => u.id)).toContain(mathUni.id);
  });

  it("picks the highest-scoring subject when the student has several STRONG ones", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const history = await createSubject({ code: "HISTORY", nameUz: "Tarix", nameRu: "История" });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: math.id, level: "STRONG", score: 85, source: "quiz" } });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: history.id, level: "STRONG", score: 100, source: "quiz" } });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.topSubject).toBe("Tarix");
  });

  it("falls back to a MEDIUM or WEAK subject too — any quiz signal beats none", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: math.id, level: "MEDIUM", score: 60, source: "quiz" } });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.topSubject).toBe("Matematika");
  });

  it("picks the highest score overall even when it belongs to a lower level (a higher-scoring MEDIUM beats a lower-scoring STRONG)", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const math = await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    const history = await createSubject({ code: "HISTORY", nameUz: "Tarix", nameRu: "История" });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: math.id, level: "STRONG", score: 70, source: "quiz" } });
    await prisma.subjectLevel.create({ data: { studentId: student.id, subjectId: history.id, level: "MEDIUM", score: 85, source: "quiz" } });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.topSubject).toBe("Tarix");
  });

  it("only shows universities matching the student's top subject, not every subject they might like", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "INFORMATICS" });
    await createSubject({ code: "INFORMATICS", nameUz: "Informatika", nameRu: "Информатика" });
    const itUni = await prisma.university.create({
      data: { nameUz: "IT Uni", nameRu: "IT Uni", country: "O'zbekiston", city: "Toshkent", programs: ["IT"] },
    });
    const historyUni = await prisma.university.create({
      data: { nameUz: "History Uni", nameRu: "History Uni", country: "O'zbekiston", city: "Toshkent", programs: ["History"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.topSubject).toBe("Informatika");
    expect(result.universities.map((u) => u.id)).toEqual([itUni.id]);
    expect(result.universities.map((u) => u.id)).not.toContain(historyUni.id);
  });
});

describe("CareerService.listUniversities — filtering by the student's top quiz subject (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("includes a university with a matching program and excludes one with none", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "MATH" });
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });

    const irrelevant = await prisma.university.create({
      data: { nameUz: "Irrelevant Uni", nameRu: "Irrelevant Uni", country: "O'zbekiston", city: "Toshkent", programs: ["Fine Arts"] },
    });
    const relevant = await prisma.university.create({
      data: { nameUz: "TATU", nameRu: "ТУИТ", country: "O'zbekiston", city: "Toshkent", programs: ["Software Engineering"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.universities.map((u) => u.id)).toContain(relevant.id);
    expect(result.universities.map((u) => u.id)).not.toContain(irrelevant.id);
  });

  it("uses only the top subject", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "MATH" });
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });

    const mathUni = await prisma.university.create({
      data: { nameUz: "Math Uni", nameRu: "Math Uni", country: "O'zbekiston", city: "Toshkent", programs: ["Mathematics"] },
    });
    const historyUni = await prisma.university.create({
      data: { nameUz: "History Uni", nameRu: "History Uni", country: "O'zbekiston", city: "Toshkent", programs: ["History"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.universities.map((u) => u.id)).toContain(mathUni.id);
    expect(result.universities.map((u) => u.id)).not.toContain(historyUni.id);
  });

  it("never lets a short program name like 'IT' false-match an unrelated program like 'Literature'", async () => {
    const { student } = await createStudentUser({ grade: 9, fullName: "Info Student", topSubject: "INFORMATICS" });
    await createSubject({ code: "INFORMATICS", nameUz: "Informatika", nameRu: "Информатика" });

    const litUni = await prisma.university.create({
      data: { nameUz: "Lit Uni", nameRu: "Lit Uni", country: "O'zbekiston", city: "Toshkent", programs: ["Literature"] },
    });
    const itUni = await prisma.university.create({
      data: { nameUz: "IT Uni", nameRu: "IT Uni", country: "O'zbekiston", city: "Toshkent", programs: ["IT"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.universities.map((u) => u.id)).not.toContain(litUni.id);
    expect(result.universities.map((u) => u.id)).toContain(itUni.id);
  });
});

describe("CareerService.listUniversities — region is a hard filter (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("hides a university outside the student's own region entirely", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "MATH", region: "SAMARKAND" });
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });

    const tashkentUni = await prisma.university.create({
      data: { nameUz: "Tashkent Math Uni", nameRu: "Tashkent Math Uni", country: "O'zbekiston", city: "Toshkent", region: "TASHKENT_CITY", programs: ["Mathematics"] },
    });
    const samarkandUni = await prisma.university.create({
      data: { nameUz: "Samarkand Math Uni", nameRu: "Samarkand Math Uni", country: "O'zbekiston", city: "Samarqand", region: "SAMARKAND", programs: ["Mathematics"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    const ids = result.universities.map((u) => u.id);
    expect(ids).toContain(samarkandUni.id);
    expect(ids).not.toContain(tashkentUni.id); // fully hidden, not just ranked lower
  });

  it("returns an empty list when nothing in the student's region matches their top subject, instead of falling back to other regions", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "MATH", region: "SAMARKAND" });
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await prisma.university.create({
      data: { nameUz: "Tashkent Math Uni", nameRu: "Tashkent Math Uni", country: "O'zbekiston", city: "Toshkent", region: "TASHKENT_CITY", programs: ["Mathematics"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    expect(result.universities).toEqual([]);
  });

  it("shows universities from every region when the student hasn't set one yet", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "MATH" }); // no region
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });

    const aUni = await prisma.university.create({
      data: { nameUz: "A Uni", nameRu: "A Uni", country: "O'zbekiston", city: "Toshkent", region: "TASHKENT_CITY", programs: ["Mathematics"] },
    });
    const bUni = await prisma.university.create({
      data: { nameUz: "B Uni", nameRu: "B Uni", country: "O'zbekiston", city: "Samarqand", region: "SAMARKAND", programs: ["Mathematics"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    const ids = result.universities.map((u) => u.id);
    expect(ids).toContain(aUni.id);
    expect(ids).toContain(bUni.id);
  });

  it("returns the localized region name alongside each university", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "MATH" });
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await prisma.university.create({
      data: { nameUz: "Uni", nameRu: "Uni", country: "O'zbekiston", city: "Toshkent", region: "TASHKENT_CITY", programs: ["Mathematics"] },
    });

    const uz = await new CareerService().listUniversities(student.id, "uz");
    const ru = await new CareerService().listUniversities(student.id, "ru");

    expect(uz.universities[0].region).toBe("Toshkent shahri");
    expect(ru.universities[0].region).toBe("город Ташкент");
  });

  it("passes through the university's verified website when set, and an empty string when not", async () => {
    const { student } = await createStudentUser({ grade: 9, topSubject: "MATH" });
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await prisma.university.create({
      data: { nameUz: "With Site", nameRu: "With Site", country: "O'zbekiston", city: "Toshkent", programs: ["Mathematics"], website: "https://example.uz" },
    });
    await prisma.university.create({
      data: { nameUz: "No Site", nameRu: "No Site", country: "O'zbekiston", city: "Toshkent", programs: ["Mathematics"] },
    });

    const result = await new CareerService().listUniversities(student.id, "uz");

    const withSite = result.universities.find((u) => u.name === "With Site");
    const noSite = result.universities.find((u) => u.name === "No Site");
    expect(withSite?.website).toBe("https://example.uz");
    expect(noSite?.website).toBe("");
  });
});

describe("CareerService.listRoadmap — task/resource links (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("returns a link only for the items that have one, aligned by index", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const career = await createCareer({ code: "SOFTWARE_ENGINEER" });
    await prisma.careerRoadmapStep.create({
      data: {
        careerId: career.id,
        order: 1,
        title: "Asosiy fanlarni mustahkamlash",
        titleRu: "Укрепление базовых предметов",
        description: "desc",
        descriptionRu: "desc",
        tasks: ["Matematikadan mashq qiling", "Loyiha yarating"],
        tasksRu: ["Занимайтесь математикой", "Создайте проект"],
        taskLinks: ["/quiz", ""],
        resources: ["Khan Academy", "Maktab to'garagi"],
        resourcesRu: ["Khan Academy", "Школьный кружок"],
        resourceUrls: ["https://www.khanacademy.org/math", ""],
      },
    });

    const steps = await new CareerService().listRoadmap(student.id, "SOFTWARE_ENGINEER", "uz");

    expect(steps[0].taskLinks).toEqual(["/quiz", ""]);
    expect(steps[0].resourceUrls).toEqual(["https://www.khanacademy.org/math", ""]);
  });

  it("falls back to no links at all when a link array's length doesn't match its text array (avoids misaligned links)", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    const career = await createCareer({ code: "SOFTWARE_ENGINEER" });
    await prisma.careerRoadmapStep.create({
      data: {
        careerId: career.id,
        order: 1,
        title: "Step",
        titleRu: "Step",
        description: "desc",
        descriptionRu: "desc",
        tasks: ["Task A", "Task B"],
        tasksRu: ["Задача А", "Задача Б"],
        taskLinks: ["/quiz"], // deliberately shorter than tasks
        resources: ["Resource A"],
        resourcesRu: ["Ресурс А"],
        resourceUrls: [],
      },
    });

    const steps = await new CareerService().listRoadmap(student.id, "SOFTWARE_ENGINEER", "uz");

    expect(steps[0].taskLinks).toEqual(["", ""]);
    expect(steps[0].resourceUrls).toEqual([""]);
  });
});
