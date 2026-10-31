import { describe, it, expect } from "vitest";
import { SUBJECTS, TOPICS } from "../../prisma/content/curriculum";
import { ALL_QUESTIONS } from "../../prisma/content/questions";

// Pure checks on the hand-written quiz content — no database needed.
describe("quiz content", () => {
  it("defines topics only for known subjects and inside each subject's grade range", () => {
    const byCode = new Map(SUBJECTS.map((s) => [s.code, s]));
    for (const [code, grades] of Object.entries(TOPICS)) {
      const subject = byCode.get(code);
      expect(subject, code).toBeDefined();
      for (const g of Object.keys(grades).map(Number)) {
        expect(g >= subject!.minGrade && g <= subject!.maxGrade, `${code} grade ${g}`).toBe(true);
      }
    }
  });

  it("every question is well-formed, bilingual, explained, and attached to an existing topic", () => {
    for (const [subject, grades] of Object.entries(ALL_QUESTIONS)) {
      for (const [grade, byTopic] of Object.entries(grades)) {
        for (const [topic, questions] of Object.entries(byTopic)) {
          const where = `${subject}-${grade}-${topic}`;
          expect(TOPICS[subject]?.[Number(grade)]?.[Number(topic) - 1], `${where} topic exists`).toBeDefined();
          questions.forEach((q, i) => {
            const id = `${where}-q${i + 1}`;
            expect(q.o.length, id).toBeGreaterThanOrEqual(3);
            expect(new Set(q.o).size, `${id} unique options`).toBe(q.o.length);
            expect(q.a >= 0 && q.a < q.o.length, `${id} answer index`).toBe(true);
            if (q.oRu) {
              expect(q.oRu.length, `${id} oRu length`).toBe(q.o.length);
              expect(new Set(q.oRu).size, `${id} unique oRu`).toBe(q.oRu.length);
            }
            expect(q.q.trim(), `${id} text`).not.toBe("");
            expect(q.qRu?.trim(), `${id} Russian text`).toBeTruthy();
            expect(q.e?.trim(), `${id} explanation`).toBeTruthy();
            expect(q.eRu?.trim(), `${id} Russian explanation`).toBeTruthy();
          });
        }
      }
    }
  });
});
