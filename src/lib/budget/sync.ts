import { supabase } from "@/integrations/supabase/client";
import type { BudgetState } from "./types";

type Table = "categories" | "transactions" | "rules" | "incomes" | "credits" | "goals";
type Row = Record<string, unknown> & { id: string };

// Преобразование сущностей приложения в строки таблиц и обратно.
const MAP = {
  categories: {
    key: "categories",
    to: (c: BudgetState["categories"][number], i: number) => ({ id: c.id, name: c.name, limits: c.limits, position: i }),
    from: (r: any) => ({ id: r.id, name: r.name, limits: r.limits ?? {} }),
  },
  transactions: {
    key: "transactions",
    to: (t: BudgetState["transactions"][number]) => ({
      id: t.id, date: t.date, amount: t.amount, description: t.description, category_id: t.categoryId,
      kind: t.kind, bank: t.bank, card: t.card, source: t.source, hash: t.hash,
    }),
    from: (r: any) => ({
      id: r.id, date: r.date, amount: Number(r.amount), description: r.description, categoryId: r.category_id,
      kind: r.kind, bank: r.bank, card: r.card, source: r.source, hash: r.hash,
    }),
  },
  rules: {
    key: "rules",
    to: (r: BudgetState["rules"][number]) => ({ id: r.id, match: r.match, category_id: r.categoryId, kind: r.kind }),
    from: (r: any) => ({ id: r.id, match: r.match, categoryId: r.category_id, kind: r.kind }),
  },
  incomes: {
    key: "incomes",
    to: (i: BudgetState["incomes"][number]) => ({ id: i.id, name: i.name, amount: i.amount, regular: i.regular }),
    from: (r: any) => ({ id: r.id, name: r.name, amount: Number(r.amount), regular: r.regular }),
  },
  credits: {
    key: "credits",
    to: (c: BudgetState["credits"][number]) => ({
      id: c.id, name: c.name, category_id: c.categoryId, principal_known: c.principalKnown,
      principal: c.principal, schedule: c.schedule,
    }),
    from: (r: any) => ({
      id: r.id, name: r.name, categoryId: r.category_id, principalKnown: r.principal_known,
      principal: r.principal === null ? null : Number(r.principal), schedule: r.schedule ?? {},
    }),
  },
  goals: {
    key: "goals",
    to: (g: BudgetState["goals"][number]) => ({
      id: g.id, name: g.name, category_id: g.categoryId, target: g.target, monthly_plan: g.monthlyPlan, saved: g.saved,
    }),
    from: (r: any) => ({
      id: r.id, name: r.name, categoryId: r.category_id, target: Number(r.target),
      monthlyPlan: r.monthly_plan ?? {}, saved: Number(r.saved),
    }),
  },
} as const;

const TABLES = Object.keys(MAP) as Table[];

export function toRows(state: BudgetState): Record<Table, Row[]> {
  const out = {} as Record<Table, Row[]>;
  for (const t of TABLES) {
    const m = MAP[t] as any;
    out[t] = (state[t] as any[]).map((x, i) => m.to(x, i));
  }
  return out;
}

export async function loadState(): Promise<BudgetState | null> {
  const results = await Promise.all(
    TABLES.map((t) => {
      const q = supabase.from(t).select("*");
      return t === "categories" ? q.order("position") : q.order("created_at");
    }),
  );
  const err = results.find((r) => r.error)?.error;
  if (err) throw err;
  if ((results[0].data ?? []).length === 0) return null;
  const state = {} as BudgetState;
  TABLES.forEach((t, i) => {
    (state as any)[t] = (results[i].data ?? []).map((r) => (MAP[t] as any).from(r));
  });
  return state;
}

/** Отправляет в базу только изменённые и удалённые записи. */
export async function pushDiff(prev: Record<Table, Row[]> | null, next: Record<Table, Row[]>, userId: string) {
  for (const t of TABLES) {
    const before = new Map((prev?.[t] ?? []).map((r) => [r.id, JSON.stringify(r)]));
    const nextIds = new Set(next[t].map((r) => r.id));
    const changed = next[t].filter((r) => before.get(r.id) !== JSON.stringify(r)).map((r) => ({ ...r, user_id: userId }));
    const removed = [...before.keys()].filter((id) => !nextIds.has(id));
    for (let i = 0; i < changed.length; i += 500) {
      const { error } = await supabase.from(t).upsert(changed.slice(i, i + 500) as any, { onConflict: "user_id,id" });
      if (error) throw error;
    }
    if (removed.length) {
      const { error } = await supabase.from(t).delete().in("id", removed);
      if (error) throw error;
    }
  }
}
