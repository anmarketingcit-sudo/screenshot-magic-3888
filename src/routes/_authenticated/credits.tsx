import { createFileRoute } from "@tanstack/react-router";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudget } from "@/lib/budget/store";
import { MONTHS, monthLabel, monthShort } from "@/lib/budget/seed";
import { categoryFact, creditPaid, creditTotalPlanned } from "@/lib/budget/calc";
import { percent, shortTenge, tenge } from "@/lib/budget/format";
import { Badge, Bar, NumberInput, Panel } from "@/components/budget/ui";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({
    meta: [
      { title: "Кредиты и график погашения — Баланс" },
      {
        name: "description",
        content: "Прогресс по каждому кредиту, ближайшие платежи и дата закрытия.",
      },
      { property: "og:title", content: "Кредиты и график погашения — Баланс" },
      {
        property: "og:description",
        content: "Сколько осталось платить по кредитам и сколько денег освободится после закрытия.",
      },
    ],
  }),
  component: Credits,
});

function Credits() {
  const { state, month, setCreditPayment, updateCredit } = useBudget();

  const totalThisMonth = state.credits.reduce((s, c) => s + (c.schedule[month] ?? 0), 0);

  return (
    <div className="space-y-4">
      <Panel title={`Платежи в ${monthLabel(month).toLowerCase()}`} aside="общий экран">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="num text-[11px] text-muted-foreground">Всего по кредитам</p>
            <p className="font-display text-3xl font-extrabold">{tenge(totalThisMonth)}</p>
          </div>
          {state.credits.map((c) => {
            const last = MONTHS.filter((m) => (c.schedule[m] ?? 0) > 0).pop();
            return (
              <div key={c.id}>
                <p className="num text-[11px] text-muted-foreground">
                  освободится после закрытия «{c.name}»
                </p>
                <p className="num text-lg font-bold text-teal">
                  {tenge(Math.max(...MONTHS.map((m) => c.schedule[m] ?? 0)))} в месяц
                </p>
                <p className="num text-[11px] text-muted-foreground">
                  последний платёж: {last ? monthLabel(last) : "—"}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-2xl bg-amber/8 p-3 text-sm ring-1 ring-amber/40">
          Пока не внесён остаток основного долга, прогресс считается{" "}
          <b>по запланированным платежам</b>, а не по остатку долга.
        </div>
      </Panel>

      {state.credits.map((credit, i) => {
        const planned = creditTotalPlanned(state, credit.id);
        const paid = creditPaid(state, credit.id);
        const schedule = MONTHS.map((m) => ({
          month: monthShort(m),
          Платёж: credit.schedule[m] ?? 0,
        }));
        let rest = credit.principalKnown && credit.principal ? credit.principal : planned;
        const decline = MONTHS.map((m) => {
          rest -= credit.schedule[m] ?? 0;
          return { month: monthShort(m), Остаток: Math.max(0, rest) };
        });
        const closing = MONTHS.filter((m) => (credit.schedule[m] ?? 0) > 0).pop();

        return (
          <Panel key={credit.id} title={credit.name} delay={100 + i * 60}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={credit.principalKnown ? "teal" : "amber"}>
                    {credit.principalKnown ? "остаток долга указан" : "нужен остаток долга"}
                  </Badge>
                </div>
                <p className="num mt-3 text-[11px] text-muted-foreground">
                  Запланировано платежей
                </p>
                <p className="font-display text-2xl font-extrabold">{tenge(planned)}</p>
                <p className="num mt-2 text-[11px] text-muted-foreground">Оплачено фактом</p>
                <p className="num text-lg font-bold text-teal">{tenge(paid)}</p>
                <div className="mt-3">
                  <Bar value={percent(paid, planned)} tone="teal" />
                </div>
                <p className="num mt-1.5 text-[11px] text-muted-foreground">
                  {percent(paid, planned)}% от плана платежей
                </p>
                <div className="mt-4 space-y-2 border-t border-line pt-3">
                  <label className="flex items-center justify-between gap-2 text-sm">
                    Остаток основного долга
                    <NumberInput
                      value={credit.principal ?? 0}
                      onChange={(v) =>
                        updateCredit(credit.id, { principal: v, principalKnown: v > 0 })
                      }
                    />
                  </label>
                  <p className="num text-[11px] text-muted-foreground">
                    Ближайший платёж: {tenge(credit.schedule[month] ?? 0)} ·{" "}
                    {monthLabel(month)}
                  </p>
                  <p className="num text-[11px] text-muted-foreground">
                    Прогноз закрытия: {closing ? monthLabel(closing) : "—"}
                  </p>
                  <p className="num text-[11px] text-muted-foreground">
                    Оплачено в этом месяце: {tenge(categoryFact(state, credit.categoryId, month))}
                  </p>
                </div>
              </div>

              <div>
                <p className="num mb-2 text-[11px] text-muted-foreground">График будущих платежей</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schedule}>
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
                      <RBar dataKey="Платёж" fill="var(--amber)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <p className="num mb-2 text-[11px] text-muted-foreground">
                  Снижение остатка по месяцам
                </p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={decline}>
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
                      <Line
                        type="monotone"
                        dataKey="Остаток"
                        stroke="var(--ink)"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto border-t border-line pt-4">
              <div className="flex gap-3">
                {MONTHS.map((m) => (
                  <label key={m} className="shrink-0">
                    <span className="num block text-[11px] text-muted-foreground">
                      {monthShort(m)}
                    </span>
                    <NumberInput
                      value={credit.schedule[m] ?? 0}
                      onChange={(v) => setCreditPayment(credit.id, m, v)}
                      className="w-28"
                    />
                  </label>
                ))}
              </div>
              <p className="num mt-2 text-[11px] text-muted-foreground">
                Июньский платёж принят как 7 000 ₸ и требует подтверждения.
              </p>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
