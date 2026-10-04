import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { seedState, MONTHS, OCT } from "./seed";
import { loadState, pushDiff, toRows } from "./sync";
import type { BudgetState, Category, Credit, Goal, MonthKey, Rule, Transaction } from "./types";

type Ctx = {
  state: BudgetState;
  ready: boolean;
  saving: boolean;
  syncError: string | null;
  userId: string;
  month: MonthKey;
  setMonth: (m: MonthKey) => void;
  update: (fn: (s: BudgetState) => BudgetState) => void;
  addTransactions: (tx: Transaction[]) => number;
  setTransactionCategory: (id: string, categoryId: string | null, kind?: Transaction["kind"]) => void;
  removeTransaction: (id: string) => void;
  setCategoryLimit: (id: string, month: MonthKey, value: number) => void;
  renameCategory: (id: string, name: string) => void;
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;
  setCreditPayment: (creditId: string, month: MonthKey, value: number) => void;
  updateCredit: (creditId: string, patch: Partial<Credit>) => void;
  updateGoal: (goalId: string, patch: Partial<Goal>) => void;
  addRule: (rule: Rule) => void;
  removeRule: (id: string) => void;
  setIncome: (id: string, amount: number) => void;
  reset: () => void;
};

const BudgetContext = createContext<Ctx | null>(null);

export function BudgetProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [state, setState] = useState<BudgetState>(seedState);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [month, setMonth] = useState<MonthKey>(OCT);
  const synced = useRef<ReturnType<typeof toRows> | null>(null);

  // Загрузка данных пользователя из базы; при первом входе — стартовый план.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const loaded = await loadState();
        if (!alive) return;
        if (loaded) {
          synced.current = toRows(loaded);
          setState(loaded);
        } else {
          await pushDiff(null, toRows(seedState), userId);
          synced.current = toRows(seedState);
          setState(seedState);
        }
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Не удалось загрузить данные");
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // Сохранение изменений в базу с небольшой задержкой.
  useEffect(() => {
    if (!ready || !synced.current) return;
    const next = toRows(state);
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await pushDiff(synced.current, next, userId);
        synced.current = next;
        setSyncError(null);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Не удалось сохранить");
      }
      setSaving(false);
    }, 250);
    return () => clearTimeout(t);
  }, [state, ready, userId]);

  // Немедленное сохранение при сворачивании вкладки или закрытии страницы.
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      if (!synced.current) return;
      const next = toRows(stateRef.current);
      if (JSON.stringify(next) === JSON.stringify(synced.current)) return;
      const prev = synced.current;
      synced.current = next;
      pushDiff(prev, next, userId).catch((e) => {
        synced.current = prev;
        setSyncError(e instanceof Error ? e.message : "Не удалось сохранить");
      });
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", flush);
    };
  }, [ready, userId]);

  const update = useCallback((fn: (s: BudgetState) => BudgetState) => setState((s) => fn(s)), []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      saving,
      syncError,
      userId,
      month,
      setMonth,
      update,
      addTransactions: (tx) => {
        let added = 0;
        setState((s) => {
          const known = new Set(s.transactions.map((t) => t.hash));
          const fresh = tx.filter((t) => !known.has(t.hash));
          added = fresh.length;
          return { ...s, transactions: [...s.transactions, ...fresh] };
        });
        return added;
      },
      setTransactionCategory: (id, categoryId, kind) =>
        setState((s) => ({
          ...s,
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, categoryId, kind: kind ?? t.kind } : t,
          ),
        })),
      removeTransaction: (id) =>
        setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),
      setCategoryLimit: (id, m, v) =>
        setState((s) => ({
          ...s,
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, limits: { ...c.limits, [m]: v } } : c,
          ),
        })),
      renameCategory: (id, name) =>
        setState((s) => ({
          ...s,
          categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)),
        })),
      addCategory: (name) =>
        setState((s) => {
          const cat: Category = {
            id: `c-${Date.now()}`,
            name,
            limits: Object.fromEntries(MONTHS.map((m) => [m, 0])),
          };
          return { ...s, categories: [...s.categories, cat] };
        }),
      removeCategory: (id) =>
        setState((s) => ({
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          transactions: s.transactions.map((t) =>
            t.categoryId === id ? { ...t, categoryId: null } : t,
          ),
        })),
      setCreditPayment: (creditId, m, v) =>
        setState((s) => ({
          ...s,
          credits: s.credits.map((c) =>
            c.id === creditId ? { ...c, schedule: { ...c.schedule, [m]: v } } : c,
          ),
          categories: s.categories.map((c) =>
            c.id === creditId ? { ...c, limits: { ...c.limits, [m]: v } } : c,
          ),
        })),
      updateCredit: (creditId, patch) =>
        setState((s) => ({
          ...s,
          credits: s.credits.map((c) => (c.id === creditId ? { ...c, ...patch } : c)),
        })),
      updateGoal: (goalId, patch) =>
        setState((s) => ({
          ...s,
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
        })),
      addRule: (rule) => setState((s) => ({ ...s, rules: [...s.rules, rule] })),
      removeRule: (id) => setState((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) })),
      setIncome: (id, amount) =>
        setState((s) => ({
          ...s,
          incomes: s.incomes.map((i) => (i.id === id ? { ...i, amount } : i)),
        })),
      reset: () => setState(seedState),
    }),
    [state, ready, saving, syncError, userId, month, update],
  );

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Загружаем ваши данные…
      </div>
    );
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget должен использоваться внутри BudgetProvider");
  return ctx;
}
