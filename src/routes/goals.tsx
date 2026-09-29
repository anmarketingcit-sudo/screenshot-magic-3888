import { createFileRoute } from "@tanstack/react-router";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudget } from "@/lib/budget/store";
import { MONTHS, monthShort } from "@/lib/budget/seed";
import { categoryFact, goalSaved } from "@/lib/budget/calc";
import { percent, shortTenge, tenge } from "@/lib/budget/format";
import { Bar, NumberInput, Panel } from "@/components/budget/ui";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Цели и обязательства — Баланс" },
      {
        name: "description",
        content: "Накопления на квартиру, возврат долга маме и бюджет дня рождения Мирона.",
      },
      { property: "og:title", content: "Цели и обязательства — Баланс" },
      {
        property: "og:description",
        content: "Шкалы прогресса по каждой цели: отложено, цель и остаток.",
      },
    ],
  }),
  component: Goals,
});

function Goals() {
  const { state, updateGoal } = useBudget();

  return (
    <div className="space-y-4">
      <Panel title="Цели и обязательства" aside={`${state.goals.length} цели`}>
        <p className="text-sm text-muted-foreground">
          Перевод денег на собственный накопительный счёт засчитывается как выполнение цели
          «Квартира» и не считается тратой.
        </p>
      </Panel>

      {state.goals.map((goal, i) => {
        const saved = goalSaved(state, goal.id);
        const left = Math.max(0, goal.target - saved);
        const byMonth = MONTHS.map((m) => ({
          month: monthShort(m),
          План: goal.monthlyPlan[m] ?? 0,
          Факт: goal.categoryId ? categoryFact(state, goal.categoryId, m) : 0,
        }));

        return (
          <Panel key={goal.id} title={goal.name} delay={80 + i * 60}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <p className="font-display text-3xl font-extrabold">{tenge(saved)}</p>
                <p className="num text-[11px] text-muted-foreground">
                  из {tenge(goal.target)} · остаток {tenge(left)}
                </p>
                <div className="mt-3">
                  <Bar value={percent(saved, goal.target)} tone="violet" />
                </div>
                <p className="num mt-1.5 text-[11px] text-muted-foreground">
                  {percent(saved, goal.target)}% цели
                </p>
                <div className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                  <label className="flex items-center justify-between gap-2">
                    Цель, ₸
                    <NumberInput
                      value={goal.target}
                      onChange={(v) => updateGoal(goal.id, { target: v })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    Внесено вручную, ₸
                    <NumberInput
                      value={goal.saved}
                      onChange={(v) => updateGoal(goal.id, { saved: v })}
                    />
                  </label>
                </div>
              </div>
              <div className="lg:col-span-2">
                <p className="num mb-2 text-[11px] text-muted-foreground">
                  Выполнение цели по месяцам
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byMonth}>
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
                      <RBar dataKey="План" fill="var(--line)" radius={[4, 4, 0, 0]} />
                      <RBar dataKey="Факт" fill="var(--violet)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
