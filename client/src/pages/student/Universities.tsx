import { MIN_CAREER_GRADE } from "../../constants/grades";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { studentApi, careerApi } from "../../lib/api";
import { Card, EmptyState, Skeleton } from "../../components/ui/primitives";
import { REGIONS } from "../../constants/regions";

export default function Universities() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const universities = useQuery({
    queryKey: ["universities"],
    queryFn: careerApi.getUniversities,
    enabled: profile.data ? profile.data.grade >= MIN_CAREER_GRADE : false,
  });

  if (profile.isLoading) return <Skeleton className="h-40" />;
  if (profile.data && profile.data.grade < MIN_CAREER_GRADE) return <Navigate to="/dashboard" replace />;

  const studentRegion = REGIONS.find((r) => r.code === profile.data?.region);
  const studentRegionName = studentRegion ? (i18n.language === "ru" ? studentRegion.nameRu : studentRegion.nameUz) : null;

  return (
    <div>
      <button
        onClick={() => navigate("/career")}
        className="flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
      >
        <ChevronLeft size={16} /> {t("universities.back")}
      </button>
      <h1 className="text-2xl font-bold mb-1">{t("universities.title")}</h1>

      {universities.isLoading ? (
        <Skeleton className="h-32 mt-5" />
      ) : !universities.data?.topSubject ? (
        <EmptyState title={t("universities.noFavoriteTitle")} description={t("universities.noFavoriteDesc")} />
      ) : (
        <>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {studentRegionName
              ? t("universities.basedOnSubjectAndRegion", { subject: universities.data.topSubject, region: studentRegionName })
              : t("universities.basedOnSubject", { subject: universities.data.topSubject })}
          </p>
          {universities.data.universities.length === 0 ? (
            <EmptyState
              title={t("universities.notFound")}
              description={studentRegionName ? t("universities.notFoundInRegionDesc") : undefined}
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {universities.data.universities.map((u) => (
                <Card key={u.id}>
                  {u.website ? (
                    <a
                      href={u.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold mb-1 text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      {u.name} <ExternalLink size={14} className="shrink-0" />
                    </a>
                  ) : (
                    <p className="font-bold mb-1">{u.name}</p>
                  )}
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    {u.region ? `${u.region}, ` : ""}
                    {u.city}, {u.country}
                  </p>
                  {u.description && <p className="text-sm text-[var(--text-secondary)] mb-3">{u.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {u.programs.map((p) => (
                      <span key={p} className="text-xs bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">
                        {p}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
