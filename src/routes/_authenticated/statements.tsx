import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useBudget } from "@/lib/budget/store";
import { manualTransaction, parseStatement, pdfToText, type ParsedRow } from "@/lib/budget/parse";
import type { TxKind } from "@/lib/budget/types";
import { dayLabel, maskCard, tenge } from "@/lib/budget/format";
import { monthTransactions } from "@/lib/budget/calc";
import { ActionButton, Badge, Panel, TextField } from "@/components/budget/ui";

export const Route = createFileRoute("/_authenticated/statements")({
  head: () => ({
    meta: [
      { title: "Загрузка выписок — Баланс" },
      {
        name: "description",
        content: "Импорт выписок Kaspi Gold и Freedom Super Card с проверкой категорий.",
      },
      { property: "og:title", content: "Загрузка выписок — Баланс" },
      {
        property: "og:description",
        content: "Проверьте распознанные операции перед импортом и сохраните правила категорий.",
      },
    ],
  }),
  component: Statements,
});

const KINDS: { value: TxKind; label: string }[] = [
  { value: "expense", label: "Расход" },
  { value: "income", label: "Заработок" },
  { value: "loan", label: "Платёж по кредиту" },
  { value: "transfer", label: "Перевод между своими" },
  { value: "cash", label: "Снятие наличных" },
  { value: "refund", label: "Возврат" },
  { value: "deposit", label: "С депозита" },
];

