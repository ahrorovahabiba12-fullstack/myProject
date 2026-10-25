import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Input } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import { LogoIcon } from "../../components/icons/LogoIcon";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.login({ email, password });
      setSession(session);
      if (session.user.role === "PARENT") navigate("/parent");
      else if (session.user.role === "ADMIN") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      const message = err instanceof AxiosError ? err.response?.data?.error?.message : null;
      setError(message ?? t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="card w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center text-white mb-3">
            <LogoIcon size={22} />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="password"
            type="password"
            label={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full mt-2">
            {t("auth.submitLogin")}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            {t("auth.switchToRegister")}
          </Link>
        </p>
      </div>
    </div>
  );
}
