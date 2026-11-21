/* eslint-disable @next/next/no-img-element */
import { PERSON } from "@/lib/people";
import type { Front, PersonId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Logo pronto (arquivo do design system) + rótulo do produto. Nunca recriar o logo em texto. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img src="/brand/lumora-wordmark-white.webp" alt="Lumora" className="h-[21px] w-auto md:h-6" />
      <span className="rounded-pill px-2 py-0.5 text-[11px] font-semibold tracking-[0.14em] text-lime-glow uppercase ring-1 ring-lime-glow/40 ring-inset">
        Hub
      </span>
    </span>
  );
}

const SYMBOLS: Partial<Record<Front, { paper: string; dark: string }>> = {
  Software: { paper: "/brand/software-symbol.webp", dark: "/brand/software-symbol-light.webp" },
  Studio: { paper: "/brand/studio-symbol.svg", dark: "/brand/studio-symbol-light.svg" },
};

/** Símbolo da frente ao lado do nome. Arquivos prontos: troca o arquivo conforme o fundo, nunca a cor. */
export function FrontSymbol({ front, className, onInk = false }: { front: Front; className?: string; onInk?: boolean }) {
  const s = SYMBOLS[front];
  if (!s) return <span aria-hidden className={cn("module inline-block size-3 bg-lime-deep", className)} />;
  if (onInk) return <img src={s.dark} alt="" aria-hidden className={cn("size-4 object-contain", className)} />;
  return (
    <picture className="contents">
      <source srcSet={s.dark} media="(prefers-color-scheme: dark)" />
      <img src={s.paper} alt="" aria-hidden className={cn("size-4 object-contain", className)} />
    </picture>
  );
}

export function Avatar({ id, className }: { id: PersonId; className?: string }) {
  return (
    <span
      aria-hidden
      title={PERSON[id].short}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-navy font-semibold text-on-ink dark:bg-on-ink dark:text-ink",
        className,
      )}
    >
      {PERSON[id].short.slice(0, 2)}
    </span>
  );
}

export function Avatars({ ids, className }: { ids: PersonId[]; className?: string }) {
  if (ids.length === 0) return <span className="text-[13px] text-fg-subtle">Sem dono</span>;
  return (
    <span className="inline-flex -space-x-1.5" aria-label={`Responsáveis: ${ids.map((i) => PERSON[i].short).join(", ")}`}>
      {ids.map((id) => (
        <Avatar key={id} id={id} className={cn("size-7 text-[11px] ring-2 ring-raised", className)} />
      ))}
    </span>
  );
}
