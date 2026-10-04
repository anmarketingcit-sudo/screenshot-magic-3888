import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudget } from "@/lib/budget/store";
import { MONTHS, monthLabel, monthShort } from "@/lib/budget/seed";
import { categoryFact, monthTransactions, weeklyExpenses, EXPENSE_KINDS } from "@/lib/budget/calc";
import { dayLabel, percent, shortTenge, tenge } from "@/lib/budget/format";
import { ActionButton, Bar, NumberInput, Panel, TextField } from "@/components/budget/ui";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Расходы по категориям — Баланс" },
      {
        name: "description",
        content: "Лимиты, прогресс по категориям, расходы по неделям и сравнение месяцев.",
      },
      { property: "og:title", content: "Расходы по категориям — Баланс" },
      {
        property: "og:description",
        content: "Сколько потрачено по каждой категории и из каких операций сложилась сумма.",
      },
    ],
  }),
  component: Expenses,
});

function Expenses() {
  const { state, month, setCategoryLimit, renameCategory, addCategory, removeCategory } =
    useBudget();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [compareCategory, setCompareCategory] = useState("food");
  const [newCategory, setNewCategory] = useState("");

  const rows = state.categories.map((c) => ({
    ...c,
    limit: c.limits[month] ?? 0,
    fact: categoryFact(state, c.id, month),
  }));

  const compareData = MONTHS.map((m) => ({
    month: monthShort(m),
    План: state.categories.find((c) => c.id === compareCategory)?.limits[m] ?? 0,
    Факт: categoryFact(state, compareCategory, m),
  }));

  const monthTx = monthTransactions(state, month).filter((t) => EXPENSE_KINDS.includes(t.kind));
  const biggest = [...monthTx].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel
        title={`Категории · ${monthLabel(month)}`}
        aside={`${rows.length} категорий`}
        className="lg:col-span-2"
      >
        <div className="space-y-3">
          {rows.map((row) => {
            const share = percent(row.fact, row.limit);
            const over = row.limit > 0 && row.fact > row.limit;
            const near = !over && share >= 80;
            return (
              <div
                key={row.id}
                className={`rounded-2xl p-3 ${over ? "bg-amber/8 ring-1 ring-amber/40" : near ? "bg-rose/5" : ""}`}
              >
                <button
                  onClick={() => setOpenCategory(openCategory === row.id ? null : row.id)}
                  className="flex w-full items-baseline justify-between gap-2 text-left"
                >
                  <span className="truncate text-sm font-medium">{row.name}</span>
                  <span className="num shrink-0 text-xs text-muted-foreground">
                    {tenge(row.fact)} / {tenge(row.limit)}
                  </span>
                </button>
                <div className="mt-1.5">
                  <Bar
                    value={share}
                    tone={over ? "amber" : near ? "rose" : row.fact === 0 ? "ink" : "teal"}
                  />
                </div>
                {over && (
                  <p className="num mt-1 text-[11px] font-bold text-amber">
                    превышение на {tenge(row.fact - row.limit)}
                  </p>
                )}
                {openCategory === row.id && (
                  <div className="mt-3 border-t border-line pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <TextField
                        value={row.name}
                        onChange={(v) => renameCategory(row.id, v)}
                        className="flex-1"
                      />
                      <NumberInput
                        value={row.limit}
                        onChange={(v) => setCategoryLimit(row.id, month, v)}
                      />
                      <ActionButton variant="ghost" onClick={() => removeCategory(row.id)}>
                        Удалить
                      </ActionButton>
                    </div>
                    <ul className="mt-3 divide-y divide-line">
                      {monthTx
                        .filter((t) => t.categoryId === row.id)
                        .map((t) => (
                          <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="truncate pr-3">{t.description}</span>
                            <span className="num shrink-0 text-xs text-muted-foreground">
                              {dayLabel(t.date)} · {tenge(t.amount)}
                            </span>
                          </li>
                        ))}
                      {monthTx.filter((t) => t.categoryId === row.id).length === 0 && (
                        <li className="py-2 text-xs text-muted-foreground">
                          Операций пока нет — загрузите выписку или добавьте операцию вручную.
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          <TextField
            value={newCategory}
            onChange={setNewCategory}
            placeholder="Новая категория"
            className="flex-1"
          />
          <ActionButton
            onClick={() => {
              if (!newCategory.trim()) return;
              addCategory(newCategory.trim());
              setNewCategory("");
            }}
          >
            Добавить
          </ActionButton>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel title="Расходы по неделям" delay={120}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyExpenses(state, month)}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis
                  tickFormatter={(v) => shortTenge(Number(v))}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={55}
                />
                <Tooltip
                  formatter={(v: number | string) => tenge(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    fontSize: 12,
                  }}
                />
                <RBar dataKey="Расходы" fill="var(--rose)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Сравнение месяцев" delay={180}>
          <select
            value={compareCategory}
            onChange={(e) => setCompareCategory(e.target.value)}
            className="mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis
                  tickFormatter={(v) => shortTenge(Number(v))}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={55}
                />
                <Tooltip
                  formatter={(v: number | string) => tenge(Number(v))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <RBar dataKey="План" fill="var(--line)" radius={[4, 4, 0, 0]} />
                <RBar dataKey="Факт" fill="var(--teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Самые крупные операции" delay={240}>
          <ul className="divide-y divide-line">
            {biggest.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="truncate pr-3">{t.description}</span>
                <span className="num shrink-0 font-bold">{tenge(t.amount)}</span>
              </li>
            ))}
            {biggest.length === 0 && (
              <li className="py-2 text-sm text-muted-foreground">Операций за месяц пока нет.</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
