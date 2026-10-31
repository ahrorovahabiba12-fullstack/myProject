import { PrismaClient } from "@prisma/client";
import { SUBJECTS, TOPICS, topicCode } from "./curriculum";
import { ALL_QUESTIONS } from "./questions";
import { QDef } from "./types";

function assertValid(code: string, d: QDef) {
  if (d.o.length < 2) throw new Error(`${code}: needs at least 2 options`);
  if (d.a < 0 || d.a >= d.o.length) throw new Error(`${code}: answer index out of range`);
  if (d.oRu && d.oRu.length !== d.o.length) throw new Error(`${code}: oRu length differs from o`);
  if (new Set(d.o).size !== d.o.length) throw new Error(`${code}: duplicate options`);
}

/**
 * Upserts every subject, topic and question by its stable code. Never deletes
 * anything, so it is safe to run on a live database on every start-up:
 * students' quiz history (QuestionAttempt, QuizResult) is never touched.
 */
export async function syncContent(prisma: PrismaClient, log: (msg: string) => void = () => {}) {
  const subjectId = new Map<string, string>();
  for (const [i, s] of SUBJECTS.entries()) {
    const data = { nameUz: s.nameUz, nameRu: s.nameRu, minGrade: s.minGrade, maxGrade: s.maxGrade, sortOrder: i, active: true };
    const row = await prisma.subject.upsert({ where: { code: s.code }, create: { code: s.code, ...data }, update: data });
    subjectId.set(s.code, row.id);
  }

  let topicCount = 0;
  let questionCount = 0;
  for (const [subject, grades] of Object.entries(TOPICS)) {
    const sid = subjectId.get(subject);
    if (!sid) throw new Error(`Unknown subject in TOPICS: ${subject}`);
    for (const [gradeStr, topics] of Object.entries(grades)) {
      const grade = Number(gradeStr);
      for (const [idx, [nameUz, nameRu]] of topics.entries()) {
        const code = topicCode(subject, grade, idx + 1);
        const data = { subjectId: sid, grade, sortOrder: idx + 1, nameUz, nameRu };
        const topic = await prisma.topic.upsert({ where: { code }, create: { code, ...data }, update: data });
        topicCount++;

        const defs = ALL_QUESTIONS[subject]?.[grade]?.[idx + 1] ?? [];
        for (const [qi, d] of defs.entries()) {
          const qcode = `${code}-q${qi + 1}`;
          assertValid(qcode, d);
          const qdata = {
            subjectId: sid,
            topicId: topic.id,
            grade,
            text: d.q,
            textRu: d.qRu ?? d.q,
            options: d.o,
            optionsRu: d.oRu ?? d.o,
            correctIndex: d.a,
            explanation: d.e ?? "",
            explanationRu: d.eRu ?? d.e ?? "",
          };
          await prisma.question.upsert({ where: { code: qcode }, create: { code: qcode, ...qdata }, update: qdata });
          questionCount++;
        }
      }
    }
  }

  // Questions written for a topic number that doesn't exist would silently
  // never be served — fail loudly instead.
  for (const [subject, grades] of Object.entries(ALL_QUESTIONS)) {
    for (const [gradeStr, byTopic] of Object.entries(grades)) {
      const count = TOPICS[subject]?.[Number(gradeStr)]?.length ?? 0;
      for (const n of Object.keys(byTopic)) {
        if (Number(n) < 1 || Number(n) > count) throw new Error(`Questions for missing topic ${subject}-${gradeStr}-${n}`);
      }
    }
  }

  log(`Kontent sinxronlandi: ${SUBJECTS.length} fan, ${topicCount} mavzu, ${questionCount} savol.`);
}
