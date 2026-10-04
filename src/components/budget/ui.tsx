import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  aside,
  className,
  children,
  delay = 0,
}: {
  title?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <section
      className={cn("card-panel", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || aside) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>}
          {aside && <div className="num text-[11px] text-muted-foreground">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "ink" | "teal" | "rose" | "amber" | "violet";

const barTone: Record<Tone, string> = {
  ink: "bg-ink",
  teal: "bg-teal",
  rose: "bg-rose",
  amber: "bg-amber",
  violet: "bg-violet",
};

export function Bar({
  value,
  tone = "ink",
  height = "h-2.5",
}: {
  value: number;
  tone?: Tone;
  height?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-line", height)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", barTone[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ProgressRow({
  name,
  fact,
  limit,
  tone,
  onClick,
  note,
}: {
  name: string;
  fact: string;
  limit: string;
  tone: Tone;
  onClick?: () => void;
  note?: string;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 text-left",
        onClick && "rounded-xl transition-colors hover:bg-muted",
      )}
    >
      <span className={cn("size-2.5 shrink-0 rounded-full", barTone[tone])} />
      <div className="min-w-0 flex-1 py-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="num shrink-0 text-xs text-muted-foreground">
            {fact} / {limit}
          </span>
        </div>
        <div className="mt-1.5">
          <BarFromText fact={fact} limit={limit} tone={tone} />
        </div>
        {note && <p className="num mt-1 text-[11px] text-muted-foreground">{note}</p>}
      </div>
    </Wrapper>
  );
}

function BarFromText({ fact, limit, tone }: { fact: string; limit: string; tone: Tone }) {
  const f = Number(fact.replace(/\D/g, ""));
  const l = Number(limit.replace(/\D/g, ""));
  return <Bar value={l ? (f / l) * 100 : 0} tone={tone} />;
}

export function Badge({ children, tone = "teal" }: { children: ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    ink: "bg-ink/10 text-ink",
    teal: "bg-teal/10 text-teal",
    rose: "bg-rose/10 text-rose",
    amber: "bg-amber/15 text-amber",
    violet: "bg-violet/15 text-violet",
  };
  return (
    <span className={cn("num rounded-full px-2.5 py-1 text-[11px] font-bold", map[tone])}>
      {children}
    </span>
  );
}

export function SourceTag({ source }: { source: "факт" | "вручную" | "прогноз" }) {
  const tone = source === "факт" ? "teal" : source === "вручную" ? "violet" : "amber";
  return <Badge tone={tone}>{source}</Badge>;
}

export function NumberInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "num w-32 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-right text-sm outline-none focus:border-primary",
        className,
      )}
    />
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary",
        className,
      )}
    />
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "solid",
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
        variant === "solid"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-line bg-surface hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}
