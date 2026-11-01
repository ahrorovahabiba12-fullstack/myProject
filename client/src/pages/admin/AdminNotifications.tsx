import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import clsx from "clsx";
import { adminApi, AdminNotificationInput } from "../../lib/api";
import { Card, Input } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";

type Target = "all" | "grade" | "email";

const textareaClass =
  "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 min-h-[96px]";

/** Admin: write a notification and send it to everyone, one grade, or one user. */
export default function AdminNotifications() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleRu, setTitleRu] = useState("");
  const [bodyRu, setBodyRu] = useState("");
  const [showRu, setShowRu] = useState(false);
  const [audience, setAudience] = useState<AdminNotificationInput["audience"]>("ALL");
  const [target, setTarget] = useState<Target>("all");
  const [grade, setGrade] = useState(11);
  const [email, setEmail] = useState("");

  const send = useMutation({
    mutationFn: adminApi.sendNotification,
    onSuccess: () => {
      setTitle("");
      setBody("");
      setTitleRu("");
      setBodyRu("");
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const scope = target === "all" ? t("adminNotif.toAll") : target === "grade" ? t("adminNotif.toGrade", { grade }) : email;
    if (!window.confirm(t("adminNotif.confirm", { scope }))) return;
    send.mutate({
      title,
      body,
      titleRu: titleRu || undefined,
      bodyRu: bodyRu || undefined,
      audience: target === "email" ? "ALL" : audience,
      grade: target === "grade" ? grade : undefined,
      email: target === "email" ? email : undefined,
    });
  };

  const chip = (active: boolean) =>
    clsx(
      "text-sm rounded-full px-3.5 py-1.5 border font-medium transition",
      active ? "bg-brand-600 text-white border-brand-600" : "border-[var(--border-subtle)] hover:border-brand-300"
    );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">🔔 {t("adminNotif.title")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-5">{t("adminNotif.intro")}</p>

      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t("adminNotif.whom")}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(["all", "grade", "email"] as Target[]).map((x) => (
                <button type="button" key={x} onClick={() => setTarget(x)} className={chip(target === x)}>
                  {t(`adminNotif.target_${x}`)}
                </button>
              ))}
            </div>
            {target === "grade" && (
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="text-sm rounded-xl px-3 py-2 border border-[var(--border-subtle)] bg-[var(--bg-card)] mb-3"
                aria-label={t("adminNotif.grade")}
              >
                {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    {g}-{t("profile.grade")}
                  </option>
                ))}
              </select>
            )}
            {target === "email" ? (
              <Input
                id="notif-email"
                type="email"
                required
                placeholder="student@example.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(["ALL", "STUDENTS", "PARENTS"] as const).map((a) => (
                  <button type="button" key={a} onClick={() => setAudience(a)} className={chip(audience === a)}>
                    {t(`adminNotif.audience_${a}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Input id="notif-title" label={t("adminNotif.titleLabel")} required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notif-body" className="text-sm font-medium text-[var(--text-secondary)]">
              {t("adminNotif.bodyLabel")}
            </label>
            <textarea id="notif-body" required maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} className={textareaClass} />
          </div>

          <button type="button" onClick={() => setShowRu(!showRu)} className="self-start text-sm font-semibold text-brand-600 hover:underline">
            {showRu ? "−" : "+"} {t("adminNotif.addRu")}
          </button>
          {showRu && (
            <>
              <Input id="notif-title-ru" label={t("adminNotif.titleRuLabel")} maxLength={120} value={titleRu} onChange={(e) => setTitleRu(e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notif-body-ru" className="text-sm font-medium text-[var(--text-secondary)]">
                  {t("adminNotif.bodyRuLabel")}
                </label>
                <textarea id="notif-body-ru" maxLength={1000} value={bodyRu} onChange={(e) => setBodyRu(e.target.value)} className={textareaClass} />
              </div>
            </>
          )}

          <Button type="submit" loading={send.isPending} className="self-start inline-flex items-center gap-2">
            <Send size={16} /> {t("adminNotif.send")}
          </Button>
          {send.isSuccess && <p className="text-sm text-emerald-600 font-medium">✓ {t("adminNotif.sent", { count: send.data.sent })}</p>}
          {send.isError && <p className="text-sm text-red-600">{t("adminNotif.error")}</p>}
        </form>
      </Card>

      <Card className="mt-4 text-sm">
        <p className="font-semibold mb-2">{t("adminNotif.autoTitle")}</p>
        <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
          <li>{t("adminNotif.auto1")}</li>
          <li>{t("adminNotif.auto2")}</li>
          <li>{t("adminNotif.auto3")}</li>
          <li>{t("adminNotif.auto4")}</li>
          <li>{t("adminNotif.auto5")}</li>
        </ul>
      </Card>
    </div>
  );
}
