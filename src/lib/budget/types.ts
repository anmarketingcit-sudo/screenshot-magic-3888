export type MonthKey = string; // "2026-10"

export type TxKind =
  | "income" // заработок
  | "expense" // трата
  | "transfer" // между своими счетами
  | "cash" // снятие наличных
  | "loan" // платёж по кредиту
  | "refund" // возврат
  | "deposit"; // поступление с собственного депозита

export type Category = {
  id: string;
  name: string;
  limits: Record<MonthKey, number>;
};

export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // всегда положительное значение
  description: string;
  categoryId: string | null;
  kind: TxKind;
  bank: string;
  card: string;
  source: "statement" | "manual";
  hash: string;
};

export type Rule = {
  id: string;
  match: string; // подстрока в описании, в нижнем регистре
  categoryId: string | null;
  kind: TxKind;
};

export type IncomeSource = {
  id: string;
  name: string;
  amount: number;
  regular: boolean;
};

export type Credit = {
  id: string;
  name: string;
  categoryId: string;
  principalKnown: boolean; // известен ли остаток основного долга
  principal: number | null;
  schedule: Record<MonthKey, number>;
};

export type Goal = {
  id: string;
  name: string;
  categoryId: string | null;
  target: number; // общая цель
  monthlyPlan: Record<MonthKey, number>;
  saved: number; // внесено вручную
};

export type BudgetState = {
  categories: Category[];
  transactions: Transaction[];
  rules: Rule[];
  incomes: IncomeSource[];
  credits: Credit[];
  goals: Goal[];
};
