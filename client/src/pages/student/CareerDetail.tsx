import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ChevronLeft, ExternalLink, GraduationCap, MapPin, School, Target, ClipboardList, Map as MapIcon } from "lucide-react";
import { MIN_CAREER_GRADE } from "../../constants/grades";
import { REGIONS } from "../../constants/regions";
import { DISTRICTS } from "../../constants/districts";
import { careerApi, studentApi, CareerDetails as Details } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";

export default function CareerDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { careerCode } = useParams<{ careerCode: string }>();
  const profile = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const eligible = profile.data ? profile.data.grade >= MIN_CAREER_GRADE : false;
  const details = useQuery({
    queryKey: ["career-details", careerCode],
    queryFn: () => careerApi.getDetails(careerCode!),
    enabled: !!careerCode && eligible,
  });

  if (profile.isLoading) return <Skeleton className="h-40" />;
  if (profile.data && !eligible) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate("/career")}
        className="flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
      >
        <ChevronLeft size={16} /> {t("career.backToResults")}
      </button>
      {details.isLoading ? (
        <Skeleton className="h-64" />
      ) : details.isError || !details.data ? (
        <ErrorState message={t("career.loadError")} onRetry={() => details.refetch()} />
      ) : (
        <DetailBody d={details.data} />
      )}
    </div>
  );
}

