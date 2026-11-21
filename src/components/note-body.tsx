"use client";

import { Check } from "lucide-react";
import { resolveLink, splitLinks, type LinkTarget } from "@/lib/links";
import { cn } from "@/lib/utils";

/** Renderiza o corpo de uma nota: títulos (#), listas (-), checklists (- [ ]) e [[links]]. */
export function NoteBody({
  body,
  targets,
  onOpen,
  onToggle,
}: {
  body: string;
  targets: LinkTarget[];
  onOpen: (t: LinkTarget) => void;
  /** Recebe o índice da linha do checklist clicado. Sem isso, o checklist é só leitura. */
  onToggle?: (lineIndex: number) => void;
}) {
  const lines = body.split("\n");

  function inline(text: string) {
    return splitLinks(text).map((part, i) => {
      if (!part.link) return <span key={i}>{part.text}</span>;
      const target = resolveLink(part.link, targets);
      if (!target)
        return (
          <span key={i} title="Nada no HUB com esse nome ainda" className="text-fg-subtle underline decoration-dashed underline-offset-4">
            {part.text}
          </span>
        );
      return (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(target)}
          className="rounded-sm font-semibold text-accent-text underline decoration-lime-deep decoration-2 underline-offset-4 hover:decoration-accent-text"
        >
          {part.text}
        </button>
      );
    });
  }

  if (!body.trim()) return <p className="text-fg-subtle">Nota vazia. Toque em Escrever para começar.</p>;

  return (
    <div className="grid gap-1.5 text-base leading-relaxed text-fg">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        const task = /^(\s*)- \[( |x|X)\] (.*)$/.exec(line);
        if (task) {
          const done = task[2].toLowerCase() === "x";
          return (
            <div key={i} className="flex items-start gap-3 py-0.5">
              <button
                type="button"
                disabled={!onToggle}
                onClick={() => onToggle?.(i)}
                aria-pressed={done}
                aria-label={done ? "Desmarcar" : "Marcar como feito"}
                className="-m-2 grid size-10 shrink-0 place-items-center rounded-full disabled:cursor-default"
              >
                <span className={cn("module grid size-5 place-items-center", done ? "bg-lime text-navy" : "bg-raised ring-2 ring-fg-subtle/60 ring-inset")}>
                  {done && <Check className="size-3" strokeWidth={3} aria-hidden />}
                </span>
              </button>
              <span className={cn("pt-0.5", done && "text-fg-subtle line-through")}>{inline(task[3])}</span>
            </div>
          );
        }
        if (line.startsWith("### ")) return <h4 key={i} className="mt-2 text-[15px] font-semibold text-fg-muted">{inline(line.slice(4))}</h4>;
        if (line.startsWith("## ")) return <h3 key={i} className="mt-3 text-[19px] font-semibold tracking-[-0.02em]">{inline(line.slice(3))}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{inline(line.slice(2))}</h2>;
        if (/^\s*- /.test(line))
          return (
            <div key={i} className="flex gap-3 pl-1">
              <span aria-hidden className="module mt-[9px] size-2 shrink-0 bg-lime-deep" />
              <span>{inline(line.replace(/^\s*- /, ""))}</span>
            </div>
          );
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
