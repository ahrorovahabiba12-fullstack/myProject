import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ShieldCheck, Users, GraduationCap, Heart, Activity, Trophy, BookOpen, HelpCircle, Briefcase, Building2 } from "lucide-react";
import clsx from "clsx";
import { adminApi } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton, Modal } from "../../components/ui/primitives";
import { RobotMascot } from "../../components/three/RobotMascot";

function StatCard({
  icon,
  label,
  value,
  onClick,
  color = "#7c4dff",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <Card
      data-tilt={onClick ? "" : undefined}
      className={clsx("flex flex-col items-start sm:flex-row sm:items-center gap-3", onClick && "cursor-pointer transition-transform hover:-translate-y-0.5")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      <div className="career-tile w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0" style={{ ["--c" as string]: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl sm:text-3xl font-black leading-tight">{value}</p>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    </Card>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

type OpenModal =
  | "activeToday"
  | "subjects"
  | "questions"
  | "careers"
  | "universities"
  | null;

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { adminName } = useOutletContext<{ adminName: string }>();
  const pickName = (item: { nameUz: string; nameRu: string }) => (i18n.language === "ru" ? item.nameRu : item.nameUz);
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.getStats });
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const activeStudentsToday = useQuery({
    queryKey: ["admin-active-students-today"],
    queryFn: adminApi.listActiveStudentsToday,
    enabled: openModal === "activeToday",
  });
  const subjectsList = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: adminApi.listSubjects,
    enabled: openModal === "subjects" || openModal === "questions",
  });
  const careersList = useQuery({
    queryKey: ["admin-careers"],
    queryFn: adminApi.listCareers,
    enabled: openModal === "careers",
  });
  const universitiesList = useQuery({
    queryKey: ["admin-universities"],
    queryFn: adminApi.listUniversities,
    enabled: openModal === "universities",
  });

  if (stats.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (stats.isError || !stats.data) {
    return <ErrorState message={t("admin.loadError")} onRetry={() => stats.refetch()} />;
  }

  const { users, studentsByGrade, quizzes, engagement, catalog } = stats.data;
  const newUsersChart = users.newUsersTrend.map((p) => ({ date: formatDate(p.date), count: p.count }));
  const quizAttemptsChart = quizzes.attemptsTrend.map((p) => ({ date: formatDate(p.date), count: p.count }));
  const maxGradeCount = Math.max(1, ...studentsByGrade.map((g) => g.count));

  return (
    <div className="flex flex-col gap-6">
      <div className="cc-hero relative overflow-hidden rounded-[1.75rem] text-white p-5 sm:p-8 grid sm:grid-cols-[1fr_auto] items-center gap-4">
        <div className="relative z-10 min-w-0 pr-24 sm:pr-0">
          <p className="section-badge mb-3 !inline-flex items-center gap-1.5"><ShieldCheck size={14} /> {t("admin.headerTitle").split("—").pop()?.trim()}</p>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">{t("admin.dashboardTitle")}</h1>
          <p className="text-white/75 mt-1">{t("admin.welcome")}, {adminName}</p>
          <div className="hidden sm:flex flex-wrap gap-2 mt-5">
            <span className="chip-stat bg-white/10 text-white"><Users size={16} className="text-violet-300" /> {users.total} {t("admin.totalUsers").toLowerCase()}</span>
            <span className="chip-stat bg-white/10 text-white"><Activity size={16} className="text-emerald-300" /> {engagement.activeStudentsToday} {t("admin.activeStudentsToday").toLowerCase()}</span>
          </div>
        </div>
        <RobotMascot className="absolute right-0 bottom-0 w-28 h-32 sm:relative sm:w-44 sm:h-48 -mb-4 sm:-my-6" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users size={22} />} label={t("admin.totalUsers")} color="#7c4dff" value={users.total} onClick={() => navigate("/admin/users")} />
        <StatCard
          icon={<GraduationCap size={22} />}
          label={t("admin.students")} color="#0ea5e9"
          value={users.students}
          onClick={() => navigate("/admin/users?role=STUDENT")}
        />
        <StatCard
          icon={<Heart size={22} />}
          label={t("admin.parents")} color="#ec4899"
          value={users.parents}
          onClick={() => navigate("/admin/users?role=PARENT")}
        />
        <StatCard
          icon={<Activity size={22} />}
          label={t("admin.activeStudentsToday")} color="#10b981"
          value={engagement.activeStudentsToday}
          onClick={() => setOpenModal("activeToday")}
        />
        <StatCard icon={<Trophy size={22} />} label={t("admin.averageQuizScore")} color="#f59e0b" value={`${quizzes.averageScore}%`} />
      </div>

      <Modal open={openModal === "activeToday"} onClose={() => setOpenModal(null)} title={t("admin.activeStudentsToday")}>
        {activeStudentsToday.isLoading ? (
          <Skeleton className="h-32" />
        ) : activeStudentsToday.isError ? (
          <ErrorState message={t("admin.usersLoadError")} onRetry={() => activeStudentsToday.refetch()} />
        ) : activeStudentsToday.data?.length === 0 ? (
          <EmptyState title={t("admin.noUsersTitle")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="font-medium pb-2 pr-4">{t("admin.colName")}</th>
                  <th className="font-medium pb-2 pr-4">{t("admin.colEmail")}</th>
                  <th className="font-medium pb-2 pr-4">{t("admin.colGrade")}</th>
                  <th className="font-medium pb-2">{t("admin.minutesToday")}</th>
                </tr>
              </thead>
              <tbody>
                {activeStudentsToday.data?.map((s, i) => (
                  <tr key={`${s.email}-${i}`} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="py-2.5 pr-4 font-medium">{s.fullName}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{s.email}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{t("admin.gradeLabel", { grade: s.grade })}</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">{s.studyMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Card>
        <p className="font-bold text-lg mb-4">{t("admin.newUsersTrend")}</p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={newUsersChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" fontSize={12} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
              <YAxis fontSize={12} allowDecimals={false} stroke="var(--text-secondary)" tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12 }} />
              <defs>
                <linearGradient id="g-users" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="count" stroke="url(#g-users)" strokeWidth={3.5} dot={false} style={{ filter: "drop-shadow(0 6px 10px #a78bfa88)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <p className="font-bold text-lg mb-4">{t("admin.quizAttemptsTrend")}</p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={quizAttemptsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" fontSize={12} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
              <YAxis fontSize={12} allowDecimals={false} stroke="var(--text-secondary)" tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12 }} />
              <defs>
                <linearGradient id="g-quiz" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="count" stroke="url(#g-quiz)" strokeWidth={3.5} dot={false} style={{ filter: "drop-shadow(0 6px 10px #34d39988)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          {t("admin.totalAttempts")}: {quizzes.totalAttempts}
        </p>
      </Card>

      <Card>
        <p className="font-bold text-lg mb-4">{t("admin.studentsByGrade")}</p>
        {studentsByGrade.length === 0 ? (
          <EmptyState title={t("admin.noDataTitle")} />
        ) : (
          <div className="flex flex-col gap-3">
            {studentsByGrade.map((g) => (
              <div key={g.grade} className="flex items-center gap-3">
                <span className="text-sm w-16 shrink-0">
                  {g.grade} {t("profile.grade")}
                </span>
                <div className="flex-1 h-2.5 bg-slate-200/60 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(g.count / maxGradeCount) * 100}%`, background: "linear-gradient(90deg, #7c4dff, #22d3ee)", boxShadow: "0 0 12px rgba(34, 211, 238, 0.6)" }} />
                </div>
                <span className="text-xs text-[var(--text-secondary)] w-8 text-right">{g.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen size={22} />} label={t("admin.subjects")} color="#6366f1" value={catalog.subjects} onClick={() => setOpenModal("subjects")} />
        <StatCard icon={<HelpCircle size={22} />} label={t("admin.questions")} color="#06b6d4" value={catalog.questions} onClick={() => setOpenModal("questions")} />
        <StatCard icon={<Briefcase size={22} />} label={t("admin.careers")} color="#f97316" value={catalog.careers} onClick={() => setOpenModal("careers")} />
        <StatCard
          icon={<Building2 size={22} />}
          label={t("admin.universities")} color="#8b5cf6"
          value={catalog.universities}
          onClick={() => setOpenModal("universities")}
        />
      </div>

      <Modal open={openModal === "subjects"} onClose={() => setOpenModal(null)} title={t("admin.subjects")}>
        {subjectsList.isLoading ? (
          <Skeleton className="h-32" />
        ) : subjectsList.isError ? (
          <ErrorState message={t("admin.usersLoadError")} onRetry={() => subjectsList.refetch()} />
        ) : subjectsList.data?.length === 0 ? (
          <EmptyState title={t("admin.noUsersTitle")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="font-medium pb-2 pr-4">{t("admin.colName")}</th>
                  <th className="font-medium pb-2 pr-4">{t("admin.colCode")}</th>
                  <th className="font-medium pb-2 pr-4">{t("admin.colQuestionCount")}</th>
                  <th className="font-medium pb-2">{t("admin.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {subjectsList.data?.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="py-2.5 pr-4 font-medium">{pickName(s)}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{s.code}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{s.questionCount}</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">
                      {s.active ? t("admin.statusActive") : t("admin.statusInactive")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={openModal === "questions"} onClose={() => setOpenModal(null)} title={t("admin.questions")}>
        {subjectsList.isLoading ? (
          <Skeleton className="h-32" />
        ) : subjectsList.isError ? (
          <ErrorState message={t("admin.usersLoadError")} onRetry={() => subjectsList.refetch()} />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--text-secondary)]">{t("admin.questionsBySubjectHint")}</p>
            {subjectsList.data
              ?.slice()
              .sort((a, b) => b.questionCount - a.questionCount)
              .map((s) => {
                const max = Math.max(1, ...subjectsList.data!.map((x) => x.questionCount));
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-sm w-32 shrink-0 truncate">{pickName(s)}</span>
                    <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-gradient" style={{ width: `${(s.questionCount / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] w-8 text-right">{s.questionCount}</span>
                  </div>
                );
              })}
          </div>
        )}
      </Modal>

      <Modal open={openModal === "careers"} onClose={() => setOpenModal(null)} title={t("admin.careers")}>
        {careersList.isLoading ? (
          <Skeleton className="h-32" />
        ) : careersList.isError ? (
          <ErrorState message={t("admin.usersLoadError")} onRetry={() => careersList.refetch()} />
        ) : careersList.data?.length === 0 ? (
          <EmptyState title={t("admin.noUsersTitle")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="font-medium pb-2 pr-4">{t("admin.colName")}</th>
                  <th className="font-medium pb-2 pr-4">{t("admin.colCode")}</th>
                  <th className="font-medium pb-2">{t("admin.colMinGrade")}</th>
                </tr>
              </thead>
              <tbody>
                {careersList.data?.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="py-2.5 pr-4 font-medium">{pickName(c)}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{c.code}</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">{t("admin.gradeLabel", { grade: c.minGrade })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={openModal === "universities"} onClose={() => setOpenModal(null)} title={t("admin.universities")}>
        {universitiesList.isLoading ? (
          <Skeleton className="h-32" />
        ) : universitiesList.isError ? (
          <ErrorState message={t("admin.usersLoadError")} onRetry={() => universitiesList.refetch()} />
        ) : universitiesList.data?.length === 0 ? (
          <EmptyState title={t("admin.noUsersTitle")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="font-medium pb-2 pr-4">{t("admin.colName")}</th>
                  <th className="font-medium pb-2 pr-4">{t("admin.colCity")}</th>
                  <th className="font-medium pb-2">{t("admin.colCountry")}</th>
                </tr>
              </thead>
              <tbody>
                {universitiesList.data?.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <td className="py-2.5 pr-4 font-medium">{pickName(u)}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{u.city}</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">{u.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Card>
        <p className="font-bold text-lg mb-4">{t("admin.engagement")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-black text-gradient-brand">{engagement.aiConversations}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.aiConversations")}</p>
          </div>
          <div>
            <p className="text-3xl font-black text-gradient-brand">{engagement.aiMessages}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.aiMessages")}</p>
          </div>
          <div>
            <p className="text-3xl font-black text-gradient-brand">{engagement.totalAchievements}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.totalAchievements")}</p>
          </div>
          <div>
            <p className="text-3xl font-black text-gradient-brand">{engagement.unreadNotifications}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.unreadNotifications")}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
