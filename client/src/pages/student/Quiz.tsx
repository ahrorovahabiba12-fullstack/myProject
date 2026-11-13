import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Check, X, Lightbulb, RotateCcw, ListChecks, Sparkles, Award, BookOpen, BookOpenText, Calculator, Globe, Languages, Atom, FlaskConical, Sprout, Laptop, Landmark, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { MIN_CAREER_GRADE } from "../../constants/grades";
import { quizApi, QuizStart, QuizSubject, QuizSubmitResult } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";

// Subject tiles: white card, a gradient circle with a white line icon (variant A
// Habiba picked), name and an arrow chip below.
type SubjectLook = { Icon: LucideIcon; from: string; to: string };
const SUBJECT_STYLE: Record<string, SubjectLook> = {
  MATH: { Icon: Calculator, from: "#5b8cff", to: "#7c5cff" },
  MOTHER_LANG: { Icon: BookOpenText, from: "#8bc34a", to: "#3fae5a" },
  ENGLISH: { Icon: Globe, from: "#36c2e0", to: "#2f8ee8" },
  RUSSIAN: { Icon: Languages, from: "#f59e6b", to: "#ef6c5a" },
  PHYSICS: { Icon: Atom, from: "#4cc9a6", to: "#14a394" },
  CHEMISTRY: { Icon: FlaskConical, from: "#f7c948", to: "#f0a020" },
  BIOLOGY: { Icon: Sprout, from: "#9ccc65", to: "#43a047" },
  INFORMATICS: { Icon: Laptop, from: "#7a5cff", to: "#3d6fe0" },
  HISTORY: { Icon: Landmark, from: "#e0a15f", to: "#c2703d" },
};
const styleFor = (code: string): SubjectLook =>
  SUBJECT_STYLE[code] ?? { Icon: BookOpen, from: "#8b6cff", to: "#6c3ffb" };

function StepHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 mb-5">
      {back && (
        <button
          onClick={back}
          aria-label={t("quiz.back")}
          className="mt-1 w-10 h-10 shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-900/30"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="text-[var(--text-secondary)] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Screen 1 — the subjects taught in the student's own grade. */
function SubjectPicker({ onPick }: { onPick: (s: QuizSubject) => void }) {
  const { t } = useTranslation();
  const subjects = useQuery({ queryKey: ["quiz-subjects"], queryFn: quizApi.subjects });

  return (
    <div>
      <StepHeader title={t("quiz.pickSubjectTitle")} subtitle={subjects.data ? t("quiz.pickSubjectSubtitle", { grade: subjects.data.grade }) : undefined} />
      {subjects.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : subjects.isError ? (
        <ErrorState message={t("quiz.loadError")} onRetry={() => subjects.refetch()} />
      ) : !subjects.data?.subjects.length ? (
        <EmptyState icon="📚" title={t("quiz.noSubjects")} />
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {subjects.data.subjects.map((s) => (
            <button
              key={s.code}
              onClick={() => onPick(s)}
              data-tilt
              className="group text-left rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm hover:shadow-card active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
            >
              <div className="relative h-20 sm:h-32 flex items-center justify-center mb-2 sm:mb-3">
                {(() => {
                  const look = styleFor(s.code);
                  return (
                    <span
                      className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white transition-transform group-hover:scale-110 group-hover:-translate-y-1"
                      style={{ background: `linear-gradient(140deg, ${look.from}, ${look.to})`, boxShadow: `inset 0 3px 0 rgba(255,255,255,0.35), inset 0 -6px 10px rgba(0,0,0,0.2), 0 14px 24px -10px ${look.to}` }}
                      aria-hidden="true"
                    >
                      <look.Icon className="w-8 h-8 sm:w-11 sm:h-11" strokeWidth={2} />
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center justify-between gap-1">
                <p className="font-extrabold text-[13px] leading-tight sm:text-lg">{s.name}</p>
                <span className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center" aria-hidden="true">
                  <ChevronRight size={16} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      {subjects.data && subjects.data.grade >= MIN_CAREER_GRADE && (
        <Link
          to="/dtm"
          className="mt-5 flex items-center gap-4 rounded-card p-4 sm:p-5 text-white bg-gradient-to-br from-rose-400 to-pink-500 shadow-card hover:-translate-y-0.5 transition-transform"
        >
          <span className="text-3xl" aria-hidden="true">📝</span>
          <div className="flex-1">
            <p className="font-extrabold text-lg">{t("quiz.dtmBannerTitle")}</p>
            <p className="text-sm text-white/90">{t("quiz.dtmBannerDesc")}</p>
          </div>
          <ChevronRight size={22} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Screen 2 — which grade's programme to practise (any grade the subject is taught in). */
function GradePicker({ subject, ownGrade, onPick, onBack }: { subject: QuizSubject; ownGrade?: number; onPick: (g: number) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const grades = Array.from({ length: subject.maxGrade - subject.minGrade + 1 }, (_, i) => i + subject.minGrade);
  return (
    <div>
      <StepHeader title={subject.name} subtitle={t("quiz.pickGradeSubtitle")} back={onBack} />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {grades.map((g) => {
          const available = subject.grades.includes(g);
          return (
            <button
              key={g}
              disabled={!available}
              onClick={() => onPick(g)}
              data-tilt
              className={clsx(
                "relative h-20 rounded-2xl border-2 font-extrabold text-2xl transition-colors flex flex-col items-center justify-center",
                g === ownGrade
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                  : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-brand-300",
                !available && "opacity-40 cursor-not-allowed"
              )}
            >
              {g}
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                {g === ownGrade ? t("quiz.myGrade") : t("quiz.gradeShort")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Screen 3 — the yearly topics of that subject in that grade. */
function TopicPicker({ subject, grade, onPick, onBack }: { subject: QuizSubject; grade: number; onPick: (topicId: string) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const topics = useQuery({ queryKey: ["quiz-topics", subject.code, grade], queryFn: () => quizApi.topics(subject.code, grade) });

  return (
    <div>
      <StepHeader title={t("quiz.pickTopicTitle", { subject: subject.name, grade })} subtitle={t("quiz.pickTopicSubtitle")} back={onBack} />
      {topics.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : topics.isError ? (
        <ErrorState message={t("quiz.loadError")} onRetry={() => topics.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {topics.data?.topics.map((topic) => {
            const ready = topic.questionCount > 0;
            return (
              <button
                key={topic.id}
                disabled={!ready}
                onClick={() => onPick(topic.id)}
                data-tilt={ready ? "" : undefined}
                className={clsx(
                  "flex items-center gap-4 text-left rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3.5 transition-colors",
                  ready ? "hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/20" : "opacity-60 cursor-not-allowed"
                )}
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 font-extrabold flex items-center justify-center">
                  {topic.number}
                </span>
                <span className="flex-1 font-semibold">{topic.name}</span>
                {ready ? (
                  <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{t("quiz.questionsCount", { count: topic.questionCount })}</span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">{t("quiz.comingSoon")}</span>
                )}
                {ready && <ChevronRight size={18} className="text-[var(--text-secondary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MARK_STYLE: Record<number, string> = {
  5: "from-emerald-400 to-teal-500",
  4: "from-sky-400 to-blue-500",
  3: "from-amber-400 to-orange-500",
  2: "from-rose-400 to-red-500",
};

function ResultView({ quiz, result, onRetry, onOtherTopic }: { quiz: QuizStart; result: QuizSubmitResult; onRetry: () => void; onOtherTopic: () => void }) {
  const { t } = useTranslation();
  const [showEvaluation, setShowEvaluation] = useState(false);
  const ev = result.evaluation;

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <Card className="text-center py-8">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          {quiz.subject.name} · {quiz.topic.grade}-{t("profile.grade")} · {quiz.topic.name}
        </p>
        <p className="text-6xl font-extrabold text-brand-600 mt-3">{result.score}%</p>
        <p className="mt-2 font-semibold">{t("quiz.correctOf", { correct: result.correctCount, total: result.total })}</p>
        {result.newBadges.length > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-100 rounded-full px-3 py-1 animate-scale-in">
            <Award size={16} /> {t("quiz.newBadge")}: {result.newBadges.join(", ")}
          </p>
        )}
      </Card>

      <section aria-labelledby="review-title">
        <h2 id="review-title" className="font-bold text-lg mb-3">
          {t("quiz.reviewTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          {result.review.map((item, i) => (
            <Card key={item.questionId} className={clsx("border-l-4", item.isCorrect ? "border-l-emerald-500" : "border-l-rose-500")}>
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    "w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white",
                    item.isCorrect ? "bg-emerald-500" : "bg-rose-500"
                  )}
                  aria-label={item.isCorrect ? t("quiz.correct") : t("quiz.wrong")}
                >
                  {item.isCorrect ? <Check size={16} /> : <X size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold whitespace-pre-line">
                    {i + 1}. {item.text}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {item.options.map((opt, oi) => {
                      const isRight = oi === item.correctIndex;
                      const isPicked = oi === item.selectedIndex;
                      return (
                        <li
                          key={oi}
                          className={clsx(
                            "text-sm rounded-lg px-3 py-1.5 flex items-center gap-2",
                            isRight && "bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-900/30 dark:text-emerald-200",
                            isPicked && !isRight && "bg-rose-50 text-rose-800 line-through dark:bg-rose-900/30 dark:text-rose-200",
                            !isRight && !isPicked && "text-[var(--text-secondary)]"
                          )}
                        >
                          {isRight ? <Check size={14} /> : isPicked ? <X size={14} /> : <span className="w-3.5" />}
                          {opt}
                        </li>
                      );
                    })}
                  </ul>
                  {!item.isCorrect && item.explanation && (
                    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100">
                      <p className="font-bold flex items-center gap-1.5 mb-1">
                        <Lightbulb size={15} /> {t("quiz.explanation")}
                      </p>
                      <p className="whitespace-pre-line">{item.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {!showEvaluation ? (
        <Button onClick={() => setShowEvaluation(true)} className="w-full text-lg py-4">
          <span className="inline-flex items-center gap-2">
            <Award size={20} /> {t("quiz.evaluateButton")}
          </span>
        </Button>
      ) : (
        <div className={clsx("rounded-card p-6 text-white bg-gradient-to-br shadow-card animate-scale-in", MARK_STYLE[ev.mark])}>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 shrink-0 rounded-2xl bg-white/20 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold leading-none">{ev.mark}</span>
              <span className="text-[11px] font-semibold text-white/85 mt-1">{t("quiz.markLabel")}</span>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{ev.title}</p>
              <p className="text-white/90 mt-1">{ev.message}</p>
            </div>
          </div>
          <p className="mt-4 bg-white/15 rounded-xl px-4 py-3 text-sm">💡 {ev.advice}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button variant="secondary" onClick={onRetry}>
          <span className="inline-flex items-center gap-2">
            <RotateCcw size={16} /> {t("quiz.retryTopic")}
          </span>
        </Button>
        <Button variant="secondary" onClick={onOtherTopic}>
          <span className="inline-flex items-center gap-2">
            <ListChecks size={16} /> {t("quiz.otherTopic")}
          </span>
        </Button>
        <Link to="/chat" className="contents">
          <Button variant="secondary">
            <span className="inline-flex items-center gap-2">
              <Sparkles size={16} /> {t("quiz.discussWithAI")}
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Screens 4–5 — answering one question at a time, then the result. */
function QuizRunner({ topicId, onOtherTopic }: { topicId: string; onOtherTopic: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const quiz = useQuery({ queryKey: ["quiz-start", topicId, attempt], queryFn: () => quizApi.start(topicId), staleTime: Infinity, gcTime: 0 });
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setCurrent(0);
    setAnswers({});
    setResult(null);
    setError(null);
    setAttempt((a) => a + 1);
  };

  if (quiz.isLoading) return <Skeleton className="h-80 max-w-3xl" />;
  if (quiz.isError || !quiz.data) return <ErrorState message={t("quiz.notAvailable")} onRetry={() => quiz.refetch()} />;

  const data = quiz.data;
  if (result) return <ResultView quiz={data} result={result} onRetry={retry} onOtherTopic={onOtherTopic} />;

  const q = data.questions[current];
  const total = data.questions.length;
  const allAnswered = data.questions.every((x) => answers[x.id] !== undefined);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await quizApi.submit(
        data.quizToken,
        data.questions.map((x) => ({ questionId: x.id, selectedIndex: answers[x.id] }))
      );
      setResult(res);
      // Submission changes progress, streak, badges and the daily coach message.
      for (const key of ["consistency-score", "study-stats", "study-recommendation", "daily-coach-today", "achievements", "progress-overview", "dashboard-summary", "profile"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    } catch {
      setError(t("quiz.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <StepHeader title={data.topic.name} subtitle={`${data.subject.name} · ${data.topic.grade}-${t("profile.grade")}`} back={onOtherTopic} />
      <Card className="p-5 sm:p-7">
        <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-secondary)] mb-2">
          <span>
            {t("quiz.question")} {current + 1} / {total}
          </span>
          <span>{Object.keys(answers).length} ✓</span>
        </div>
        <div className="h-2 bg-brand-100 dark:bg-brand-900/40 rounded-full overflow-hidden mb-6" aria-hidden="true">
          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>

        <p className="text-xl font-bold mb-5 whitespace-pre-line">{q.text}</p>
        <div className="flex flex-col gap-3" role="radiogroup" aria-label={q.text}>
          {q.options.map((opt, i) => {
            const selected = answers[q.id] === i;
            return (
              <button
                key={i}
                role="radio"
                aria-checked={selected}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                className={clsx(
                  "flex items-center gap-3 text-left rounded-2xl border-2 px-4 py-3.5 font-medium transition-colors min-h-[56px]",
                  selected
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                    : "border-[var(--border-subtle)] hover:border-brand-300 bg-[var(--bg-card)]"
                )}
              >
                <span
                  className={clsx(
                    "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm",
                    selected ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger mt-4">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-7">
          <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            <span className="inline-flex items-center gap-1">
              <ChevronLeft size={18} /> {t("quiz.previous")}
            </span>
          </Button>
          {current < total - 1 ? (
            <Button disabled={answers[q.id] === undefined} onClick={() => setCurrent((c) => c + 1)}>
              <span className="inline-flex items-center gap-1">
                {t("quiz.next")} <ChevronRight size={18} />
              </span>
            </Button>
          ) : (
            <Button disabled={!allAnswered} loading={submitting} onClick={submit}>
              {t("quiz.finish")}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Test section: subject → grade → yearly topic → questions → result.
 * Subject and grade live in the URL (?subject=MATH&grade=5) so the browser's
 * back button and dashboard deep links work; the running quiz is local state.
 */
export default function Quiz() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const subjects = useQuery({ queryKey: ["quiz-subjects"], queryFn: quizApi.subjects });
  const [topicId, setTopicId] = useState<string | null>(null);

  const subjectCode = params.get("subject");
  const gradeParam = params.get("grade");
  const grade = gradeParam ? Number(gradeParam) : null;
  const subject = subjects.data?.subjects.find((s) => s.code === subjectCode) ?? null;

  const go = (next: { subject?: string; grade?: number }) => {
    setTopicId(null);
    const p = new URLSearchParams();
    if (next.subject) p.set("subject", next.subject);
    if (next.subject && next.grade) p.set("grade", String(next.grade));
    setParams(p);
  };

  if (subjectCode && subjects.isLoading) return <Skeleton className="h-64" />;

  if (subject && grade && topicId) {
    return <QuizRunner key={topicId} topicId={topicId} onOtherTopic={() => setTopicId(null)} />;
  }
  if (subject && grade) {
    return <TopicPicker subject={subject} grade={grade} onPick={setTopicId} onBack={() => go({ subject: subject.code })} />;
  }
  if (subject) {
    return <GradePicker subject={subject} ownGrade={subjects.data?.grade} onPick={(g) => go({ subject: subject.code, grade: g })} onBack={() => go({})} />;
  }
  return (
    <>
      <SubjectPicker onPick={(s) => go({ subject: s.code })} />
      <p className="mt-6 text-sm text-[var(--text-secondary)] flex items-center gap-2">
        <BookOpen size={16} /> {t("quiz.pickSubjectHint")}
      </p>
    </>
  );
}
