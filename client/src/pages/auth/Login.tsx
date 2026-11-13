import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Input, PasswordInput } from "../../components/ui/primitives";
import { Button } from "../../components/ui/Button";
import { SpaceBackground } from "../../components/three/SpaceBackground";
import { RobotMascot } from "../../components/three/RobotMascot";

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
    <div className="dark space-page min-h-screen flex items-center justify-center text-[var(--text-primary)] px-4 py-10">
      <SpaceBackground />
      <div className="glass-card auth-card relative z-10 w-full max-w-md p-6 sm:p-8 mt-16">
        <div className="flex flex-col items-center mb-6">
          <RobotMascot className="w-36 h-40 -mt-20 sm:-mt-24 mb-1" />
          <h1 className="text-3xl font-black text-gradient">{t("auth.loginTitle")}</h1>
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
          <PasswordInput
            id="password"
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
          <Button type="submit" loading={loading} className="w-full mt-2 glow-violet">
            {t("auth.submitLogin")}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-cyan-300 font-semibold hover:underline">
            {t("auth.switchToRegister")}
          </Link>
        </p>
      </div>
    </div>
  );
}