function DetailBody({ d }: { d: Details }) {
  const { t } = useTranslation();
  const subjectsParam = d.exam.specialty.map((s) => s.code).join(",");
  return (
    <>
      <div className="rounded-card p-6 text-white bg-brand-gradient shadow-card mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{d.name}</h1>
        <p className="text-white/90 mb-3">{d.description}</p>
        <div className="flex flex-wrap gap-2">
          {d.types.map((x) => (
            <span key={x.code} className="text-xs rounded-full bg-white/20 px-2.5 py-1">
              {x.emoji} {x.name}
            </span>
          ))}
        </div>
      </div>

      {/* Entrance exam */}
      <Card className="mb-4">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <ClipboardList size={18} className="text-brand-600" /> {t("career.examTitle")}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{t("career.examIntro", { max: d.exam.maxScore })}</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          {d.exam.specialty.map((s) => (
            <div key={s.code} className="rounded-xl border-2 border-brand-200 dark:border-brand-800 p-4">
              <p className="text-xs font-semibold text-brand-600 uppercase">{t(s.block === "first" ? "career.firstSubject" : "career.secondSubject")}</p>
              <p className="text-lg font-bold">{s.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("career.blockInfo", { q: s.questions, p: s.points, total: Math.round(s.questions * s.points) })}
              </p>
              <p className="text-sm mt-2">
                {s.myScore === null ? (
                  <span className="text-[var(--text-secondary)]">{t("career.noScoreYet")}</span>
                ) : (
                  <>
                    {t("career.myScore")}: <b>{Math.round(s.myScore)}%</b>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm">
          <b>{t("career.compulsory")}:</b> {d.exam.compulsory.map((c) => c.name).join(", ")}{" "}
          <span className="text-[var(--text-secondary)]">
            ({t("career.blockInfo", { q: d.exam.compulsory[0].questions, p: d.exam.compulsory[0].points, total: Math.round(d.exam.compulsory[0].questions * d.exam.compulsory[0].points) })} {t("career.each")})
          </span>
        </p>
        {d.exam.extra && <p className="text-sm mt-2 font-medium text-amber-700 dark:text-amber-400">⚠️ {d.exam.extra}</p>}
        <p className="text-xs text-[var(--text-secondary)] mt-3">
          {t("career.examDisclaimer")}{" "}
          <a href="https://uzbmb.uz/" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
            uzbmb.uz
          </a>
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to={`/dtm?subjects=${subjectsParam}`} className="btn-primary text-sm">
            📝 {t("career.dtmButton")}
          </Link>
          {d.hasRoadmap && (
            <Link to={`/career/${d.code}/roadmap`} className="btn-secondary text-sm inline-flex items-center gap-1">
              <MapIcon size={14} /> {t("career.viewRoadmap")}
            </Link>
          )}
        </div>
      </Card>

      {/* How to prepare */}
      <Card className="mb-4">
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Target size={18} className="text-brand-600" /> {t("career.prepTitle")}
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          {d.exam.specialty.map((s) => (
            <li key={s.code}>
              {t(s.block === "first" ? "career.prepFirst" : "career.prepSecond", { subject: s.name })}{" "}
              <Link to={`/quiz?subject=${s.code}`} className="text-brand-600 font-semibold hover:underline">
                {t("career.practise")} →
              </Link>
            </li>
          ))}
          <li>{t("career.prepCompulsory")}</li>
          <li>{t("career.prepDtm")}</li>
          <li>{t("career.prepPlan")}</li>
        </ol>
      </Card>

      {/* Universities */}
      <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
        <GraduationCap size={18} className="text-brand-600" /> {t("career.universitiesTitle")}
      </h2>
      {d.universities.length === 0 ? (
        <EmptyState icon="🎓" title={t("career.noUniversities")} />
      ) : (
        <div className="grid gap-3">
          {d.universities.map((u) => (
            <UniversityCard key={u.id} u={u} d={d} />
          ))}
        </div>
      )}
    </>
  );
}

function UniversityCard({ u, d }: { u: Details["universities"][number]; d: Details }) {
  const { t } = useTranslation();
  const [showCenters, setShowCenters] = useState(false);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-bold">{u.name}</p>
        {u.nearMe && <span className="text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">{t("career.nearYou")}</span>}
      </div>
      <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1 mt-1">
        <MapPin size={14} /> {u.city}, {u.region}
      </p>
      {u.description && <p className="text-sm mt-2">{u.description}</p>}
      <p className="text-sm mt-2">
        <b>{t("career.programs")}:</b> {u.programs.join(", ")}
      </p>
      <p className="text-sm mt-1">
        <b>{t("career.examSubjects")}:</b> {d.exam.specialty.map((s) => s.name).join(" + ")}
        {d.exam.extra ? ` + ${d.exam.extra.toLowerCase()}` : ""}
      </p>
      <div className="flex flex-wrap gap-3 mt-3 items-center">
        {u.website && (
          <a href={u.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-600 hover:underline inline-flex items-center gap-1">
            {t("career.website")} <ExternalLink size={13} />
          </a>
        )}
        <button
          onClick={() => setShowCenters(!showCenters)}
          className="text-sm font-semibold rounded-lg px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 inline-flex items-center gap-1"
          aria-expanded={showCenters}
        >
          <School size={14} /> {t("career.needCenter")}
        </button>
      </div>
      {showCenters && <StudyCenters subjects={d.exam.specialty} defaultRegion={d.studentRegion} />}
    </Card>
  );
}

/** Google Maps search for study centres of a subject in the chosen district. */
function mapsUrl(subject: string, district: string, region: string, ru: boolean) {
  const r = REGIONS.find((x) => x.code === region);
  const d = DISTRICTS[region]?.find((x) => x.uz === district);
  const q = ru
    ? `учебный центр ${subject} ${d?.ru ?? district} ${r?.nameRu ?? ""}`
    : `o'quv markazi ${subject} ${district} ${r?.nameUz ?? ""}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function StudyCenters({ subjects, defaultRegion }: { subjects: Details["exam"]["specialty"]; defaultRegion: string | null }) {
  const { t, i18n } = useTranslation();
  const [subject, setSubject] = useState(subjects[0]?.code ?? "");
  const [region, setRegion] = useState(defaultRegion ?? "");
  const [district, setDistrict] = useState("");
  const centers = useQuery({
    queryKey: ["study-centers", subject, region],
    queryFn: () => careerApi.studyCenters(subject, region || null),
    enabled: !!subject,
  });
  const ru = i18n.language === "ru";
  return (
    <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
      <p className="font-semibold mb-3">{t("career.centersTitle")}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {subjects.map((s) => (
          <button
            key={s.code}
            onClick={() => setSubject(s.code)}
            className={clsx(
              "text-sm rounded-full px-3 py-1 border",
              subject === s.code ? "bg-brand-600 text-white border-brand-600" : "border-[var(--border-subtle)]"
            )}
          >
            {s.name}
          </button>
        ))}
        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value);
            setDistrict("");
          }}
          className="text-sm rounded-full px-3 py-1 border border-[var(--border-subtle)] bg-[var(--bg-card)]"
          aria-label={t("career.region")}
        >
          <option value="">{t("career.allRegions")}</option>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {ru ? r.nameRu : r.nameUz}
            </option>
          ))}
        </select>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          disabled={!region}
          className="text-sm rounded-full px-3 py-1 border border-[var(--border-subtle)] bg-[var(--bg-card)] disabled:opacity-50"
          aria-label={t("career.district")}
        >
          <option value="">{region ? t("career.pickDistrict") : t("career.pickRegionFirst")}</option>
          {(DISTRICTS[region] ?? []).map((x) => (
            <option key={x.uz} value={x.uz}>
              {ru ? x.ru : x.uz}
            </option>
          ))}
        </select>
      </div>
      {district && (
        <a
          href={mapsUrl(subjects.find((s) => s.code === subject)?.name ?? "", district, region, ru)}
          target="_blank"
          rel="noreferrer"
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold rounded-lg px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
        >
          <MapPin size={14} /> {t("career.searchOnMap", { district: ru ? DISTRICTS[region]?.find((x) => x.uz === district)?.ru : district })}
          <ExternalLink size={13} />
        </a>
      )}
      {centers.isLoading ? (
        <Skeleton className="h-16" />
      ) : (centers.data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("career.noCenters")}</p>
      ) : (
        <ul className="grid gap-2">
          {centers.data!.map((c) => (
            <li key={c.code} className="rounded-lg bg-[var(--bg-card)] p-3 text-sm">
              <p className="font-semibold">{c.name}</p>
              <p className="text-[var(--text-secondary)]">{c.regions.length ? c.regions.join(", ") : t("career.nationwide")}</p>
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                  {c.website}
                </a>
              )}
              {c.sourceUrl && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t("career.source")}:{" "}
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    {c.source}
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-[var(--text-secondary)] mt-3">{t("career.centersNote")}</p>
    </div>
  );
}
