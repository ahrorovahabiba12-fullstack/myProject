import { MIN_CAREER_GRADE } from "../../constants/grades";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronLeft, BookOpen, ListChecks, ArrowRight, ExternalLink } from "lucide-react";
import { studentApi, careerApi } from "../../lib/api";
import { Card, EmptyState, Skeleton } from "../../components/ui/primitives";

type RoadmapStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  tasks: string[];
  resources: string[];
  // "" (or missing, for older cached data) means that item has no link.
  taskLinks?: string[];
  resourceUrls?: string[];
};

export default function CareerRoadmap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { careerCode } = useParams<{ careerCode: string }>();
  const [openStep, setOpenStep] = useState<string | null>(null);
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const roadmap = useQuery<RoadmapStep[]>({
    queryKey: ["career-roadmap", careerCode],
    queryFn: () => careerApi.getRoadmap(careerCode!),
    enabled: !!careerCode && (profile.data ? profile.data.grade >= MIN_CAREER_GRADE : false),
  });

  if (profile.isLoading) return <Skeleton className="h-40" />;
  if (profile.data && profile.data.grade < MIN_CAREER_GRADE) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate("/career")}
        className="flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
      >
        <ChevronLeft size={16} /> {t("career.backToList")}
      </button>
      <h1 className="text-2xl font-bold mb-6">{t("career.roadmapTitle")}</h1>
      {roadmap.isLoading ? (
        <Skeleton className="h-48" />
      ) : (roadmap.data ?? []).length === 0 ? (
        <EmptyState title={t("career.roadmapNotFound")} />
      ) : (
        <div className="flex flex-col gap-4">
          {roadmap.data!.map((step) => {
            const isOpen = openStep === step.id;
            return (
              <Card key={step.id} className="!p-0 overflow-hidden">
                <button
                  onClick={() => setOpenStep(isOpen ? null : step.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="w-9 h-9 rounded-full bg-brand-gradient text-white font-bold flex items-center justify-center shrink-0">
                    {step.order}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
                  </div>
                  <ChevronDown size={18} className={`shrink-0 transition-transform text-[var(--text-secondary)] ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (step.tasks.length > 0 || step.resources.length > 0) && (
                  <div className="px-4 pb-4 pl-[68px] flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-4">
                    {step.tasks.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                          <ListChecks size={15} className="text-brand-500" /> {t("career.tasks")}
                        </p>
                        <ul className="flex flex-col gap-1.5 text-sm text-[var(--text-secondary)]">
                          {step.tasks.map((task, i) => {
                            const link = step.taskLinks?.[i];
                            return (
                              <li key={i} className="flex gap-2">
                                <span className="text-brand-500 shrink-0">•</span>
                                {link ? (
                                  <Link to={link} className="text-brand-600 hover:underline inline-flex items-center gap-1">
                                    {task} <ArrowRight size={13} className="shrink-0" />
                                  </Link>
                                ) : (
                                  task
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {step.resources.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                          <BookOpen size={15} className="text-brand-500" /> {t("career.resources")}
                        </p>
                        <ul className="flex flex-col gap-1.5 text-sm text-[var(--text-secondary)]">
                          {step.resources.map((res, i) => {
                            const url = step.resourceUrls?.[i];
                            return (
                              <li key={i} className="flex gap-2">
                                <span className="text-brand-500 shrink-0">•</span>
                                {url ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 hover:underline inline-flex items-center gap-1"
                                  >
                                    {res} <ExternalLink size={13} className="shrink-0" />
                                  </a>
                                ) : (
                                  res
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
