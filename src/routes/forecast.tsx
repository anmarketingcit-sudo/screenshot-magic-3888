import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  Bar as RBar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudget } from "@/lib/budget/store";
import { MONTHS, monthShort } from "@/lib/budget/seed";
import { plannedIncome } from "@/lib/budget/calc";
import { shortTenge, tenge } from "@/lib/budget/format";
import { ActionButton, Panel } from "@/components/budget/ui";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "Прогноз и сценарии — Баланс" },
      {
        name: "description",
        content: "Помесячный прогноз дохода, расходов, кредитов и накоплений со сценариями.",
      },
      { property: "og:title", content: "Прогноз и сценарии — Баланс" },
      {
        property: "og:description",
        content: "Что будет, если изменить доход, лимит на питание или платёж по кредиту.",
      },
    ],
  }),
  component: Forecast,
});

type Scenario = {
  incomeDelta: number;
  foodLimit: number | null;
  funLimit: number | null;
  savings: number | null;
  creditDelta: number;
};

const EMPTY: Scenario = {
  incomeDelta: 0,
  foodLimit: null,
  funLimit: null,
  savings: null,
  creditDelta: 0,
};

function Forecast() {
  const { state } = useBudget();
  const [sc, setSc] = useState<Scenario>(EMPTY);

  const baseIncome = plannedIncome(state);
  const income = baseIncome + sc.incomeDelta;

  const data = MONTHS.map((m) => {
    const credits = state.credits.reduce(
      (s, c) => s + Math.max(0, (c.schedule[m] ?? 0) + sc.creditDelta),
      0,
    );
    const savings =
      sc.savings ?? (state.categories.find((c) => c.id === "flat")?.limits[m] ?? 0);
    const other = state.categories
      .filter((c) => !["credit1", "credit2", "flat"].includes(c.id))
      .reduce((s, c) => {
        if (c.id === "food" && sc.foodLimit !== null) return s + sc.foodLimit;
        if (c.id === "fun" && sc.funLimit !== null) return s + sc.funLimit;
        return s + (c.limits[m] ?? 0);
      }, 0);
    const total = credits + savings + other;
    return {
      month: monthShort(m),
      Доход: income,
      Расходы: other,
      Кредиты: credits,
      Накопления: savings,
      Итог: income - total,
    };
  });

  const needExtra = Math.max(0, -Math.min(...data.map((d) => d.Итог)));
  const firstNeed = Math.max(0, -(data[0]?.Итог ?? 0));

  return (
    <div className="space-y-4">
      <Panel title="Прогноз по месяцам" aside="регулярный доход и план">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
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
              <RBar dataKey="Расходы" stackId="p" fill="var(--rose)" />
              <RBar dataKey="Кредиты" stackId="p" fill="var(--amber)" />
              <RBar dataKey="Накопления" stackId="p" fill="var(--violet)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Доход" stroke="var(--teal)" strokeWidth={2} dot={false} />
              <Area
                type="monotone"
                dataKey="Итог"
                stroke="var(--ink)"
                fill="var(--line)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-6 border-t border-line pt-4">
          <div>
            <p className="num text-[11px] text-muted-foreground">Дополнительный доход в октябре</p>
            <p className="num text-lg font-bold text-amber">{tenge(firstNeed)}</p>
          </div>
          <div>
            <p className="num text-[11px] text-muted-foreground">Максимальный дефицит месяца</p>
            <p className="num text-lg font-bold">{tenge(needExtra)}</p>
          </div>
          <div>
            <p className="num text-[11px] text-muted-foreground">Регулярный доход</p>
            <p className="num text-lg font-bold text-teal">{tenge(income)}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Что будет, если…" aside="сценарий не меняет основной план" delay={120}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Slider
            label="Доход +/−"
            value={sc.incomeDelta}
            min={-300000}
            max={600000}
            step={10000}
            onChange={(v) => setSc({ ...sc, incomeDelta: v })}
          />
          <Slider
            label="Питание, лимит"
            value={sc.foodLimit ?? 180000}
            min={80000}
            max={300000}
            step={5000}
            onChange={(v) => setSc({ ...sc, foodLimit: v })}
          />
          <Slider
            label="Развлечения, лимит"
            value={sc.funLimit ?? 50000}
            min={0}
            max={150000}
            step={5000}
            onChange={(v) => setSc({ ...sc, funLimit: v })}
          />
          <Slider
            label="Накопления в месяц"
            value={sc.savings ?? 100000}
            min={0}
            max={300000}
            step={10000}
            onChange={(v) => setSc({ ...sc, savings: v })}
          />
          <Slider
            label="Платёж по кредиту +/−"
            value={sc.creditDelta}
            min={-100000}
            max={100000}
            step={5000}
            onChange={(v) => setSc({ ...sc, creditDelta: v })}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <ActionButton variant="ghost" onClick={() => setSc(EMPTY)}>
            Сбросить сценарий
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="num text-[11px] text-muted-foreground">{label}</span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--ink)]"
      />
      <span className="num text-sm font-bold">{tenge(value)}</span>
    </label>
  );
}