function Statements() {
  const { state, month, addTransactions, setTransactionCategory, removeTransaction, addRule } =
    useBudget();
  const [bank, setBank] = useState("Kaspi Gold");
  const [card, setCard] = useState("4400 4301 1234 5678");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [controlTotal, setControlTotal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = (source: string) => {
    const parsed = parseStatement(source, { bank, card, rules: state.rules });
    setRows(parsed);
    setStatus(
      parsed.length
        ? `Найдено операций: ${parsed.length}. Проверьте категории перед импортом.`
        : "Не удалось распознать операции. Вставьте текст выписки построчно: дата, сумма в ₸, описание.",
    );
  };

  const onFile = async (file: File) => {
    setStatus("Читаю файл…");
    try {
      const content =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? await pdfToText(file)
          : await file.text();
      setText(content);
      parse(content);
    } catch {
      setStatus("Не удалось прочитать файл. Попробуйте вставить текст выписки вручную.");
    }
  };

  const parsedSum = rows
    .filter((r) => r.kind === "expense" || r.kind === "loan")
    .reduce((s, r) => s + r.amount, 0);
  const control = Number(controlTotal.replace(/\D/g, ""));
  const mismatch = control > 0 && Math.abs(control - parsedSum) > 1;

  const monthTx = monthTransactions(state, month);
  const unsorted = state.transactions.filter((t) => !t.categoryId && t.kind !== "transfer");

  return (
    <div className="space-y-4">
      <Panel title="Загрузка выписки" aside="PDF · текст · CSV">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="num text-[11px] text-muted-foreground">Банк</span>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option>Kaspi Gold</option>
              <option>Freedom Super Card</option>
              <option>Другой банк</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="num text-[11px] text-muted-foreground">
              Карта (на экране маскируется)
            </span>
            <TextField value={card} onChange={setCard} className="mt-1 w-full" />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <ActionButton onClick={() => fileRef.current?.click()}>Выбрать файл</ActionButton>
          <ActionButton variant="ghost" onClick={() => parse(text)}>
            Разобрать текст
          </ActionButton>
          <span className="num text-[11px] text-muted-foreground">
            Карта на экране: {maskCard(card)}
          </span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"01.10.2026  -12 500 ₸  Magnum продукты\n03.10.2026  +956 375 ₸  Зарплата"}
          className="mt-3 h-32 w-full rounded-xl border border-line bg-surface p-3 font-mono text-xs outline-none focus:border-ink"
        />

        {status && <p className="mt-2 text-sm text-muted-foreground">{status}</p>}
      </Panel>

      {rows.length > 0 && (
        <Panel title="Проверка перед импортом" aside={`${rows.length} операций`} delay={80}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="text-sm">
              <span className="num text-[11px] text-muted-foreground">
                Итог расходов по выписке (для сверки)
              </span>
              <TextField
                value={controlTotal}
                onChange={setControlTotal}
                placeholder="например 431000"
                className="ml-2 w-40"
              />
            </label>
            <Badge tone={mismatch ? "amber" : "teal"}>
              распознано {tenge(parsedSum)}
              {mismatch ? ` · расхождение ${tenge(Math.abs(control - parsedSum))}` : ""}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="num border-b border-line text-left text-[11px] text-muted-foreground">
                  <th className="py-2">Дата</th>
                  <th>Описание</th>
                  <th>Тип</th>
                  <th>Категория</th>
                  <th className="text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="border-b border-line">
                    <td className="num py-2 text-xs text-muted-foreground">{dayLabel(row.date)}</td>
                    <td className="max-w-[240px] truncate pr-2">{row.description}</td>
                    <td>
                      <select
                        value={row.kind}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...row, kind: e.target.value as TxKind };
                          setRows(next);
                        }}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
                      >
                        {KINDS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={row.categoryId ?? ""}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...row, categoryId: e.target.value || null };
                          setRows(next);
                          if (e.target.value) {
                            addRule({
                              id: `r-${Date.now()}-${i}`,
                              match: row.description.toLowerCase().slice(0, 18),
                              categoryId: e.target.value,
                              kind: row.kind,
                            });
                          }
                        }}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
                      >
                        <option value="">Не распределено</option>
                        {state.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num py-2 text-right font-bold">{tenge(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <ActionButton
              onClick={() => {
                const added = addTransactions(rows);
                setStatus(
                  `Импортировано ${added} операций, повторов пропущено ${rows.length - added}.`,
                );
                setRows([]);
              }}
            >
              Импортировать
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => setRows([])}>
              Отменить
            </ActionButton>
          </div>
        </Panel>
      )}

      <ManualEntry />

      <Panel title="Не распределено" aside={`${unsorted.length} операций`} delay={160}>
        <ul className="divide-y divide-line">
          {unsorted.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="num text-xs text-muted-foreground">{dayLabel(t.date)}</span>
              <span className="min-w-0 flex-1 truncate">{t.description}</span>
              <select
                value={t.categoryId ?? ""}
                onChange={(e) => setTransactionCategory(t.id, e.target.value || null)}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
              >
                <option value="">Выбрать категорию</option>
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="num font-bold">{tenge(t.amount)}</span>
            </li>
          ))}
          {unsorted.length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">
              Все операции распределены по категориям.
            </li>
          )}
        </ul>
      </Panel>

      <Panel title="Операции месяца" aside={`${monthTx.length} операций`} delay={220}>
        <ul className="divide-y divide-line">
          {monthTx.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="num w-24 shrink-0 text-xs text-muted-foreground">
                {dayLabel(t.date)}
              </span>
              <span className="min-w-0 flex-1 truncate">{t.description}</span>
              <span className="num hidden text-[11px] text-muted-foreground sm:block">
                {t.bank} · {maskCard(t.card)}
              </span>
              <Badge tone={t.source === "manual" ? "violet" : "teal"}>
                {t.source === "manual" ? "вручную" : "факт"}
              </Badge>
              <span className="num font-bold">{tenge(t.amount)}</span>
              <button
                onClick={() => removeTransaction(t.id)}
                className="text-xs text-muted-foreground underline"
              >
                удалить
              </button>
            </li>
          ))}
          {monthTx.length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">
              За этот месяц операций ещё нет.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

function ManualEntry() {
  const { state, month, addTransactions } = useBudget();
  const [date, setDate] = useState(`${month}-01`);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kind, setKind] = useState<TxKind>("expense");

  return (
    <Panel title="Добавить операцию вручную" aside="наличные и корректировки" delay={120}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <TextField value={date} onChange={setDate} type="date" />
        <TextField value={amount} onChange={setAmount} placeholder="Сумма, ₸" />
        <TextField value={description} onChange={setDescription} placeholder="Описание" />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">Не распределено</option>
          {state.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TxKind)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3">
        <ActionButton
          onClick={() => {
            const value = Number(amount.replace(/\s/g, "").replace(",", "."));
            if (!value || !date) return;
            addTransactions([
              manualTransaction({
                date,
                amount: Math.abs(value),
                description: description || "Операция вручную",
                categoryId: categoryId || null,
                kind,
              }),
            ]);
            setAmount("");
            setDescription("");
          }}
        >
          Добавить
        </ActionButton>
      </div>
    </Panel>
  );
}
