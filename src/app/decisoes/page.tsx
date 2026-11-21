"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { newId, todayISO } from "@/lib/dates";
import type { Decision } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionButton, EmptyState, Field, PageHeader, SecondaryButton, inputClass } from "@/components/ui-bits";

export default function DecisoesPage() {
  const { db } = useData();
  const [creating, setCreating] = useState(false);
  const [deciding, setDeciding] = useState<Decision | null>(null);
  const open = db.decisions.filter((d) => d.state === "aberta");
  const done = db.decisions
    .filter((d) => d.state === "decidida")
    .sort((a, b) => (b.decided_at ?? "0000").localeCompare(a.decided_at ?? "0000"));
  const areas = [...new Set(open.map((d) => d.area))];

  return (
    <div>
      <PageHeader
        kicker="Sócios"
        title="Decisões"
        description="O que os quatro ainda precisam decidir e o histórico do que já foi decidido."
        action={
          <ActionButton onClick={() => setCreating(true)} icon={<Plus className="size-4" strokeWidth={2.6} aria-hidden />}>
            Nova pendência
          </ActionButton>
        }
      />
      <div className="gutter grid max-w-[1200px] gap-12 lg:grid-cols-[1.25fr_1fr]">
        <section aria-labelledby="abertas">
          <h2 id="abertas" className="flex items-baseline gap-2 text-[24px] font-semibold tracking-[-0.03em]">
            Para decidir <span className="text-[17px] font-normal text-fg-subtle">{open.length}</span>
          </h2>
          {open.length === 0 && (
            <div className="mt-4">
              <EmptyState>Nada pendente. Quando surgir uma decisão, registre aqui.</EmptyState>
            </div>
          )}
          <div className="mt-6 grid gap-8">
            {areas.map((area) => (
              <div key={area}>
                <p className="kicker">{area}</p>
                <ul className="mt-3 grid gap-3">
                  {open
                    .filter((d) => d.area === area)
                    .map((d) => (
                      <li key={d.id} className="rounded-card bg-raised p-5 shadow-card ring-1 ring-line ring-inset">
                        <p className="text-[19px] leading-snug font-semibold tracking-[-0.02em] text-fg">{d.title}</p>
                        {d.context && <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{d.context}</p>}
                        <div className="mt-4 flex justify-end">
                          <SecondaryButton onClick={() => setDeciding(d)}>Registrar decisão</SecondaryButton>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="decididas">
          <h2 id="decididas" className="text-[24px] font-semibold tracking-[-0.03em]">
            Já decidido
          </h2>
          <ol className="relative mt-6 grid gap-6 border-l-2 border-line pl-6">
            {done.map((d) => (
              <li key={d.id} className="relative">
                <span aria-hidden className="module absolute top-1 -left-[33px] size-4 bg-lime" />
                <p className="text-[13px] text-fg-subtle">
                  {d.decided_at ? new Date(d.decided_at + "T12:00:00").toLocaleDateString("pt-BR") : "Data não registrada"}, {d.area}
                </p>
                <p className="mt-1 text-[17px] leading-snug font-semibold text-fg">{d.title}</p>
                {d.context && <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-fg-muted">{d.context}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <NewDecisionDialog open={creating} onOpenChange={setCreating} />
      <DecideDialog decision={deciding} onClose={() => setDeciding(null)} />
    </div>
  );
}

const dialogClass = "rounded-panel bg-surface p-7 sm:max-w-lg";

function NewDecisionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { insert } = useData();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("Oferta");
  const [context, setContext] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <p className="kicker">Sócios</p>
          <DialogTitle className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-fg">Nova pendência</DialogTitle>
          <DialogDescription className="text-[15px] text-fg-muted">Uma decisão que ainda precisa ser tomada pelos sócios.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-2 grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            insert("decisions", { id: newId("dec"), title: title.trim(), state: "aberta", area, context: context.trim(), decided_at: null });
            toast.success("Pendência registrada");
            setTitle("");
            setContext("");
            onOpenChange(false);
          }}
        >
          <Field label="O que precisa ser decidido">
            <input autoFocus required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Tema">
            <select className={cn(inputClass, "field")} value={area} onChange={(e) => setArea(e.target.value)}>
              {["Oferta", "Marca e canais", "Comercial", "Clientes", "Projetos", "Conteúdo", "Operação", "Financeiro"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Contexto">
            <textarea rows={3} className={cn(inputClass, "resize-none")} value={context} onChange={(e) => setContext(e.target.value)} />
          </Field>
          <ActionButton type="submit" className="w-full sm:w-auto sm:justify-self-end">
            Registrar pendência
          </ActionButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DecideDialog({ decision, onClose }: { decision: Decision | null; onClose: () => void }) {
  const { update } = useData();
  const [what, setWhat] = useState("");

  return (
    <Dialog open={Boolean(decision)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogClass}>
        {decision && (
          <>
            <DialogHeader>
              <p className="kicker">{decision.area}</p>
              <DialogTitle className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-fg">Registrar decisão</DialogTitle>
              <DialogDescription className="text-[15px] text-fg-muted">{decision.title}</DialogDescription>
            </DialogHeader>
            <form
              className="mt-2 grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!what.trim()) return;
                update("decisions", decision.id, {
                  state: "decidida",
                  decided_at: todayISO(),
                  context: `${what.trim()}${decision.context ? `\n\nContexto: ${decision.context}` : ""}`,
                });
                toast.success("Decisão registrada");
                setWhat("");
                onClose();
              }}
            >
              <Field label="O que ficou decidido">
                <textarea autoFocus required rows={4} className={cn(inputClass, "resize-none")} value={what} onChange={(e) => setWhat(e.target.value)} />
              </Field>
              <ActionButton type="submit" className="w-full sm:w-auto sm:justify-self-end">
                Registrar decisão
              </ActionButton>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
