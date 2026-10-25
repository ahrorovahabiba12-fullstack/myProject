import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Input } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import clsx from "clsx";
import { LogoIcon } from "../../components/icons/LogoIcon";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [role, setRole] = useState<"STUDENT" | "PARENT">("STUDENT");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState(9);
  const [parentEmail, setParentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.register({
        email,
        password,
        fullName,
        role,
        grade: role === "STUDENT" ? grade : undefined,
        parentEmail: role === "STUDENT" && parentEmail ? parentEmail : undefined,
      });
      setSession(session);
      navigate(session.user.role === "PARENT" ? "/parent" : "/dashboard");
    } catch (err) {
      const message = err instanceof AxiosError ? err.response?.data?.error?.message : null;
      setError(message ?? t("auth.registerError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-4 py-10">
      <div className="card w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center text-white mb-3">
            <LogoIcon size={22} />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.registerTitle")}</h1>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {(["STUDENT", "PARENT"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={clsx(
                "rounded-xl py-2.5 font-semibold text-sm border transition-colors",
                role === r ? "bg-brand-500 text-white border-brand-500" : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              )}
            >
              {r === "STUDENT" ? t("auth.student") : t("auth.parent")}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="fullName" label={t("auth.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input id="email" type="email" label={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input
            id="password"
            type="password"
            label={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />

          {role === "STUDENT" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="grade" className="text-sm font-medium text-[var(--text-secondary)]">
                  {t("auth.grade")}
                </label>
                <select id="grade" className="input-field" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                  {Array.from({ length: 8 }, (_, i) => i + 4).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                id="parentEmail"
                type="email"
                label={t("auth.parentEmailOptional")}
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
              />
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full mt-2">
            {t("auth.submitRegister")}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            {t("auth.switchToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
