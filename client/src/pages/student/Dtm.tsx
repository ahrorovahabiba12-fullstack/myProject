import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { dtmApi, DtmBlock, DtmResult, DtmStart } from "../../lib/api";
import { Card, ErrorState, Skeleton } from "../../components/ui/primitives";
import { DtmArena } from "./variants/DtmPicker";
import { Button } from "../../components/ui/Button";

const BLOCK_INFO: Record<DtmBlock, { q: number; p: number }> = {
  first: { q: 30, p: 3.1 },
  second: { q: 30, p: 2.1 },
  compulsory: { q: 10, p: 1.1 },
};

/**
 * "Namunaviy DTM testlari": practice one DTM block at a time. ?subjects=A,B
 * (from a career page) marks A as that career's 1st subject and B as the 2nd.
 */
export default function Dtm() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const careerSubjects = (params.get("subjects") ?? "").split(",").filter(Boolean);
  const subjects = useQuery({ queryKey: ["dtm-subjects"], queryFn: dtmApi.subjects });
  const [run, setRun] = useState<DtmStart | null>(null);
  const [result, setResult] = useState<DtmResult | null>(null);
  const start = useMutation({
    mutationFn: ({ subject, block }: { subject: string; block: DtmBlock }) => dtmApi.start(subject, block),
    onSuccess: (data) => {
      setResult(null);
      setRun(data);
    },
  });

  if (result && run)
    return <DtmResultView run={run} result={result} onAgain={() => start.mutate({ subject: run.subject.code, block: run.block })} onBack={() => { setRun(null); setResult(null); }} />;
  if (run) return <DtmRunner run={run} onDone={setResult} onCancel={() => setRun(null)} />;

  if (subjects.isLoading) return <Skeleton className="h-64" />;
  if (subjects.isError || !subjects.data) return <ErrorState message={t("dtm.loadError")} onRetry={() => subjects.refetch()} />;

  const list = [...subjects.data.subjects].sort((a, b) => {
    const ia = careerSubjects.indexOf(a.code);
    const ib = careerSubjects.indexOf(b.code);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <>
      <DtmArena list={list} careerSubjects={careerSubjects} info={BLOCK_INFO} onStart={(subject, block) => start.mutate({ subject, block })} pending={start.isPending} />
      {start.isError && <p className="text-sm text-red-600 mt-3">{t("dtm.startError")}</p>}
    </>
  );
}

function DtmRunner({ run, onDone, onCancel }: { run: DtmStart; onDone: (r: DtmResult) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const submit = useMutation({
    mutationFn: () => dtmApi.submit(run.dtmToken, Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }))),
    onSuccess: onDone,
  });
  const total = run.questions.length;
  const q = run.questions[current];
  const answered = Object.keys(answers).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2 text-sm text-[var(--text-secondary)]">
        <button onClick={onCancel} className="hover:text-[var(--text-primary)]">✕ {t("dtm.cancel")}</button>
        <span>
          {run.subject.name} · {t(`dtm.block_${run.block}`)} · {current + 1}/{total}
        </span>
      </div>
      <div className="h-2 bg-brand-100 dark:bg-brand-900/40 rounded-full overflow-hidden mb-4" aria-hidden="true">
        <div className="h-full bg-brand-gradient transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-1 mb-4" aria-label={t("dtm.questionMap")}>
        {run.questions.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setCurrent(i)}
            className={clsx(
              "w-7 h-7 rounded-md text-xs font-semibold",
              i === current ? "bg-brand-600 text-white" : answers[x.id] !== undefined ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700" : "bg-slate-100 dark:bg-slate-800"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <Card className="!p-6" key={q.id}>
        <p className="text-lg font-semibold mb-5">{q.text}</p>
        <div className="grid gap-2">
          {q.options.map((o, i) => (
            <button
              key={i}
              onClick={() => setAnswers({ ...answers, [q.id]: i })}
              className={clsx(
                "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition",
                answers[q.id] === i ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30" : "border-[var(--border-subtle)] hover:border-brand-300"
              )}
            >
              <span className="w-7 h-7 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              {o}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between mt-4 gap-2">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          <ArrowLeft size={16} className="inline" /> {t("dtm.prev")}
        </Button>
        {current < total - 1 ? (
          <Button variant="secondary" onClick={() => setCurrent(current + 1)}>
            {t("dtm.next")} <ArrowRight size={16} className="inline" />
          </Button>
        ) : (
          <Button loading={submit.isPending} onClick={() => submit.mutate()}>
            {t("dtm.finish", { answered, total })}
          </Button>
        )}
      </div>
      {submit.isError && <p className="text-sm text-red-600 mt-3">{t("dtm.submitError")}</p>}
    </div>
  );
}

function DtmResultView({ run, result, onAgain, onBack }: { run: DtmStart; result: DtmResult; onAgain: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const good = result.percent >= 70;
  return (
    <div className="max-w-2xl mx-auto">
      <div className={clsx("rounded-card p-6 text-white bg-gradient-to-br shadow-card mb-4", good ? "from-emerald-500 to-teal-600" : result.percent >= 50 ? "from-amber-500 to-orange-600" : "from-rose-500 to-red-600")}>
        <p className="text-sm text-white/80">
          {run.subject.name} · {t(`dtm.block_${result.block}`)}
        </p>
        <p className="text-4xl font-bold my-1">
          {result.points} / {result.maxPoints} {t("dtm.points")}
        </p>
        <p className="text-white/90">{t("dtm.correctOf", { correct: result.correct, total: result.total, percent: result.percent })}</p>
        <p className="text-white/90 mt-2 text-sm">{t(good ? "dtm.adviceGood" : result.percent >= 50 ? "dtm.adviceMid" : "dtm.adviceLow")}</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={onAgain}>{t("dtm.again")}</Button>
        <Button variant="secondary" onClick={onBack}>{t("dtm.otherSubject")}</Button>
      </div>

      <h2 className="font-bold text-lg mb-3">{t("dtm.review")}</h2>
      <div className="grid gap-3">
        {result.review.map((r, i) => (
          <Card key={r.questionId} className="!p-4">
            <p className="font-semibold mb-2 flex gap-2">
              {r.isCorrect ? <CheckCircle2 className="text-emerald-600 shrink-0" size={20} /> : <XCircle className="text-rose-600 shrink-0" size={20} />}
              <span>
                {i + 1}. {r.text}
              </span>
            </p>
            <ul className="text-sm grid gap-1 pl-7">
              {r.options.map((o, oi) => (
                <li
                  key={oi}
                  className={clsx(
                    oi === r.correctIndex && "text-emerald-700 dark:text-emerald-400 font-semibold",
                    oi === r.selectedIndex && oi !== r.correctIndex && "text-rose-600 line-through"
                  )}
                >
                  {String.fromCharCode(65 + oi)}) {o}
                </li>
              ))}
            </ul>
            {r.selectedIndex === null && <p className="text-xs text-[var(--text-secondary)] pl-7 mt-1">{t("dtm.skipped")}</p>}
            {!r.isCorrect && r.explanation && (
              <div className="mt-2 ml-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
                <b>{t("dtm.explanation")}:</b> {r.explanation}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
