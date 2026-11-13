import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { quizApi, studentApi, QuizSubject } from "../../../lib/api";
import { Skeleton } from "../../../components/ui/primitives";
import { RobotMascot } from "../../../components/three/RobotMascot";
import { styleFor } from "../subjectStyle";

function useSubjectsWithScores() {
  const subjects = useQuery({ queryKey: ["quiz-subjects"], queryFn: quizApi.subjects });
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const score = (code: string) => profile.data?.subjectLevels.find((l) => l.subjectCode === code)?.score;
  return { subjects, score };
}

/** Testlar A — "Fan sayyoralari": dark space panel, robot greeting, each
 * subject a glossy 3D planet with its knowledge score as an orbit ring. */
export function QuizSubjectsPlanets({ onPick }: { onPick: (s: QuizSubject) => void }) {
  const { t } = useTranslation();
  const { subjects, score } = useSubjectsWithScores();
  return (
    <div className="cc-hero rounded-[1.75rem] text-white p-5 sm:p-8 relative overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <RobotMascot className="w-24 h-28 sm:w-32 sm:h-36 -my-4 shrink-0" />
        <div>
          <h1 className="text-2xl sm:text-4xl font-black">{t("quiz.pickSubjectTitle")}</h1>
          {subjects.data && <p className="text-white/75 mt-1">{t("quiz.pickSubjectSubtitle", { grade: subjects.data.grade })}</p>}
        </div>
      </div>
      {subjects.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-y-8 gap-x-3">
          {subjects.data?.subjects.map((s, i) => {
            const look = styleFor(s.code);
            const sc = score(s.code);
            return (
              <button key={s.code} onClick={() => onPick(s)} className="group flex flex-col items-center text-center focus:outline-none">
                <div className="relative" style={{ animation: `chip-float 5s ease-in-out ${-i * 0.7}s infinite` }}>
                  <div className="absolute -inset-3 rounded-full border-2 border-dashed border-white/25 group-hover:border-white/60 transition-colors" />
                  <div
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `radial-gradient(circle at 32% 28%, #ffffffcc 0, transparent 32%), radial-gradient(circle at 70% 78%, rgba(0,0,0,0.3), transparent 55%), linear-gradient(145deg, ${look.from}, ${look.to})`,
                      boxShadow: `0 0 44px -6px ${look.from}, 0 22px 40px -16px ${look.to}`,
                    }}
                  >
                    <look.Icon className="w-9 h-9 sm:w-12 sm:h-12 text-white drop-shadow" strokeWidth={2} />
                  </div>
                  {sc !== undefined && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-black bg-white text-brand-700 rounded-full px-2 py-0.5 shadow-lg">{Math.round(sc)}%</span>
                  )}
                </div>
                <p className="mt-4 font-bold text-sm sm:text-base">{s.name}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Testlar B — "3D kartalar": tall full-colour cards with a huge floating
 * icon, the subject name and a knowledge bar; cards tilt with the mouse. */
export function QuizSubjectsCards({ onPick }: { onPick: (s: QuizSubject) => void }) {
  const { t } = useTranslation();
  const { subjects, score } = useSubjectsWithScores();
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="section-badge !text-brand-600 dark:!text-cyan-300 !border-brand-300/40 dark:!border-cyan-300/30">📚 {t("dashboard.actionQuizTitle")}</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-3">{t("quiz.pickSubjectTitle")}</h1>
          {subjects.data && <p className="text-[var(--text-secondary)] mt-1">{t("quiz.pickSubjectSubtitle", { grade: subjects.data.grade })}</p>}
        </div>
        <RobotMascot className="w-20 h-24 sm:w-28 sm:h-32 shrink-0 -mb-2" />
      </div>
      {subjects.isLoading ? (
        <Skeleton className="h-64" />
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
    </div>
  );
}
