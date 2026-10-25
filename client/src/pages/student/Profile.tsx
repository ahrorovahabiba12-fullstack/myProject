import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { X, Lightbulb, Flag, Briefcase, BookOpen, MapPin, Users } from "lucide-react";
import { studentApi, careerApi, subjectApi, StudentProfile } from "../../lib/api";
import { Card, Skeleton } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import { useTranslation } from "react-i18next";
import { REGIONS } from "../../constants/regions";
import clsx from "clsx";

const TAG_COLORS = {
  brand: "bg-brand-100 text-brand-700",
  emerald: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
};

function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

function TagEditor({
  label,
  icon,
  color,
  values,
  onChange,
  labelFor,
}: {
  label: string;
  icon: React.ReactNode;
  color: keyof typeof TAG_COLORS;
  values: string[];
  onChange: (v: string[]) => void;
  labelFor?: (v: string) => string;
}) {
  const [input, setInput] = useState("");
  const { t } = useTranslation();
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-2">
        {icon} {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className={clsx(
              "inline-flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full",
              TAG_COLORS[color]
            )}
          >
            {labelFor ? labelFor(v) : v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`${v} ${t("profile.remove")}`}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={t("profile.addPlaceholder")}
          className="input-field flex-1"
        />
      </div>
    </div>
  );
}

// Order matters here (unlike the free-text TagEditor tags): the FIRST
// selected subject is what university recommendations are based on, so
// clicking one appends it to the end and clicking it again removes it,
// letting the student re-pick to change which one is "first".
function FavoriteSubjectPicker({
  values,
  onChange,
}: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useTranslation();
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: subjectApi.list });

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-2">
        <BookOpen size={15} /> {t("profile.favoriteSubjects")}
      </label>
      <p className="text-xs text-[var(--text-secondary)] mb-2">{t("profile.favoriteSubjectsHint")}</p>
      <div className="flex flex-wrap gap-2">
        {(subjects ?? []).map((s) => {
          const index = values.indexOf(s.code);
          const selected = index !== -1;
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => onChange(selected ? values.filter((v) => v !== s.code) : [...values, s.code])}
              className={clsx(
                "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border transition-colors",
                selected ? "bg-brand-500 text-white border-brand-500" : "border-[var(--border-subtle)] hover:bg-brand-50/50"
              )}
            >
              {selected && <span className="text-xs font-bold">{index + 1}</span>}
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RegionPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-2">
        <MapPin size={15} /> {t("profile.region")}
      </label>
      <p className="text-xs text-[var(--text-secondary)] mb-2">{t("profile.regionHint")}</p>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="input-field"
      >
        <option value="">{t("profile.regionNotSet")}</option>
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>
            {i18n.language === "ru" ? r.nameRu : r.nameUz}
          </option>
        ))}
      </select>
    </div>
  );
}

// Linking is saved on its own (not via the page's Save button): it's a
// separate account relationship, not a profile field, and it can fail on its
// own terms (no parent account with that email yet).
function ParentLink({ parent }: { parent: StudentProfile["parent"] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const link = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLinking(true);
    setNotice(null);
    try {
      await studentApi.linkParent(email.trim());
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEmail("");
      setNotice({ tone: "success", text: t("profile.parentLinkedSuccess") });
    } catch (err) {
      const notFound = err instanceof AxiosError && err.response?.status === 404;
      setNotice({ tone: "error", text: notFound ? t("profile.parentNotFound") : t("profile.parentLinkError") });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] mb-2">
        <Users size={15} /> {t("profile.parentTitle")}
      </label>
      <p className="text-xs text-[var(--text-secondary)] mb-2">{t("profile.parentHint")}</p>
      <p className="text-sm mb-2">
        {parent ? t("profile.parentLinked", { name: parent.fullName, email: parent.email }) : t("profile.parentNotLinked")}
      </p>
      <form onSubmit={link} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("profile.parentEmailPlaceholder")}
          className="input-field flex-1"
          aria-label={t("profile.parentEmailPlaceholder")}
        />
        <Button type="submit" variant="secondary" loading={linking}>
          {t("profile.parentLinkButton")}
        </Button>
      </form>
      {notice && (
        <p className={clsx("text-sm mt-2", notice.tone === "success" ? "text-emerald-600" : "text-danger")}>{notice.text}</p>
      )}
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: studentApi.getProfile });
  const { data: careerCatalog } = useQuery({
    queryKey: ["careerCatalog"],
    queryFn: careerApi.getCatalog,
    enabled: !!data?.careerModuleVisible,
  });
  const careerNameByCode = new Map((careerCatalog ?? []).map((c) => [c.code, c.name]));

  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [favoriteSubjects, setFavoriteSubjects] = useState<string[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setInterests(data.interests);
      setGoals(data.goals);
      setCareerInterests(data.careerInterests);
      setFavoriteSubjects(data.favoriteSubjects);
      setRegion(data.region);
    }
  }, [data]);

  // Favorite subjects are ORDER-sensitive (the first one drives university
  // recommendations) — a plain sameTags() ignores order, so it's compared
  // as a plain array here instead.
  const dirty =
    !!data &&
    (!sameTags(interests, data.interests) ||
      !sameTags(goals, data.goals) ||
      !sameTags(careerInterests, data.careerInterests) ||
      favoriteSubjects.join(",") !== data.favoriteSubjects.join(",") ||
      region !== data.region);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await studentApi.updateProfile({ interests, goals, careerInterests, favoriteSubjects, region });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["universities"] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;

  const initials = (data?.fullName ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-xl">
      <div className="bg-brand-gradient rounded-2xl px-6 py-5 flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-white font-bold text-lg">{data?.fullName}</p>
          <p className="text-white/80 text-sm">
            {data?.grade}-{t("profile.grade")}
          </p>
        </div>
      </div>

      <Card className="flex flex-col gap-6">
        {data?.careerModuleVisible && (
          <>
            <RegionPicker value={region} onChange={setRegion} />
            <FavoriteSubjectPicker values={favoriteSubjects} onChange={setFavoriteSubjects} />
          </>
        )}
        <TagEditor
          label={t("profile.interests")}
          icon={<Lightbulb size={15} />}
          color="brand"
          values={interests}
          onChange={setInterests}
        />
        <TagEditor
          label={t("profile.goals")}
          icon={<Flag size={15} />}
          color="emerald"
          values={goals}
          onChange={setGoals}
        />
        {data?.careerModuleVisible && (
          <TagEditor
            label={t("profile.careerInterests")}
            icon={<Briefcase size={15} />}
            color="violet"
            values={careerInterests}
            onChange={setCareerInterests}
            labelFor={(code) => careerNameByCode.get(code) ?? code}
          />
        )}

        <ParentLink parent={data?.parent ?? null} />

        {(dirty || saved) && (
          <div className="flex items-center gap-3">
            {dirty && (
              <Button onClick={save} loading={saving}>
                {t("profile.save")}
              </Button>
            )}
            {saved && !dirty && <span className="text-sm text-emerald-600 font-medium">{t("profile.saved")}</span>}
          </div>
        )}
      </Card>
    </div>
  );
}
