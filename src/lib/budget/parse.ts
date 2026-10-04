import type { Rule, Transaction, TxKind } from "./types";

export type ParsedRow = Omit<Transaction, "id"> & { id: string };

const MONTHS_RU: Record<string, string> = {
  янв: "01",
  фев: "02",
  мар: "03",
  апр: "04",
  мая: "05",
  май: "05",
  июн: "06",
  июл: "07",
  авг: "08",
  сен: "09",
  окт: "10",
  ноя: "11",
  дек: "12",
};

function hashOf(parts: string) {
  let h = 0;
  for (let i = 0; i < parts.length; i++) {
    h = (h << 5) - h + parts.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

function normDate(raw: string, fallbackYear: number): string | null {
  let m = raw.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{2,4})/);
  if (m) {
    const [, dd = "", mm = "", yy = ""] = m;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm}-${dd}`;
  }
  m = raw.match(/(\d{1,2})\s+([а-яё]{3})[а-яё.]*\s*(\d{4})?/i);
  if (m) {
    const [, dd = "", name = "", yy] = m;
    const mm = MONTHS_RU[name.toLowerCase()];
    if (mm) return `${yy ?? fallbackYear}-${mm}-${dd.padStart(2, "0")}`;
  }
  return null;
}

function detectKind(description: string, isIncome: boolean): TxKind {
  const d = description.toLowerCase();
  if (/снятие|наличн|atm/.test(d)) return "cash";
  if (/перевод на свой|между своими|собственн|пополнение депозита/.test(d)) return "transfer";
  if (/депозит/.test(d)) return "deposit";
  if (/кредит|погашен|рассрочк/.test(d)) return "loan";
  if (/возврат/.test(d)) return "refund";
  return isIncome ? "income" : "expense";
}

export function applyRules(description: string, rules: Rule[]) {
  const d = description.toLowerCase();
  return rules.find((r) => r.match && d.includes(r.match.toLowerCase())) ?? null;
}

/**
 * Разбирает текст выписки (Kaspi Gold, Freedom Super Card, вставленный текст или CSV).
 * Ожидает строки вида: дата ... сумма ... описание.
 */
export function parseStatement(
  text: string,
  opts: { bank: string; card: string; rules: Rule[]; year?: number },
): ParsedRow[] {
  const year = opts.year ?? new Date().getFullYear();
  const rows: ParsedRow[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const cells = line.includes(";") ? line.split(";") : line.includes("\t") ? line.split("\t") : null;
    const source = cells ? cells.join(" ") : line;
    const date = normDate(source, year);
    if (!date) return;

    // ₸ — не буква, поэтому \b после него не срабатывал и суммы не находились.
    const amountMatch = source.match(/([+\-−]?\s?\d[\d\s\u00a0.,]*?)\s*(?:₸|тг\.?|kzt|т\.)(?=\s|$|[^\p{L}\d])/iu);
    if (!amountMatch) return;
    const rawAmount = (amountMatch[1] ?? "").replace(/[\s\u00a0]/g, "").replace(",", ".");
    const isIncome = /^[+]/.test(rawAmount) || /зарплат|алимент|пополнение|поступлен/i.test(source);
    const amount = Math.abs(parseFloat(rawAmount.replace(/[+\-−]/g, "")));
    if (!Number.isFinite(amount) || amount === 0) return;

    const description = source
      .replace(amountMatch[0], " ")
      .replace(/(\d{2})[.\-/](\d{2})[.\-/](\d{2,4})/, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    const rule = applyRules(description, opts.rules);
    const kind = rule?.kind ?? detectKind(description, isIncome);

    rows.push({
      id: `t-${Date.now()}-${index}`,
      date,
      amount,
      description: description || "Операция без описания",
      categoryId: rule?.categoryId ?? null,
      kind,
      bank: opts.bank,
      card: opts.card,
      source: "statement",
      hash: hashOf(`${date}|${amount}|${description}|${opts.bank}`),
    });
  });

  return rows;
}

export function manualTransaction(data: {
  date: string;
  amount: number;
  description: string;
  categoryId: string | null;
  kind: TxKind;
}): Transaction {
  return {
    id: `m-${Date.now()}`,
    ...data,
    bank: "Вручную",
    card: "",
    source: "manual",
    hash: hashOf(`${data.date}|${data.amount}|${data.description}|manual`),
  };
}

/** Извлекает текст из PDF в браузере. */
export async function pdfToText(file: File): Promise<string> {
  const { extractPdfText } = await import("./pdf");
  return extractPdfText(file);
}

/** Превращает операции, найденные ИИ, в строки для проверки. */
export function fromAiRows(
  items: { date: string; amount: number; type: "income" | "expense"; description: string; category: string | null }[],
  opts: { bank: string; card: string; rules: Rule[]; categories: { id: string; name: string }[] },
): ParsedRow[] {
  return items
    .filter((it) => /^\d{4}-\d{2}-\d{2}$/.test(it.date) && Number.isFinite(it.amount) && it.amount !== 0)
    .map((it, index) => {
      const amount = Math.abs(it.amount);
      const description = it.description?.trim() || "Операция без описания";
      const rule = applyRules(description, opts.rules);
      const byName = it.category
        ? opts.categories.find((c) => c.name.toLowerCase() === it.category!.toLowerCase())
        : undefined;
      return {
        id: `t-${Date.now()}-${index}`,
        date: it.date,
        amount,
        description,
        categoryId: rule?.categoryId ?? byName?.id ?? null,
        kind: rule?.kind ?? detectKind(description, it.type === "income"),
        bank: opts.bank,
        card: opts.card,
        source: "statement" as const,
        hash: hashOf(`${it.date}|${amount}|${description}|${opts.bank}`),
      };
    });
}
