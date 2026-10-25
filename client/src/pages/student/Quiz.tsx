import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Check, X } from "lucide-react";
import { subjectApi, quizApi, studentApi, QuizReviewItem } from "../../lib/api";
import { Card, EmptyState, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import clsx from "clsx";

type Question = { id: string; text: string; options: string[] };
type Answer = { questionId: string; selectedIndex: number };
type QuizResult = { score: number; level: string; correctCount: number; total: number; newBadges: string[]; review: QuizReviewItem[] };

export default function Quiz() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: subjectApi.list });

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [quizToken, setQuizToken] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startQuiz = async (id: string) => {
    if (!profile.data) return;
    setLoading(true);
    setError(null);
    try {
      const { questions, quizToken } = await quizApi.start(id, profile.data.grade);
      setQuestions(questions);
      setQuizToken(quizToken);
      setSubjectId(id);
      setCurrent(0);
      setAnswers({});
      setResult(null);
    } catch {
      setError(t("quiz.notAvailable"));
    } finally {
      setLoading(false);
    }
  };

  // Lets a link like /quiz?subject=ENGLISH (e.g. from the dashboard's "study
  // this subject today" suggestion) jump straight into that subject's quiz,
  // skipping the picker — resolved by code once the subject list has loaded.
  const preselectedCode = searchParams.get("subject");
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!preselectedCode || autoStartedRef.current || !subjects.data || !profile.data) return;
    const match = subjects.data.find((s) => s.code === preselectedCode);
    if (match) {
      autoStartedRef.current = true;
      startQuiz(match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCode, subjects.data, profile.data]);

  const selectAnswer = (index: number) => {
    if (!questions) return;
    setAnswers((prev) => ({ ...prev, [questions[current].id]: index }));
  };

  const submit = async () => {
    if (!questions || !quizToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Answer[] = questions.map((q) => ({ questionId: q.id, selectedIndex: answers[q.id] }));
      const res = await quizApi.submit(quizToken, payload);
      setResult(res);
      // Quiz submission has side effects beyond the quiz itself: it may auto-complete
      // a matching Schedule item, change Progress/consistency/streak, unlock badges,
      // and shift the Daily Coach message — every cached query touching that data
      // must be invalidated, or Dashboard/Schedule keep showing stale state.
      queryClient.invalidateQueries({ queryKey: ["schedule-current"] });
      queryClient.invalidateQueries({ queryKey: ["consistency-score"] });
      queryClient.invalidateQueries({ queryKey: ["study-stats"] });
      queryClient.invalidateQueries({ queryKey: ["study-recommendation"] });
      queryClient.invalidateQueries({ queryKey: ["daily-coach-today"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["progress-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch {
      setError(t("quiz.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Result screen ----
  if (result) {
    const levelLabel = result.level === "STRONG" ? t("quiz.levelStrong") : result.level === "MEDIUM" ? t("quiz.levelMedium") : t("quiz.levelWeak");
    return (
      <Card className="max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-brand-gradient text-white flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <p className="text-4xl font-extrabold mb-1">{result.score}%</p>
        <p className="text-[var(--text-secondary)] mb-1">
          {result.correctCount}/{result.total} {t("quiz.correctAnswers")}
        </p>
        <span className="inline-block bg-brand-100 text-brand-700 text-sm font-semibold px-3 py-1 rounded-full mb-6">{levelLabel} {t("quiz.level")}</span>

        {result.newBadges.length > 0 && (
          <div className="bg-amber-50 text-amber-700 text-sm font-medium rounded-xl px-4 py-3 mb-6">
            🏆 {t("quiz.newBadge")}: {result.newBadges.join(", ")}
          </div>
        )}

        {result.review.length > 0 && (
          <div className="text-left mb-6">
            <p className="font-semibold mb-3">{t("quiz.reviewTitle")}</p>
            <div className="flex flex-col gap-3">
              {result.review.map((r, i) => (
                <div key={r.questionId} className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <span
                      className={clsx(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white",
                        r.isCorrect ? "bg-emerald-500" : "bg-red-500"
                      )}
                    >
                      {r.isCorrect ? <Check size={12} /> : <X size={12} />}
                    </span>
                    <p className="text-sm font-medium">
                      {i + 1}. {r.text}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 pl-7">
                    {r.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={clsx(
                          "text-sm rounded-lg px-2.5 py-1.5",
                          oi === r.correctIndex && "bg-emerald-50 text-emerald-700 font-medium",
                          oi === r.selectedIndex && oi !== r.correctIndex && "bg-red-50 text-red-700 line-through",
                          oi !== r.correctIndex && oi !== r.selectedIndex && "text-[var(--text-secondary)]"
                        )}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate("/chat")}>
            <Sparkles size={16} className="inline mr-1.5" /> {t("quiz.discussWithAI")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null);
              setQuestions(null);
              setSubjectId(null);
            }}
          >
            {t("quiz.retakeTest")}
          </Button>
        </div>
      </Card>
    );
  }

  // ---- Question flow ----
  if (questions && subjectId) {
    const q = questions[current];
    const answered = answers[q.id] !== undefined;
    const isLast = current === questions.length - 1;
    const allAnswered = questions.every((qq) => answers[qq.id] !== undefined);

    return (
      <Card className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-1 text-sm text-[var(--text-secondary)]">
          <span>
            {t("quiz.question")} {current + 1}/{questions.length}
          </span>
        </div>
        <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        <h2 className="font-semibold text-lg mb-5">{q.text}</h2>

        <div className="flex flex-col gap-3 mb-6">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectAnswer(i)}
              className={clsx(
                "text-left rounded-xl border px-4 py-3 transition-colors",
                answers[q.id] === i
                  ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
                  : "border-[var(--border-subtle)] hover:bg-brand-50/50 hover:text-brand-700"
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <ChevronLeft size={16} className="inline" /> {t("quiz.previous")}
          </Button>
          {isLast ? (
            <Button onClick={submit} loading={submitting} disabled={!allAnswered}>
              {t("quiz.finish")}
            </Button>
          ) : (
            <Button onClick={() => setCurrent((c) => c + 1)} disabled={!answered}>
              {t("quiz.next")} <ChevronRight size={16} className="inline" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // ---- Subject picker ----
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("quiz.title")}</h1>
      {subjects.isLoading || loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : subjects.data?.length === 0 ? (
        <EmptyState title={t("quiz.noSubjects")} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {subjects.data?.map((s) => (
            <button key={s.id} onClick={() => startQuiz(s.id)} className="card text-left hover:border-brand-300 transition-colors">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t("quiz.startTest")} →</p>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-danger text-sm mt-4">{error}</p>}
    </div>
  );
}
