import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Compass, RotateCcw, Sparkles } from "lucide-react";
import { MIN_CAREER_GRADE } from "../../constants/grades";
import { careerApi, studentApi, CareerTestResult } from "../../lib/api";
import { Card, ErrorState, Skeleton } from "../../components/ui/primitives";
import { RobotMascot } from "../../components/three/RobotMascot";
import { Button } from "../../components/ui/Button";

const TYPE_COLORS: Record<string, string> = {
  R: "from-amber-500 to-orange-600",
  I: "from-sky-500 to-indigo-600",
  A: "from-pink-500 to-fuchsia-600",
  S: "from-emerald-500 to-teal-600",
  E: "from-rose-500 to-red-600",
  C: "from-slate-500 to-slate-700",
};

export default function Career() {
  const { t } = useTranslation();
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const eligible = profile.data ? profile.data.grade >= MIN_CAREER_GRADE : false;
  const latest = useQuery({ queryKey: ["career-test-latest"], queryFn: careerApi.latestTest, enabled: eligible });
  const [mode, setMode] = useState<"auto" | "intro" | "test">("auto");

  if (profile.isLoading) return <Skeleton className="h-40" />;
  if (profile.data && !eligible) return <Navigate to="/dashboard" replace />;
  if (latest.isLoading) return <Skeleton className="h-64" />;
  if (latest.isError) return <ErrorState message={t("career.loadError")} onRetry={() => latest.refetch()} />;

  if (mode === "test") return <TestRunner onCancel={() => setMode("auto")} onDone={() => setMode("auto")} />;
  if (mode === "auto" && latest.data) return <ResultView result={latest.data} onRetake={() => setMode("test")} />;
  return <Intro onStart={() => setMode("test")} hasResult={!!latest.data} onBack={() => setMode("auto")} />;
}

function Intro({ onStart, hasResult, onBack }: { onStart: () => void; hasResult: boolean; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl">
      <div className="hero-3d rounded-card p-6 sm:p-8 pr-28 sm:pr-52 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
        <RobotMascot className="absolute right-0 bottom-0 w-28 h-36 sm:w-48 sm:h-56" />
        <Compass size={36} className="mb-3" aria-hidden="true" />
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t("career.title")}</h1>
        <p className="text-white/90 mb-1">{t("career.introText")}</p>
        <p className="text-white/80 text-sm mb-6">{t("career.introHint")}</p>
        <button onClick={onStart} className="bg-white text-brand-700 font-semibold rounded-xl px-5 py-3 hover:bg-white/90 transition">
          {t("career.startTest")} →
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        {(["step1", "step2", "step3"] as const).map((k, i) => (
          <Card key={k} className="!p-4">
            <p className="text-2xl font-bold text-brand-600">{i + 1}</p>
            <p className="text-sm text-[var(--text-secondary)]">{t(`career.${k}`)}</p>
          </Card>
        ))}
      </div>
      {hasResult && (
        <button onClick={onBack} className="mt-4 text-sm font-semibold text-brand-600 hover:underline">
          ← {t("career.backToResult")}
        </button>
      )}
    </div>
  );
}

