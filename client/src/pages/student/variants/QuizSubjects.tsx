import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, ChevronRight, FileText } from "lucide-react";
import { quizApi, studentApi, QuizSubject } from "../../../lib/api";
import { EmptyState, ErrorState, Skeleton } from "../../../components/ui/primitives";
import { MIN_CAREER_GRADE } from "../../../constants/grades";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { styleFor } from "../subjectStyle";

function useSubjectsWithScores() {
  const subjects = useQuery({ queryKey: ["quiz-subjects"], queryFn: quizApi.subjects });
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const score = (code: string) => profile.data?.subjectLevels.find((l) => l.subjectCode === code)?.score;
  return { subjects, score };
}

/** Subject picker ("3D kartalar"): tall full-colour cards with a huge floating
 * icon, the subject name and a knowledge bar; cards tilt with the mouse. */
export function QuizSubjectsCards({ onPick }: { onPick: (s: QuizSubject) => void }) {
  const { t } = useTranslation();
  const { subjects, score } = useSubjectsWithScores();
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="section-badge !text-brand-600 dark:!text-cyan-300 !border-brand-300/40 dark:!border-cyan-300/30 !inline-flex items-center gap-1.5"><BookOpenCheck size={14} /> {t("dashboard.actionQuizTitle")}</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-3">{t("quiz.pickSubjectTitle")}</h1>
          {subjects.data && <p className="text-[var(--text-secondary)] mt-1">{t("quiz.pickSubjectSubtitle", { grade: subjects.data.grade })}</p>}
        </div>
        <RobotMascot className="w-20 h-24 sm:w-28 sm:h-32 shrink-0 -mb-2" />
      </div>
      {subjects.isLoading ? (
        <Skeleton className="h-64" />
      ) : subjects.isError ? (
        <ErrorState message={t("quiz.loadError")} onRetry={() => subjects.refetch()} />
      ) : !subjects.data?.subjects.length ? (
        <EmptyState icon={<BookOpenCheck size={28} />} title={t("quiz.noSubjects")} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {subjects.data?.subjects.map((s) => {
            const look = styleFor(s.code);
            const sc = score(s.code);
            return (
              <button
                key={s.code}
                onClick={() => onPick(s)}
                data-tilt
                className="group relative text-left rounded-[1.6rem] p-4 sm:p-6 text-white overflow-hidden h-44 sm:h-60 focus:outline-none"
                style={{ background: `linear-gradient(150deg, ${look.from}, ${look.to})`, boxShadow: `0 24px 50px -22px ${look.to}` }}
              >
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/15" />
                <look.Icon
                  className="absolute right-3 bottom-10 sm:right-5 sm:bottom-14 w-20 h-20 sm:w-28 sm:h-28 text-white/90 transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-0"
                  strokeWidth={1.6}
                  style={{ transform: "rotate(-14deg)", filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.3))" }}
                />
                <p className="relative text-xl sm:text-2xl font-black max-w-[70%] leading-tight">{s.name}</p>
                <div className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-6 sm:bottom-5">
                  <div className="flex justify-between text-xs font-bold mb-1 text-white/90">
                    <span>{sc !== undefined ? `${Math.round(sc)}%` : "—"}</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                    <div className="h-full rounded-full bg-white" style={{ width: `${sc ?? 0}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {subjects.data && subjects.data.grade >= MIN_CAREER_GRADE && (
        <Link
          to="/dtm"
          className="mt-5 flex items-center gap-4 rounded-[1.6rem] p-4 sm:p-5 text-white bg-gradient-to-br from-rose-400 to-pink-600 shadow-card hover:-translate-y-0.5 transition-transform"
        >
          <span className="w-12 h-12 rounded-2xl bg-white/20 inline-flex items-center justify-center shrink-0" aria-hidden="true">
            <FileText size={24} />
          </span>
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
