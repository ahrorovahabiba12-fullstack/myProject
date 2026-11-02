import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { CareerChoiceService, riasecMatch, scoreTest } from "../../src/services/careerChoiceService";
import { CAREER_TEST } from "../../src/constants/careerTest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createCareer, createStudentUser, createSubject } from "../helpers/fixtures";

/** "Ha" (2) for every statement of the given types, "Yo'q" (0) otherwise. */
function answersFor(types: string[]): number[] {
  return CAREER_TEST.map((q) => (types.includes(q.type) ? 2 : 0));
}

describe("Kasb tanlash: interest test scoring", () => {
  it("has 6 statements per RIASEC type", () => {
    for (const t of ["R", "I", "A", "S", "E", "C"]) {
      expect(CAREER_TEST.filter((q) => q.type === t)).toHaveLength(6);
    }
  });

  it("scores each type 0–100 and returns the top three", () => {
    const { scores, topTypes } = scoreTest(answersFor(["I", "R"]));
    expect(scores.I).toBe(100);
    expect(scores.R).toBe(100);
    expect(scores.A).toBe(0);
    expect(topTypes.slice(0, 2).sort()).toEqual(["I", "R"]);
  });

  it("weighs a career's first type the most", () => {
    const scores = { I: 100, S: 0 };
    expect(riasecMatch(scores, ["I", "S"])).toBeGreaterThan(riasecMatch(scores, ["S", "I"]));
    expect(riasecMatch(scores, [])).toBe(0);
  });
});

describe("CareerChoiceService (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("is closed below grade 8 and saves nothing", async () => {
    const { student } = await createStudentUser({ grade: 7 });
    await expect(new CareerChoiceService().submitTest(student.id, answersFor(["I"]), "uz")).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.careerTestResult.count()).toBe(0);
  });

  it("ranks careers by the student's interest profile and keeps the latest result", async () => {
    const { student } = await createStudentUser({ grade: 9 });
    await createSubject({ code: "BIOLOGY", nameUz: "Biologiya", nameRu: "Биология" });
    await createSubject({ code: "MATH", nameUz: "Matematika", nameRu: "Математика" });
    await createCareer({ code: "MEDICINE", nameUz: "Shifokor", riasec: ["I", "S"], examSubjects: ["BIOLOGY", "MATH"] });
    await createCareer({ code: "DESIGNER", nameUz: "Dizayner", riasec: ["A", "R"], examSubjects: ["MATH", "BIOLOGY"] });
    const service = new CareerChoiceService();

    const result = await service.submitTest(student.id, answersFor(["I", "S"]), "uz");
    expect(result.careers.map((c) => c.code)).toEqual(["MEDICINE", "DESIGNER"]);
    expect(result.careers[0]).toMatchObject({ name: "Shifokor", matchScore: 1, examSubjects: ["Biologiya", "Matematika"] });

    await service.submitTest(student.id, answersFor(["A"]), "uz");
    const latest = await service.latest(student.id, "uz");
    expect(latest?.careers[0].code).toBe("DESIGNER");
  });

  it("shows exam blocks and puts universities in the student's region first", async () => {
    const { student } = await createStudentUser({ grade: 10, region: "SAMARKAND" });
    await createSubject({ code: "BIOLOGY" });
    await createSubject({ code: "CHEMISTRY" });
    await createCareer({ code: "MEDICINE", riasec: ["I", "S"], examSubjects: ["BIOLOGY", "CHEMISTRY"] });
    await prisma.university.createMany({
      data: [
        { nameUz: "A Tibbiyot", nameRu: "A", country: "UZ", city: "Toshkent", region: "TASHKENT_CITY", programs: ["Medicine"] },
        { nameUz: "B Tibbiyot", nameRu: "B", country: "UZ", city: "Samarqand", region: "SAMARKAND", programs: ["Medicine"] },
        { nameUz: "C Huquq", nameRu: "C", country: "UZ", city: "Toshkent", region: "TASHKENT_CITY", programs: ["Law"] },
        { nameUz: "D Agrar", nameRu: "D", country: "UZ", city: "Toshkent", region: "TASHKENT_CITY", programs: ["Veterinary Medicine"] },
      ],
    });

    const details = await new CareerChoiceService().careerDetails(student.id, "MEDICINE", "uz");
    expect(details.exam.specialty.map((s) => [s.code, s.questions, s.points])).toEqual([
      ["BIOLOGY", 30, 3.1],
      ["CHEMISTRY", 30, 2.1],
    ]);
    expect(details.exam.maxScore).toBe(189);
    expect(details.universities.map((u) => [u.name, u.nearMe])).toEqual([
      ["B Tibbiyot", true],
      ["A Tibbiyot", false],
    ]);
  });

  it("lists study centres for the subject and region, including nationwide ones", async () => {
    await prisma.studyCenter.createMany({
      data: [
        { code: "NATION", name: "Nationwide IT", subjects: ["INFORMATICS"], regions: [] },
        { code: "SAM", name: "Samarqand IT", subjects: ["INFORMATICS"], regions: ["SAMARKAND"] },
        { code: "BUX", name: "Buxoro IT", subjects: ["INFORMATICS"], regions: ["BUKHARA"] },
        { code: "BIO", name: "Bio centre", subjects: ["BIOLOGY"], regions: [] },
      ],
    });
    const list = await new CareerChoiceService().studyCenters("INFORMATICS", "SAMARKAND", "uz");
    expect(list.map((c) => c.name)).toEqual(["Nationwide IT", "Samarqand IT"]);
  });
});