function TestRunner({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const test = useQuery({ queryKey: ["career-test"], queryFn: careerApi.getTest });
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const submit = useMutation({
    mutationFn: careerApi.submitTest,
    onSuccess: (result) => {
      qc.setQueryData(["career-test-latest"], result);
      onDone();
    },
  });

  if (test.isLoading) return <Skeleton className="h-64" />;
  if (test.isError || !test.data) return <ErrorState message={t("career.loadError")} onRetry={() => test.refetch()} />;

  const questions = test.data.questions;
  const total = questions.length;
  const q = questions[current];
  const choose = (value: number) => {
    const next = [...answers];
    next[current] = value;
    setAnswers(next);
    if (current < total - 1) setTimeout(() => setCurrent(current + 1), 150);
  };
  const allAnswered = questions.every((_, i) => answers[i] !== null && answers[i] !== undefined);
  const options = [
    { value: 2, label: t("career.answerYes"), emoji: "👍" },
    { value: 1, label: t("career.answerSometimes"), emoji: "🤔" },
    { value: 0, label: t("career.answerNo"), emoji: "👎" },
  ];

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-2 text-sm text-[var(--text-secondary)]">
        <button onClick={onCancel} className="hover:text-[var(--text-primary)]">✕ {t("career.cancel")}</button>
        <span>
          {current + 1} / {total}
        </span>
      </div>
      <div className="h-2 bg-brand-100 dark:bg-brand-900/40 rounded-full overflow-hidden mb-6" aria-hidden="true">
        <div className="h-full bg-brand-gradient transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>

      <Card className="!p-6 animate-scale-in" key={q.index}>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">{t("career.aboutYou")}</p>
        <p className="text-lg font-semibold mb-6">{q.text}</p>
        <div className="grid gap-3">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => choose(o.value)}
              className={clsx(
                "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition",
                answers[current] === o.value
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                  : "border-[var(--border-subtle)] hover:border-brand-300"
              )}
            >
              <span className="text-xl" aria-hidden="true">{o.emoji}</span>
              {o.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between mt-4">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          <ArrowLeft size={16} className="inline" /> {t("career.prev")}
        </Button>
        {current < total - 1 ? (
          <Button variant="secondary" disabled={answers[current] == null} onClick={() => setCurrent(current + 1)}>
            {t("career.next")} <ArrowRight size={16} className="inline" />
          </Button>
        ) : (
          <Button disabled={!allAnswered} loading={submit.isPending} onClick={() => submit.mutate(answers as number[])}>
            {t("career.seeResult")}
          </Button>
        )}
      </div>
      {submit.isError && <p className="text-sm text-red-600 mt-3">{t("career.submitError")}</p>}
    </div>
  );
}

function ResultView({ result, onRetake }: { result: CareerTestResult; onRetake: () => void }) {
  const { t } = useTranslation();
  const top = result.topTypes[0];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{t("career.title")}</h1>
        <button onClick={onRetake} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
          <RotateCcw size={14} /> {t("career.retake")}
        </button>
      </div>

      <div className={clsx("rounded-card p-6 text-white bg-gradient-to-br shadow-card mb-4", TYPE_COLORS[top.code])}>
        <p className="text-sm text-white/80 mb-1">{t("career.yourType")}</p>
        <p className="text-2xl font-bold mb-2">
          <span aria-hidden="true">{top.emoji}</span> {result.topTypes.map((x) => x.name).join(" · ")}
        </p>
        <p className="text-white/90">{top.description}</p>
      </div>

      <Card className="mb-6">
        <h2 className="font-bold mb-3">{t("career.profile")}</h2>
        <div className="grid gap-2">
          {result.scores.map((s) => (
            <div key={s.code} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm">
                <span aria-hidden="true">{s.emoji}</span> {s.name}
              </span>
              <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={clsx("h-full bg-gradient-to-r", TYPE_COLORS[s.code])} style={{ width: `${s.score}%` }} />
              </div>
              <span className="w-10 text-right text-sm font-semibold">{s.score}%</span>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="text-lg font-bold mb-3">{t("career.matchingCareers")}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {result.careers.map((c) => (
          <Link key={c.code} to={`/career/${c.code}`} className="group block h-full rounded-card" data-tilt>
            <Card className="h-full">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-bold">{c.name}</p>
                <span className="text-sm font-semibold text-brand-600 whitespace-nowrap">
                  {Math.round(c.matchScore * 100)}% {t("career.match")}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">{c.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {c.types.map((x) => (
                  <span key={x.code} className="text-xs rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5">
                    {x.emoji} {x.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {t("career.examSubjects")}: <b>{c.examSubjects.join(", ")}</b>
              </p>
              <p className="text-sm font-semibold text-brand-600 mt-3 group-hover:underline">{t("career.openCareer")} →</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link to="/chat" className="text-sm font-semibold text-brand-600 hover:underline flex items-center gap-1">
          <Sparkles size={14} /> {t("career.discussWithAI")}
        </Link>
      </div>
    </div>
  );
}
