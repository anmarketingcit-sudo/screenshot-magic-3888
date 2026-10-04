import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 font-body text-ink">
      <div className="card-panel w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-ink font-display text-sm font-extrabold text-background">
            Б
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthField(props: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="num text-[11px] text-muted-foreground">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        autoComplete={props.autoComplete}
        required
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

export function AuthSubmit({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
    >
      {busy ? "Подождите…" : children}
    </button>
  );
}

export function AuthMessage({ error, info }: { error?: string | null; info?: string | null }) {
  if (error) return <p className="rounded-xl bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p>;
  if (info) return <p className="rounded-xl bg-teal/10 px-3 py-2 text-xs text-teal">{info}</p>;
  return null;
}

export function ruError(msg: string) {
  if (/invalid login/i.test(msg)) return "Неверный email или пароль.";
  if (/email not confirmed/i.test(msg)) return "Подтвердите email по ссылке из письма.";
  if (/already registered/i.test(msg)) return "Этот email уже зарегистрирован.";
  if (/password/i.test(msg) && /(weak|short|least)/i.test(msg)) return "Пароль слишком простой — минимум 6 символов.";
  return msg;
}
