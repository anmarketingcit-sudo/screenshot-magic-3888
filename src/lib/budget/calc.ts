import type { BudgetState, MonthKey, Transaction } from "./types";

export const EXPENSE_KINDS: Transaction["kind"][] = ["expense", "loan"];

export function inMonth(tx: Transaction, month: MonthKey) {
  return tx.date.startsWith(month);
}

export function monthTransactions(state: BudgetState, month: MonthKey) {
  return state.transactions.filter((t) => inMonth(t, month));
}

/** Переводы между своими счетами, снятие наличных и депозит не считаются расходом/заработком. */
export function factExpense(state: BudgetState, month: MonthKey) {
  return monthTransactions(state, month)
    .filter((t) => EXPENSE_KINDS.includes(t.kind))
    .reduce((sum, t) => sum + t.amount, 0);
}

export function factIncome(state: BudgetState, month: MonthKey) {
  return monthTransactions(state, month)
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function plannedIncome(state: BudgetState) {
  return state.incomes.filter((i) => i.regular).reduce((s, i) => s + i.amount, 0);
}

export function plannedExpense(state: BudgetState, month: MonthKey) {
  return state.categories.reduce((s, c) => s + (c.limits[month] ?? 0), 0);
}

export function categoryFact(state: BudgetState, categoryId: string, month: MonthKey) {
  return monthTransactions(state, month)
    .filter((t) => t.categoryId === categoryId && EXPENSE_KINDS.includes(t.kind))
    .reduce((s, t) => s + t.amount, 0);
}

export function unsortedTotal(state: BudgetState, month: MonthKey) {
  return monthTransactions(state, month)
    .filter((t) => !t.categoryId && t.kind !== "income" && t.kind !== "transfer")
    .reduce((s, t) => s + t.amount, 0);
}

export function unsortedCount(state: BudgetState, month: MonthKey) {
  return monthTransactions(state, month).filter((t) => !t.categoryId && t.kind !== "income").length;
}

/** Обязательные платежи, которые ещё не отражены фактом — основа прогноза до конца месяца. */
export function remainingObligations(state: BudgetState, month: MonthKey) {
  return state.categories.reduce((sum, c) => {
    const limit = c.limits[month] ?? 0;
    const fact = categoryFact(state, c.id, month);
    return sum + Math.max(0, limit - fact);
  }, 0);
}

export function monthSummary(state: BudgetState, month: MonthKey) {
  const income = factIncome(state, month);
  const expense = factExpense(state, month);
  const planIncome = plannedIncome(state);
  const planExpense = plannedExpense(state, month);
  const forecastExpense = expense + remainingObligations(state, month);
  return {
    income,
    expense,
    planIncome,
    planExpense,
    free: income - expense,
    /** Сколько ещё нужно заработать, чтобы закрыть план месяца. */
    needToEarn: Math.max(0, planExpense - planIncome),
    forecastExpense,
    forecastBalance: Math.max(income, planIncome) - forecastExpense,
    unsorted: unsortedTotal(state, month),
    unsortedCount: unsortedCount(state, month),
  };
}

export function dailyFlow(state: BudgetState, month: MonthKey) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  let balance = 0;
  const rows = [];
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const dayTx = state.transactions.filter((t) => t.date === date);
    const inc = dayTx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
    const exp = dayTx
      .filter((t) => EXPENSE_KINDS.includes(t.kind))
      .reduce((s, t) => s + t.amount, 0);
    balance += inc - exp;
    rows.push({ day: String(d), Поступления: inc, Расходы: exp, Остаток: balance });
  }
  return rows;
}

export function weeklyExpenses(state: BudgetState, month: MonthKey) {
  const weeks = [0, 0, 0, 0, 0];
  for (const t of monthTransactions(state, month)) {
    if (!EXPENSE_KINDS.includes(t.kind)) continue;
    const day = Number(t.date.slice(-2));
    weeks[Math.min(4, Math.floor((day - 1) / 7))] += t.amount;
  }
  return weeks.map((v, i) => ({ week: `Неделя ${i + 1}`, Расходы: v }));
}

export function creditPaid(state: BudgetState, creditId: string) {
  return state.transactions
    .filter((t) => t.categoryId === creditId && t.kind === "loan")
    .reduce((s, t) => s + t.amount, 0);
}

export function creditTotalPlanned(state: BudgetState, creditId: string) {
  const credit = state.credits.find((c) => c.id === creditId);
  if (!credit) return 0;
  return Object.values(credit.schedule).reduce((s, v) => s + v, 0);
}

export function goalSaved(state: BudgetState, goalId: string) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return 0;
  const fromTx = goal.categoryId
    ? state.transactions
        .filter((t) => t.categoryId === goal.categoryId)
        .reduce((s, t) => s + t.amount, 0)
    : 0;
  return fromTx + goal.saved;
}
