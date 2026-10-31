import { MIN_CAREER_GRADE } from "../../constants/grades";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { studentApi, careerApi } from "../../lib/api";
import { Card, EmptyState, Skeleton } from "../../components/ui/primitives";

type CareerRecommendation = {
  careerId: string;
  matchScore: number;
  reasoning: string;
  career: { code: string; name: string; description: string };
};

export default function Career() {
  const { t } = useTranslation();
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const recommendations = useQuery<CareerRecommendation[]>({
    queryKey: ["career-recommendations"],
    queryFn: careerApi.getRecommendations,
    enabled: profile.data ? profile.data.grade >= MIN_CAREER_GRADE : false,
  });

  if (profile.isLoading) return <Skeleton className="h-40" />;

  // CRITICAL GRADE RULE — frontend redirect, mirrors the backend's assertEligible(grade >= MIN_CAREER_GRADE).
  if (profile.data && profile.data.grade < MIN_CAREER_GRADE) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("career.title")}</h1>

      {recommendations.isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (recommendations.data ?? []).length === 0 ? (
        <EmptyState
          icon="🧭"
          title={t("career.emptyTitle")}
          description={t("career.emptyDesc")}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {recommendations.data!.map((rec) => (
            <Card key={rec.careerId}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold">{rec.career.name}</p>
                <span className="text-sm font-semibold text-brand-600">{Math.round(rec.matchScore * 100)}% {t("career.match")}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{rec.reasoning}</p>
              <div className="flex gap-2">
                <Link to={`/career/${rec.career.code}`} className="text-sm font-semibold text-brand-600 hover:underline">
                  {t("career.viewRoadmap")} →
                </Link>
                <Link to="/chat" className="text-sm font-semibold text-brand-600 hover:underline ml-auto flex items-center gap-1">
                  <Sparkles size={14} /> {t("career.discussWithAI")}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link to="/universities" className="text-sm font-semibold text-brand-600 hover:underline">
          {t("career.viewUniversities")} →
        </Link>
      </div>
    </div>
  );
}
