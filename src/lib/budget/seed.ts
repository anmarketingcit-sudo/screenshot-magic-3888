import type { BudgetState, MonthKey } from "./types";

export const OCT: MonthKey = "2026-10";
export const NOV: MonthKey = "2026-11";

export const MONTHS: MonthKey[] = [
  "2026-10",
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
  "2027-04",
  "2027-05",
  "2027-06",
];

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function monthLabel(key: MonthKey) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

export function monthShort(key: MonthKey) {
  const [, m] = key.split("-");
  return MONTH_NAMES[Number(m) - 1].slice(0, 3);
}

function limits(oct: number, nov: number): Record<MonthKey, number> {
  const base: Record<MonthKey, number> = { [OCT]: oct, [NOV]: nov };
  for (const m of MONTHS.slice(2)) base[m] = nov;
  return base;
}

export const seedState: BudgetState = {
  categories: [
    { id: "rent", name: "Аренда квартиры", limits: limits(230000, 230000) },
    { id: "kinder", name: "Садик", limits: limits(350000, 350000) },
    { id: "credit1", name: "Кредит 1", limits: { ...limits(83000, 81000), "2026-12": 53000, "2027-01": 19000, "2027-02": 0, "2027-03": 0, "2027-04": 0, "2027-05": 0, "2027-06": 0 } },
    {
      id: "credit2",
      name: "Кредит 2",
      limits: { ...limits(228000, 186000), "2026-12": 186000, "2027-01": 186000, "2027-02": 136000, "2027-03": 97000, "2027-04": 45000, "2027-05": 45000, "2027-06": 7000 },
    },
    { id: "food", name: "Продукты, кафе и доставка", limits: limits(180000, 180000) },
    { id: "transport", name: "Транспорт", limits: limits(74000, 74000) },
    { id: "health", name: "Лечение", limits: limits(50000, 50000) },
    { id: "fun", name: "Развлечения", limits: limits(50000, 50000) },
    { id: "miron", name: "Отдых с Мироном", limits: limits(50000, 50000) },
    { id: "miron-bd", name: "День рождения Мирона", limits: { ...limits(0, 50000), "2026-12": 0, "2027-01": 0, "2027-02": 0, "2027-03": 0, "2027-04": 0, "2027-05": 0, "2027-06": 0 } },
    { id: "nails", name: "Маникюр и педикюр", limits: limits(20000, 20000) },
    { id: "spa", name: "Салон и SPA", limits: limits(30000, 30000) },
    { id: "digital", name: "Цифровые сервисы", limits: limits(20000, 20000) },
    { id: "kids", name: "Детские покупки и книги", limits: limits(18000, 18000) },
    { id: "utilities", name: "Коммунальные платежи", limits: limits(10000, 10000) },
    { id: "laundry", name: "Химчистка", limits: limits(10000, 10000) },
    { id: "internet", name: "Связь и интернет", limits: limits(4000, 4000) },
    { id: "donate", name: "Пожертвования", limits: limits(2000, 2000) },
    { id: "fees", name: "Банковские комиссии", limits: limits(1000, 1000) },
    { id: "mom", name: "Возврат долга маме", limits: { ...limits(100000, 80000), "2026-12": 0, "2027-01": 0, "2027-02": 0, "2027-03": 0, "2027-04": 0, "2027-05": 0, "2027-06": 0 } },
    { id: "flat", name: "Накопление на квартиру", limits: limits(100000, 100000) },
    { id: "unsorted", name: "Не распределено", limits: limits(0, 0) },
  ],
  transactions: [],
  rules: [
    { id: "r1", match: "зарплата", categoryId: null, kind: "income" },
    { id: "r2", match: "алимент", categoryId: null, kind: "income" },
    { id: "r3", match: "перевод между своими", categoryId: null, kind: "transfer" },
    { id: "r4", match: "снятие наличных", categoryId: null, kind: "cash" },
    { id: "r5", match: "magnum", categoryId: "food", kind: "expense" },
    { id: "r6", match: "small", categoryId: "food", kind: "expense" },
    { id: "r7", match: "wolt", categoryId: "food", kind: "expense" },
    { id: "r8", match: "yandex", categoryId: "transport", kind: "expense" },
    { id: "r9", match: "такси", categoryId: "transport", kind: "expense" },
    { id: "r10", match: "аптека", categoryId: "health", kind: "expense" },
    { id: "r11", match: "комиссия", categoryId: "fees", kind: "expense" },
    { id: "r12", match: "netflix", categoryId: "digital", kind: "expense" },
    { id: "r13", match: "погашение кредита", categoryId: "credit1", kind: "loan" },
  ],
  incomes: [
    { id: "i1", name: "Зарплата", amount: 956375, regular: true },
    { id: "i2", name: "Алименты", amount: 200000, regular: true },
  ],
  credits: [
    {
      id: "credit1",
      name: "Кредит 1",
      categoryId: "credit1",
      principalKnown: false,
      principal: null,
      schedule: { "2026-10": 83000, "2026-11": 81000, "2026-12": 53000, "2027-01": 19000, "2027-02": 0, "2027-03": 0, "2027-04": 0, "2027-05": 0, "2027-06": 0 },
    },
    {
      id: "credit2",
      name: "Кредит 2",
      categoryId: "credit2",
      principalKnown: false,
      principal: null,
      schedule: { "2026-10": 228000, "2026-11": 186000, "2026-12": 186000, "2027-01": 186000, "2027-02": 136000, "2027-03": 97000, "2027-04": 45000, "2027-05": 45000, "2027-06": 7000 },
    },
  ],
  goals: [
    {
      id: "flat",
      name: "Квартира",
      categoryId: "flat",
      target: 1200000,
      monthlyPlan: Object.fromEntries(MONTHS.map((m) => [m, 100000])),
      saved: 0,
    },
    {
      id: "mom",
      name: "Возврат маме",
      categoryId: "mom",
      target: 180000,
      monthlyPlan: { "2026-10": 100000, "2026-11": 80000 },
      saved: 0,
    },
    {
      id: "miron-bd",
      name: "День рождения Мирона",
      categoryId: "miron-bd",
      target: 50000,
      monthlyPlan: { "2026-11": 50000 },
      saved: 0,
    },
  ],
};
