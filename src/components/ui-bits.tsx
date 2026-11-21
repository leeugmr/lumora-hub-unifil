import { ArrowRight } from "lucide-react";
import type { Front } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FrontSymbol } from "./brand";

/** Cabeçalho de página: kicker com o módulo, título à esquerda, lead embaixo. */
export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="gutter flex flex-wrap items-end justify-between gap-6 pt-8 pb-8 md:pt-14 md:pb-10">
      <div className="max-w-2xl">
        <p className="kicker">{kicker}</p>
        <h1 className="mt-4 text-[clamp(32px,3.4vw,48px)] leading-[1.05] font-semibold tracking-[-0.035em]">{title}</h1>
        {description && <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-fg-muted md:text-lg">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/** Selo da frente: símbolo pronto + nome. Não é clicável. */
export function FrontTag({ front }: { front: Front }) {
  return (
    <span translate="no" className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[13px] font-medium text-fg ring-1 ring-line-strong ring-inset">
      <FrontSymbol front={front} className="size-3.5" />
      {front}
    </span>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-[15px] text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-field bg-raised px-4 py-3 text-base text-fg ring-1 ring-line-strong ring-inset outline-none transition-shadow placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none";

/** Ação no papel: cápsula `action` com a seta (ou ícone) num círculo lima. */
export function ActionButton({
  className,
  icon,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }) {
  return (
    <button
      {...props}
      className={cn(
        "btn-action inline-flex min-h-[50px] items-center justify-center gap-3 rounded-pill bg-action py-0 pr-2.5 pl-6 text-[15px] font-semibold text-on-action shadow-cta transition-transform active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    >
      {children}
      <span className="grid size-[30px] place-items-center rounded-full bg-lime text-navy">
        {icon ?? <ArrowRight className="go-arrow size-4" strokeWidth={2.4} aria-hidden />}
      </span>
    </button>
  );
}

/** Ação secundária no papel: cápsula com contorno. */
export function SecondaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 text-[15px] font-semibold text-fg ring-1 ring-line-strong ring-inset transition-colors hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    />
  );
}

export function QuietButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-4 text-[15px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg",
        className,
      )}
    />
  );
}

/** Abas em cápsula. Selecionada: lima a 12% com contorno lima (estado do design system). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
      {options.map(([id, text]) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(id)}
            className={cn(
              "min-h-11 rounded-pill px-5 text-[15px] font-medium transition-colors md:min-h-10",
              on
                ? "bg-lime/12 text-fg ring-2 ring-lime-deep ring-inset"
                : "text-fg-subtle ring-1 ring-line ring-inset hover:text-fg hover:ring-line-strong",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-card border border-dashed border-line-strong px-5 py-7 text-center text-[15px] text-fg-muted">{children}</p>;
}

export function SectionTitle({ id, children, count, tone }: { id: string; children: React.ReactNode; count?: number; tone?: "danger" }) {
  return (
    <h2 id={id} className={cn("mb-2 flex items-baseline gap-2 text-[19px] font-semibold tracking-[-0.02em]", tone === "danger" && "text-danger")}>
      {children}
      {count != null && <span className="text-[15px] font-normal text-fg-subtle">{count}</span>}
    </h2>
  );
}
