import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudget } from "@/lib/budget/store";
import { monthLabel } from "@/lib/budget/seed";
import { categoryFact, dailyFlow, monthSummary } from "@/lib/budget/calc";
import { percent, shortTenge, tenge } from "@/lib/budget/format";
import { Badge, Bar, Panel, SourceTag } from "@/components/budget/ui";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Дашборд бюджета — Баланс" },
      {
        name: "description",
        content:
          "Поступления, расходы, свободный остаток и сколько ещё нужно заработать в этом месяце.",
      },
      { property: "og:title", content: "Дашборд бюджета — Баланс" },
      {
        property: "og:description",
        content: "Главный экран личного бюджета в тенге: факт, план и прогноз месяца.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, month } = useBudget();
  const s = monthSummary(state, month);
  const flow = dailyFlow(state, month);

  const planFact = state.categories
    .filter((c) => (c.limits[month] ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      План: c.limits[month] ?? 0,
      Факт: categoryFact(state, c.id, month),
    }))
    .sort((a, b) => b.План - a.План);

  const upcoming = state.categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      left: (c.limits[month] ?? 0) - categoryFact(state, c.id, month),
    }))
    .filter((c) => c.left > 0)
    .sort((a, b) => b.left - a.left)
    .slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-extrabold tracking-tight">Свободный остаток</h1>
          <Badge tone={s.free >= 0 ? "teal" : "rose"}>
            {s.free >= 0 ? "в плюсе" : "дефицит"}
          </Badge>
        </div>
        <p className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {new Intl.NumberFormat("ru-RU").format(Math.round(s.free))}{" "}
          <span className="text-2xl text-muted-foreground">₸</span>
        </p>
        <div className="mt-4">
          <Bar value={percent(s.expense, s.planExpense)} tone="ink" height="h-3" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex flex-col">
            <span className="num text-[11px] text-muted-foreground">Ещё нужно заработать</span>
            <span className="num text-sm font-bold text-amber">{tenge(s.needToEarn)}</span>
          </div>
          <div className="flex flex-col">
            <span className="num text-[11px] text-muted-foreground">Расходы к плану</span>
            <span className="num text-sm font-bold">{percent(s.expense, s.planExpense)}%</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="num text-[11px] text-muted-foreground">Прогноз до конца месяца</span>
            <span className="num text-sm font-bold">{tenge(s.forecastExpense)}</span>
          </div>
        </div>
      </Panel>

      <section
        className="rounded-3xl bg-ink p-5 text-background"
        style={{ animation: "rise 500ms var(--ease-soft) both 80ms" }}
      >
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          {monthLabel(month)}
        </h2>
        <div className="mt-4 space-y-3">
          <DarkRow
            label="Поступления"
            value={tenge(s.income)}
            hint={`план ${tenge(s.planIncome)}`}
            ratio={percent(s.income, s.planIncome)}
            tone="bg-teal"
          />
          <DarkRow
            label="Расходы"
            value={tenge(s.expense)}
            hint={`лимит ${tenge(s.planExpense)}`}
            ratio={percent(s.expense, s.planExpense)}
            tone="bg-rose"
          />
          <DarkRow
            label="Накопления на квартиру"
            value={tenge(categoryFact(state, "flat", month))}
            hint={`цель ${tenge(state.categories.find((c) => c.id === "flat")?.limits[month] ?? 0)}`}
            ratio={percent(
              categoryFact(state, "flat", month),
              state.categories.find((c) => c.id === "flat")?.limits[month] ?? 0,
            )}
            tone="bg-violet"
          />
        </div>
      </section>

      <Panel
        title="Движение денег"
        aside="по дням, ₸"
        className="lg:col-span-3"
        delay={140}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={flow}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis
                tickFormatter={(v) => shortTenge(Number(v))}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                width={60}
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
              <RBar dataKey="Поступления" fill="var(--teal)" radius={[4, 4, 0, 0]} />
              <RBar dataKey="Расходы" fill="var(--rose)" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="Остаток"
                stroke="var(--ink)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <SourceTag source="факт" /> из выписки
          <SourceTag source="вручную" /> внесено руками
          <SourceTag source="прогноз" /> расчёт до конца месяца
        </div>
      </Panel>

      <Panel
        title="План и факт по категориям"
        aside={`${planFact.length} категорий`}
        className="lg:col-span-2"
        delay={200}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={planFact.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke="var(--line)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => shortTenge(Number(v))}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
              <RBar dataKey="План" fill="var(--line)" radius={[0, 4, 4, 0]} />
              <RBar dataKey="Факт" radius={[0, 4, 4, 0]}>
                {planFact.slice(0, 8).map((row) => (
                  <Cell
                    key={row.id}
                    fill={row.Факт > row.План ? "var(--amber)" : "var(--rose)"}
                  />
                ))}
              </RBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Link to="/expenses" className="num mt-3 inline-block text-xs text-muted-foreground underline">
          Все категории и операции →
        </Link>
      </Panel>

      <Panel title="Кредиты" aside={`${state.credits.length} активных`} delay={260}>
        {state.credits.map((credit) => {
          const payment = credit.schedule[month] ?? 0;
          const paid = categoryFact(state, credit.categoryId, month);
          return (
            <div key={credit.id} className="mb-3 rounded-2xl border border-line p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{credit.name}</span>
                <span className="num text-[11px] text-muted-foreground">платёж месяца</span>
              </div>
              <p className="num mt-1 text-2xl font-bold">
                {new Intl.NumberFormat("ru-RU").format(payment)}{" "}
                <span className="text-sm text-muted-foreground">₸</span>
              </p>
              <div className="mt-3">
                <Bar value={percent(paid, payment)} tone={paid >= payment ? "teal" : "amber"} height="h-2" />
              </div>
              <p className="num mt-2 text-[11px] text-muted-foreground">
                оплачено в этом месяце {tenge(paid)}
              </p>
            </div>
          );
        })}
        <Link to="/credits" className="num text-xs text-muted-foreground underline">
          Подробный дашборд кредитов →
        </Link>
      </Panel>

      <Panel title="Цели-накопления" className="lg:col-span-2" delay={320}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {state.goals.map((goal) => {
            const saved = goal.categoryId
              ? state.transactions
                  .filter((t) => t.categoryId === goal.categoryId)
                  .reduce((sum, t) => sum + t.amount, 0) + goal.saved
              : goal.saved;
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span className="num text-xs text-muted-foreground">
                    {shortTenge(saved)} / {shortTenge(goal.target)}
                  </span>
                </div>
                <div className="mt-2">
                  <Bar value={percent(saved, goal.target)} tone="violet" />
                </div>
                <p className="num mt-1.5 text-[11px] text-muted-foreground">
                  {percent(saved, goal.target)}%
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Ближайшие платежи" delay={380}>
        <ul className="divide-y divide-line">
          {upcoming.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-rose/10 font-display text-xs font-bold text-rose">
                {item.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="num text-[11px] text-muted-foreground">осталось оплатить</p>
              </div>
              <span className="num text-sm font-bold">{tenge(item.left)}</span>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Все плановые платежи закрыты.</li>
          )}
        </ul>
        <Link
          to="/statements"
          className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-background p-3"
        >
          <span className="text-sm font-medium">Не распределено</span>
          <span className="num text-sm font-bold text-teal">
            {tenge(s.unsorted)} · {s.unsortedCount} шт
          </span>
        </Link>
      </Panel>
    </div>
  );
}

function DarkRow({
  label,
  value,
  hint,
  ratio,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  ratio: number;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-background/70">{label}</span>
        <span className="num font-bold">{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-background/15">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }}
        />
      </div>
      <p className="num mt-1 text-[10px] text-background/50">{hint}</p>
    </div>
  );
}
