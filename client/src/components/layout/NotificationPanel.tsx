import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { notificationApi, NotificationItem } from "../../lib/api";
import { EmptyState, ErrorState, Skeleton } from "../ui/primitives";

function useRelativeTime() {
  const { t } = useTranslation();
  return (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t("notifications.justNow");
    if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("notifications.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("notifications.daysAgo", { count: days });
  };
}

function NotificationRow({ item, onRead }: { item: NotificationItem; onRead: (id: string) => void }) {
  const relativeTime = useRelativeTime();
  return (
    <button
      onClick={() => !item.read && onRead(item.id)}
      className="w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-black/[.02] dark:hover:bg-white/[.03] transition-colors flex gap-2"
    >
      {!item.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />}
      <div className={item.read ? "pl-4" : ""}>
        <p className="text-sm font-semibold">{item.title}</p>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{item.body}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{relativeTime(item.createdAt)}</p>
      </div>
    </button>
  );
}

export function NotificationPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unread } = useQuery({ queryKey: ["unread-count"], queryFn: notificationApi.unreadCount });
  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ["notifications"], queryFn: notificationApi.list, enabled: open });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = async (id: string) => {
    await notificationApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("notifications.title")}
        aria-expanded={open}
        className="relative w-9 h-9 rounded-full border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-card)] flex items-center justify-center"
      >
        <Bell size={16} />
        {!!unread?.count && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
            {unread.count > 9 ? "9+" : unread.count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 max-h-[70vh] sm:max-h-96 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg z-50">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] font-semibold text-sm">
            {t("notifications.title")}
          </div>
          {isLoading ? (
            <div className="p-4 flex flex-col gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : isError ? (
            <div className="p-4">
              <ErrorState message={t("notifications.loadError")} onRetry={() => refetch()} />
            </div>
          ) : notifications?.length === 0 ? (
            <div className="p-4">
              <EmptyState icon="🔔" title={t("notifications.empty")} />
            </div>
          ) : (
            notifications?.map((n) => <NotificationRow key={n.id} item={n} onRead={markRead} />)
          )}
        </div>
      )}
    </div>
  );
}
