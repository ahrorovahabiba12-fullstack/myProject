import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, GraduationCap, Heart, Activity, Trophy, BookOpen, HelpCircle, Briefcase, Building2 } from "lucide-react";
import clsx from "clsx";
import { adminApi } from "../../lib/api";
import { Card, EmptyState, ErrorState, Skeleton, Modal } from "../../components/ui/primitives";

function StatCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={clsx("flex items-center gap-3", onClick && "cursor-pointer transition-shadow hover:shadow-lg")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold">{value}</p>
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
      <h1 className="text-2xl font-bold">{t("admin.dashboardTitle")}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users size={18} />} label={t("admin.totalUsers")} value={users.total} onClick={() => navigate("/admin/users")} />
        <StatCard
          icon={<GraduationCap size={18} />}
          label={t("admin.students")}
          value={users.students}
          onClick={() => navigate("/admin/users?role=STUDENT")}
        />
        <StatCard
          icon={<Heart size={18} />}
          label={t("admin.parents")}
          value={users.parents}
          onClick={() => navigate("/admin/users?role=PARENT")}
        />
        <StatCard
          icon={<Activity size={18} />}
          label={t("admin.activeStudentsToday")}
          value={engagement.activeStudentsToday}
          onClick={() => setOpenModal("activeToday")}
        />
        <StatCard icon={<Trophy size={18} />} label={t("admin.averageQuizScore")} value={`${quizzes.averageScore}%`} />
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
        <p className="font-semibold mb-4">{t("admin.newUsersTrend")}</p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={newUsersChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6c3ffb" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <p className="font-semibold mb-4">{t("admin.quizAttemptsTrend")}</p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={quizAttemptsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          {t("admin.totalAttempts")}: {quizzes.totalAttempts}
        </p>
      </Card>

      <Card>
        <p className="font-semibold mb-4">{t("admin.studentsByGrade")}</p>
        {studentsByGrade.length === 0 ? (
          <EmptyState title={t("admin.noDataTitle")} />
        ) : (
          <div className="flex flex-col gap-3">
            {studentsByGrade.map((g) => (
              <div key={g.grade} className="flex items-center gap-3">
                <span className="text-sm w-16 shrink-0">
                  {g.grade} {t("profile.grade")}
                </span>
                <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-gradient" style={{ width: `${(g.count / maxGradeCount) * 100}%` }} />
                </div>
                <span className="text-xs text-[var(--text-secondary)] w-8 text-right">{g.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen size={18} />} label={t("admin.subjects")} value={catalog.subjects} onClick={() => setOpenModal("subjects")} />
        <StatCard icon={<HelpCircle size={18} />} label={t("admin.questions")} value={catalog.questions} onClick={() => setOpenModal("questions")} />
        <StatCard icon={<Briefcase size={18} />} label={t("admin.careers")} value={catalog.careers} onClick={() => setOpenModal("careers")} />
        <StatCard
          icon={<Building2 size={18} />}
          label={t("admin.universities")}
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
        <p className="font-semibold mb-4">{t("admin.engagement")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xl font-extrabold text-brand-600">{engagement.aiConversations}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.aiConversations")}</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-brand-600">{engagement.aiMessages}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.aiMessages")}</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-brand-600">{engagement.totalAchievements}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.totalAchievements")}</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-brand-600">{engagement.unreadNotifications}</p>
            <p className="text-xs text-[var(--text-secondary)]">{t("admin.unreadNotifications")}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
