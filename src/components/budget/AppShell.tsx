import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useBudget } from "@/lib/budget/store";
import { MONTHS, monthLabel } from "@/lib/budget/seed";

const NAV = [
  { to: "/", label: "Дашборд" },
  { to: "/expenses", label: "Расходы" },
  { to: "/credits", label: "Кредиты" },
  { to: "/goals", label: "Цели" },
  { to: "/forecast", label: "Прогноз" },
  { to: "/statements", label: "Выписки" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { month, setMonth } = useBudget();

  return (
    <div className="min-h-screen bg-background font-body text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <div className="grid size-8 place-items-center rounded-xl bg-ink font-display text-sm font-extrabold text-background">
            Б
          </div>
          <div>
            <p className="font-display font-extrabold leading-none tracking-tight">Баланс</p>
            <p className="num mt-0.5 text-[11px] text-muted-foreground">{monthLabel(month)}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="num rounded-full border border-line bg-surface px-3 py-1.5 text-xs outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <span className="grid size-8 place-items-center rounded-full bg-violet/15 font-display text-xs font-bold text-violet">
              АУ
            </span>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-5 pb-2">
          <div className="flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                activeProps={{ className: "bg-ink text-background hover:bg-ink" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
