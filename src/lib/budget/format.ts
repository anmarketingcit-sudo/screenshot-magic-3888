export function tenge(value: number, withSign = false) {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₸`;
}

export function shortTenge(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} млн`;
  if (abs >= 1000) return `${Math.round(value / 1000)} тыс`;
  return String(Math.round(value));
}

export function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function maskCard(card: string) {
  const digits = card.replace(/\D/g, "");
  if (digits.length < 4) return card || "—";
  return `•••• ${digits.slice(-4)}`;
}

export function dayLabel(date: string) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d);
}
