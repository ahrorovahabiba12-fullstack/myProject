import { HTMLAttributes, InputHTMLAttributes, forwardRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, X } from "lucide-react";
import clsx from "clsx";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card", className)} {...props}>
      {children}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </label>
    )}
    <input
      ref={ref}
      id={id}
      className={clsx("input-field", error && "ring-2 ring-danger", className)}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    />
    {error && (
      <span id={`${id}-error`} role="alert" className="text-sm text-danger">
        {error}
      </span>
    )}
  </div>
));
Input.displayName = "Input";

/** Password field with an eye button that shows / hides what was typed. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(({ label, error, className, id, ...props }, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          className={clsx("input-field w-full pr-12", error && "ring-2 ring-danger", className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <span id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export function Badge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "success" | "warning" | "danger" }) {
  const toneClass = {
    brand: "bg-brand-100 text-brand-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
  }[tone];
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", toneClass)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden="true" />;
}

export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icon && <div className="text-4xl">{icon}</div>}
      <p className="font-semibold text-[var(--text-primary)]">{title}</p>
      {description && <p className="text-sm text-[var(--text-secondary)] max-w-xs">{description}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-card bg-[var(--bg-card)] shadow-card border border-[var(--border-subtle)] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-lg">{title}</p>
          <button onClick={onClose} aria-label="Close" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <p className="text-danger font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm py-2 px-4">
          Qayta urinish
        </button>
      )}
    </div>
  );
}
