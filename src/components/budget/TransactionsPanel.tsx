import { useState } from "react";
import { useBudget } from "@/lib/budget/store";
import { MONTHS, monthLabel } from "@/lib/budget/seed";
import { maskCard, tenge } from "@/lib/budget/format";
import { Panel } from "@/components/budget/ui";
import type { Transaction, TxKind } from "@/lib/budget/types";

const KINDS: { v: TxKind; l: string }[] = [
  { v: "income", l: "Доход" },
  { v: "expense", l: "Расход" },
  { v: "loan", l: "Кредит" },
  { v: "transfer", l: "Перевод" },
  { v: "cash", l: "Наличные" },
  { v: "refund", l: "Возврат" },
  { v: "deposit", l: "С депозита" },
];

const input = "rounded-lg border border-line bg-surface px-2 py-1 text-xs outline-none focus:border-primary";

export function TransactionsPanel() {
  const { state, month, update, removeTransaction } = useBudget();
  const [filter, setFilter] = useState<string>(month);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Transaction | null>(null);

  const list = state.transactions
    .filter((t) => filter === "all" || t.date.startsWith(filter))
    .sort((a, b) => b.date.localeCompare(a.date));
  const catName = (id: string | null) => state.categories.find((c) => c.id === id)?.name ?? "Не распределено";

  function save() {
    if (!draft) return;
    update((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === draft.id ? draft : t)) }));
    setEditId(null);
  }

  return (
    <Panel
      title="Все операции"
      aside={
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={input}>
          <option value="all">Все месяцы</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      }
    >
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Операций за этот период пока нет.</p>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((t) =>
            editId === t.id && draft ? (
              <li key={t.id} className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-6">
                <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={input} />
                <input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Math.abs(Number(e.target.value)) })} className={input} />
                <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as TxKind })} className={input}>
                  {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
                </select>
                <select value={draft.categoryId ?? ""} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value || null })} className={input}>
                  <option value="">Не распределено</option>
                  {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={`${input} col-span-2 sm:col-span-1`} />
                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <button onClick={save} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Сохранить</button>
                  <button onClick={() => setEditId(null)} className="rounded-full border border-line px-3 py-1 text-xs">Отмена</button>
                </div>
              </li>
            ) : (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.description || "Без описания"}</p>
                  <p className="num text-[11px] text-muted-foreground">
                    {t.date} · {KINDS.find((k) => k.v === t.kind)?.l} · {catName(t.categoryId)}
                    {t.card ? ` · ${maskCard(t.card)}` : ""}
                  </p>
                </div>
                <p className={`num text-sm font-bold ${t.kind === "income" ? "text-teal" : ""}`}>
                  {t.kind === "income" ? "+" : "−"}{tenge(t.amount)}
                </p>
                <button onClick={() => { setEditId(t.id); setDraft(t); }} className="text-xs text-muted-foreground underline">Изменить</button>
                <button
                  onClick={() => { if (confirm("Удалить операцию?")) removeTransaction(t.id); }}
                  className="text-xs text-rose underline"
                >
                  Удалить
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </Panel>
  );
}
