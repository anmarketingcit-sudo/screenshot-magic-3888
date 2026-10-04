import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBudget } from "@/lib/budget/store";
import { MONTHS, monthLabel } from "@/lib/budget/seed";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Дашборд" },
  { to: "/expenses", label: "Расходы" },
  { to: "/credits", label: "Кредиты" },
  { to: "/goals", label: "Цели" },
  { to: "/forecast", label: "Прогноз" },
  { to: "/statements", label: "Выписки" },
] as const;

// На мобильном в нижней панели 4 раздела + «Ещё».
const MOBILE_MAIN = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function AppShell({ children, email }: { children: ReactNode; email: string }) {
  const { month, setMonth, saving, syncError } = useBudget();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const profileRef = useOutside(profileOpen, () => setProfileOpen(false));
  const moreRef = useOutside(moreOpen, () => setMoreOpen(false));

  useEffect(() => {
    setMoreOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const status = syncError ? "Не сохранено" : saving ? "Сохраняем…" : "Сохранено";
  const moreActive = MOBILE_MORE.some((i) => pathname === i.to);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background font-body text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
              Б
            </div>
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold leading-tight tracking-tight">Баланс</p>
              <p className={cn("text-[11px] leading-tight", syncError ? "text-rose" : "text-muted-foreground")}>
                {status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="month">Месяц</label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="num h-11 rounded-full border border-line bg-surface px-3 text-sm font-medium outline-none hover:bg-muted sm:h-9"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>

            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Профиль"
                aria-expanded={profileOpen}
                className="grid size-11 place-items-center rounded-full border border-line bg-surface text-sm font-semibold uppercase text-muted-foreground hover:bg-muted sm:size-9"
              >
                {email.slice(0, 1) || "?"}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-card)] animate-in fade-in-0 zoom-in-95 duration-150">
                  <p className="px-3 pb-1 pt-2 text-[11px] text-muted-foreground">Вы вошли как</p>
                  <p className="truncate px-3 pb-2 text-sm font-medium">{email}</p>
                  <div className="my-1 border-t border-line" />
                  <button
                    onClick={signOut}
                    className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-rose hover:bg-muted"
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Вкладки для планшета и компьютера */}
        <nav className="mx-auto hidden max-w-6xl px-6 pb-2.5 md:block" aria-label="Разделы">
          <div className="inline-flex gap-1 rounded-full bg-muted p-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-ink"
                activeProps={{ className: "bg-surface !text-ink shadow-sm" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-6">{children}</main>

      {/* Нижняя панель для телефона */}
      <nav
        aria-label="Разделы"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-5">
          {MOBILE_MAIN.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "!text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <span className={cn("h-1 w-5 rounded-full", isActive ? "bg-primary" : "bg-transparent")} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </Link>
          ))}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className={cn("h-1 w-5 rounded-full", moreActive ? "bg-primary" : "bg-transparent")} />
              Ещё
            </button>
            {moreOpen && (
              <div className="absolute bottom-full right-2 mb-2 w-48 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-card)] animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
                {MOBILE_MORE.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-muted"
                    activeProps={{ className: "text-primary" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
