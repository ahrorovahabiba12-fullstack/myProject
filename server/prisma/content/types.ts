/** One multiple-choice question. Options are given in their final order; `a`
 * is the 0-based index of the correct one. Russian fields fall back to the
 * Uzbek ones when omitted (handy for maths, where they are often identical). */
export interface QDef {
  q: string;
  qRu?: string;
  o: string[];
  oRu?: string[];
  a: number;
  /** Explanation shown after a wrong answer. */
  e?: string;
  eRu?: string;
}

/** grade -> topic number (1-based, as in curriculum.ts) -> questions.
 * Question code = `${topicCode}-q${i + 1}`: only APPEND to a topic's list. */
export type SubjectQuestions = Record<number, Record<number, QDef[]>>;

// Deterministic position for the correct answer, so it isn't always "A" yet
// never moves between runs (the stored correctIndex must stay stable).
function slot(text: string, n: number): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

function place<T>(correct: T, wrong: T[], at: number): T[] {
  const out = [...wrong];
  out.splice(at, 0, correct);
  return out;
}

/**
 * Builds a question from the correct answer and the distractors.
 * `ru` gives Russian texts; omit its option lists when they are the same
 * as the Uzbek ones (numbers, formulas, English words).
 */
export function mc(
  q: string,
  correct: string,
  wrong: string[],
  e: string,
  ru: { q: string; e: string; correct?: string; wrong?: string[] }
): QDef {
  const at = slot(q, wrong.length + 1);
  const o = place(correct, wrong, at);
  const oRu = ru.correct !== undefined && ru.wrong ? place(ru.correct, ru.wrong, at) : undefined;
  return { q, qRu: ru.q, o, oRu, a: at, e, eRu: ru.e };
}
