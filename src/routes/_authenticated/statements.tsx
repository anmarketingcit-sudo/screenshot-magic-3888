import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { useBudget } from "@/lib/budget/store";
import { fromAiRows, manualTransaction, parseStatement, pdfToText, type ParsedRow } from "@/lib/budget/parse";
import { extractWithAi } from "@/lib/budget/ai-extract.functions";
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

const MAX_MB = 10;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Не удалось прочитать файл"));
    r.readAsDataURL(file);
  });
}

function Statements() {
  const { state, month, addTransactions, setTransactionCategory, removeTransaction, addRule, syncError } =
    useBudget();
  const aiExtract = useServerFn(extractWithAi);
  const [bank, setBank] = useState("Kaspi Gold");
  const [card, setCard] = useState("4400 4301 1234 5678");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ tone: "info" | "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [controlTotal, setControlTotal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const showRows = (parsed: ParsedRow[], how: string) => {
    setRows(parsed);
    setSkip(new Set());
    setStatus({ tone: "ok", text: `${how}: найдено операций — ${parsed.length}. Проверьте и нажмите «Сохранить».` });
  };

  const parse = (source: string) => {
    const parsed = parseStatement(source, { bank, card, rules: state.rules });
    if (parsed.length) showRows(parsed, "Текст разобран");
    else
      setStatus({
        tone: "error",
        text: "В тексте не найдено операций. Нужны строки вида: дата, сумма в ₸, описание.",
      });
  };

  const runAi = async (file: File, mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp") => {
    setStatus({ tone: "info", text: "Текст не найден — распознаю файл с помощью ИИ, это займёт до минуты…" });
    const base64 = await toBase64(file);
    const res = await aiExtract({
      data: { fileName: file.name, mimeType, base64, categories: state.categories.map((c) => c.name) },
    });
    if (res.error) throw new Error(res.error);
    const parsed = fromAiRows(res.items, { bank, card, rules: state.rules, categories: state.categories });
    if (!parsed.length) throw new Error("В файле не удалось найти ни одной операции.");
    showRows(parsed, "Распознано ИИ");
  };

  const onFile = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setStatus({ tone: "error", text: `Файл больше ${MAX_MB} МБ. Загрузите файл поменьше.` });
      return;
    }
    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const image = (["image/jpeg", "image/png", "image/webp"] as const).find((t) => t === file.type);
    setBusy(true);
    setRows([]);
    try {
      if (isPdf) {
        setStatus({ tone: "info", text: "Читаю PDF…" });
        let content = "";
        try {
          content = await pdfToText(file);
        } catch (e) {
          console.error("PDF text extraction failed", e);
          const msg = e instanceof Error ? e.message : "";
          if (/password/i.test(msg)) throw new Error("PDF защищён паролем. Снимите защиту и загрузите снова.");
        }
        setText(content);
        const parsed = content.trim()
          ? parseStatement(content, { bank, card, rules: state.rules })
          : [];
        if (parsed.length) showRows(parsed, "PDF прочитан");
        else await runAi(file, "application/pdf");
      } else if (image) {
        await runAi(file, image);
      } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
        const content = await file.text();
        setText(content);
        parse(content);
      } else {
        throw new Error("Этот формат не поддерживается. Загрузите PDF, фото (JPG, PNG), CSV или TXT.");
      }
    } catch (e) {
      console.error(e);
      setStatus({ tone: "error", text: e instanceof Error ? e.message : "Не удалось обработать файл." });
    } finally {
      setBusy(false);
    }
  };

  const selected = rows.filter((r) => !skip.has(r.id));
  const parsedSum = selected
    .filter((r) => r.kind === "expense" || r.kind === "loan")
    .reduce((s, r) => s + r.amount, 0);
  const control = Number(controlTotal.replace(/\D/g, ""));
  const mismatch = control > 0 && Math.abs(control - parsedSum) > 1;

  const monthTx = monthTransactions(state, month);
  const unsorted = state.transactions.filter((t) => !t.categoryId && t.kind !== "transfer");
  const patch = (i: number, p: Partial<ParsedRow>) => {
    const next = [...rows];
    next[i] = { ...rows[i]!, ...p };
    setRows(next);
  };

  return (
    <div className="space-y-4">
      <Panel title="Загрузка выписки или чека" aside="PDF · фото · CSV">
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

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.csv,.txt,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void onFile(f);
          }}
          className={`mt-3 grid w-full place-items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            drag ? "border-ink bg-muted" : "border-line bg-surface"
          } ${busy ? "opacity-60" : ""}`}
        >
          <span className="font-display text-sm font-bold">
            {busy ? "Обрабатываю файл…" : "Перетащите файл сюда или нажмите, чтобы выбрать"}
          </span>
          <span className="num mt-1 text-[11px] text-muted-foreground">
            Выписка или чек: PDF, фото JPG/PNG, CSV · до {MAX_MB} МБ · карта: {maskCard(card)}
          </span>
        </button>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">Или вставьте текст выписки</summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"01.10.2026  -12 500 ₸  Magnum продукты\n03.10.2026  +956 375 ₸  Зарплата"}
            className="mt-2 h-32 w-full rounded-xl border border-line bg-surface p-3 font-mono text-xs outline-none focus:border-ink"
          />
          <ActionButton variant="ghost" onClick={() => parse(text)}>
            Разобрать текст
          </ActionButton>
        </details>

        {status && (
          <p
            role={status.tone === "error" ? "alert" : "status"}
            className={`mt-3 rounded-xl px-3 py-2 text-sm ${
              status.tone === "error"
                ? "bg-rose/10 text-rose"
                : status.tone === "ok"
                  ? "bg-teal/10 text-teal"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {status.text}
          </p>
        )}
        {syncError && (
          <p className="mt-2 rounded-xl bg-rose/10 px-3 py-2 text-sm text-rose">
            Не удалось сохранить в базу: {syncError}
          </p>
        )}
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
                  <th className="py-2 pr-2">
                    <input
                      type="checkbox"
                      aria-label="Выбрать все"
                      checked={skip.size === 0}
                      onChange={(e) => setSkip(e.target.checked ? new Set() : new Set(rows.map((r) => r.id)))}
                    />
                  </th>
                  <th>Дата</th>
                  <th>Описание</th>
                  <th>Тип</th>
                  <th>Категория</th>
                  <th className="text-right">Сумма, ₸</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-line ${skip.has(row.id) ? "opacity-40" : ""}`}>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        aria-label="Сохранить операцию"
                        checked={!skip.has(row.id)}
                        onChange={(e) => {
                          const next = new Set(skip);
                          if (e.target.checked) next.delete(row.id);
                          else next.add(row.id);
                          setSkip(next);
                        }}
                      />
                    </td>
                    <td className="pr-1">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => patch(i, { date: e.target.value })}
                        className="rounded-lg border border-line bg-surface px-1.5 py-1 text-xs"
                      />
                    </td>
                    <td className="pr-1">
                      <input
                        value={row.description}
                        onChange={(e) => patch(i, { description: e.target.value })}
                        className="w-48 rounded-lg border border-line bg-surface px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="pr-1">
                      <select
                        value={row.kind}
                        onChange={(e) => patch(i, { kind: e.target.value as TxKind })}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
                      >
                        {KINDS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="pr-1">
                      <select
                        value={row.categoryId ?? ""}
                        onChange={(e) => patch(i, { categoryId: e.target.value || null })}
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
                    <td className="text-right">
                      <input
                        type="number"
                        min={0}
                        value={row.amount}
                        onChange={(e) => patch(i, { amount: Math.abs(Number(e.target.value)) })}
                        className="num w-28 rounded-lg border border-line bg-surface px-2 py-1 text-right text-xs font-bold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton
              onClick={() => {
                if (!selected.length) {
                  setStatus({ tone: "error", text: "Отметьте хотя бы одну операцию для сохранения." });
                  return;
                }
                const known = new Set(state.transactions.map((t) => t.hash));
                const fresh = selected.filter((r) => !known.has(r.hash));
                addTransactions(selected);
                // Запоминаем выбранные категории как правила для будущих выписок.
                selected.forEach((r, i) => {
                  if (r.categoryId && !state.rules.some((x) => r.description.toLowerCase().includes(x.match))) {
                    addRule({
                      id: `r-${Date.now()}-${i}`,
                      match: r.description.toLowerCase().slice(0, 18),
                      categoryId: r.categoryId,
                      kind: r.kind,
                    });
                  }
                });
                setStatus({
                  tone: "ok",
                  text: `Сохранено операций: ${fresh.length}${
                    selected.length - fresh.length ? `, повторов пропущено: ${selected.length - fresh.length}` : ""
                  }.`,
                });
                setRows([]);
              }}
            >
              Сохранить ({selected.length})
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
