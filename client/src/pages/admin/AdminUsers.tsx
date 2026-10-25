import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { adminApi, AdminUser } from "../../lib/api";
import { Card, Badge, Input, EmptyState, ErrorState, Skeleton } from "../../components/ui/primitives";
import { useAuthStore } from "../../store/authStore";

const ROLE_LABEL_KEY: Record<AdminUser["role"], string> = {
  STUDENT: "admin.roleStudent",
  PARENT: "admin.roleParent",
  ADMIN: "admin.roleAdmin",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const roleFilter = searchParams.get("role") as AdminUser["role"] | null;
  const [search, setSearch] = useState("");

  const users = useQuery({ queryKey: ["admin-users"], queryFn: adminApi.listUsers });

  const updateStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "ACTIVE" | "BLOCKED" }) =>
      adminApi.updateUserStatus(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!q) return true;
      // Email included: phone is optional and usually empty, so name+phone alone
      // couldn't find most accounts by the one identifier every user has.
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [users.data, roleFilter, search]);

  const handleToggleStatus = (u: AdminUser) => {
    const nextStatus = u.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const confirmMessage =
      nextStatus === "BLOCKED" ? t("admin.confirmBlock", { name: u.fullName }) : t("admin.confirmUnblock", { name: u.fullName });
    if (!window.confirm(confirmMessage)) return;
    updateStatus.mutate({ userId: u.id, status: nextStatus });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("admin.usersTitle")}</h1>
        {roleFilter && (
          <button
            onClick={() => setSearchParams({})}
            className="text-sm text-brand-600 hover:underline"
          >
            {t("admin.clearRoleFilter", { role: t(ROLE_LABEL_KEY[roleFilter]) })}
          </button>
        )}
      </div>

      <div className="max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <Input
            placeholder={t("admin.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        {users.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-48" />
          </div>
        ) : users.isError ? (
          <div className="p-6">
            <ErrorState message={t("admin.usersLoadError")} onRetry={() => users.refetch()} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title={t("admin.noUsersTitle")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-secondary)] border-b border-[var(--border-subtle)] bg-[var(--bg-page)]">
                  <th className="font-medium px-4 py-3">{t("admin.colName")}</th>
                  <th className="font-medium px-4 py-3">{t("admin.colPhone")}</th>
                  <th className="font-medium px-4 py-3">{t("admin.colEmail")}</th>
                  <th className="font-medium px-4 py-3">{t("admin.colRole")}</th>
                  <th className="font-medium px-4 py-3">{t("admin.colRegisteredAt")}</th>
                  <th className="font-medium px-4 py-3">{t("admin.colStatus")}</th>
                  <th className="font-medium px-4 py-3 text-right">{t("admin.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                      <td className="px-4 py-3 font-medium">{u.fullName}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{u.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{t(ROLE_LABEL_KEY[u.role])}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>
                          {u.status === "ACTIVE" ? t("admin.statusActive") : t("admin.statusBlocked")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isSelf ? (
                          <span className="text-xs text-[var(--text-secondary)]">—</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={updateStatus.isPending}
                            className={
                              u.status === "ACTIVE"
                                ? "text-sm font-medium text-danger hover:underline disabled:opacity-50"
                                : "text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
                            }
                          >
                            {u.status === "ACTIVE" ? t("admin.block") : t("admin.unblock")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
