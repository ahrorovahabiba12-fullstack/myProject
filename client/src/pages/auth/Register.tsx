import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Input, PasswordInput } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import clsx from "clsx";
import { SpaceBackground } from "../../components/three/SpaceBackground";
import { RobotMascot } from "../../components/three/RobotMascot";
import { ALL_GRADES } from "../../constants/grades";

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
    <div className="dark space-page min-h-screen flex items-center justify-center text-[var(--text-primary)] px-4 py-10">
      <SpaceBackground />
      <div className="glass-card auth-card relative z-10 w-full max-w-md p-6 sm:p-8 mt-16">
        <div className="flex flex-col items-center mb-6">
          <RobotMascot className="w-36 h-40 -mt-20 sm:-mt-24 mb-1" />
          <h1 className="text-3xl font-black text-gradient">{t("auth.registerTitle")}</h1>
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
          <PasswordInput
            id="password"
            label={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />

          {role === "STUDENT" && (
            <>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t("auth.grade")}</legend>
                <p className="text-xs text-[var(--text-secondary)] -mt-1 mb-1">{t("auth.gradeHint")}</p>
                <div className="grid grid-cols-6 gap-2">
                  {ALL_GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      aria-pressed={grade === g}
                      className={clsx(
                        "h-11 rounded-xl font-bold border transition-colors",
                        grade === g
                          ? "bg-brand-gradient text-white border-transparent shadow-md"
                          : "border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-brand-50 dark:hover:bg-brand-900/30"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </fieldset>
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
          <Button type="submit" loading={loading} className="w-full mt-2 glow-violet">
            {t("auth.submitRegister")}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="text-cyan-300 font-semibold hover:underline">
            {t("auth.switchToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
