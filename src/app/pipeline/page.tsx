"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { LEAD_STAGES, brl } from "@/lib/labels";
import { dueLabel, newId } from "@/lib/dates";
import { IDLE_DAYS, daysInStage, lostReasons } from "@/lib/funnel";
import type { Front, Lead, ValueKind } from "@/lib/types";
import { OPEN_STAGES, funnelText, funnelValue } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RecordSheet, type RecordRef } from "@/components/record-sheet";
import { Avatars } from "@/components/brand";
import { FunnelPanel, InsightList } from "@/components/lead-funnel";
import { ActionButton, Field, FrontTag, PageHeader, inputClass } from "@/components/ui-bits";

export default function PipelinePage() {
  const { db } = useData();
  const [record, setRecord] = useState<RecordRef | null>(null);
  const [creating, setCreating] = useState(false);
  const active = LEAD_STAGES.filter((s) => s.id !== "perdido");
  const lost = db.leads.filter((l) => l.stage === "perdido");
  const open = db.leads.filter((l) => (OPEN_STAGES as readonly string[]).includes(l.stage));
  const openValue = funnelValue(open);
  const won = funnelValue(db.leads.filter((l) => l.stage === "fechado"));

  return (
    <div>
      <PageHeader
        kicker="Comercial"
        title="Pipeline"
        description="Quem está conversando com a Lumora e qual é o próximo passo com cada um."
        action={
          <ActionButton onClick={() => setCreating(true)} icon={<Plus className="size-4" strokeWidth={2.6} aria-hidden />}>
            Novo lead
          </ActionButton>
        }
      />

      <dl className="gutter -mt-2 mb-6 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 rounded-card bg-raised p-4 shadow-card ring-1 ring-line ring-inset md:col-span-1">
          <dt className="text-[13px] text-fg-muted">Em negociação ({open.length} {open.length === 1 ? "lead" : "leads"})</dt>
          <dd className="mt-1 text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{funnelText(openValue)}</dd>
        </div>
        <div className="rounded-card bg-raised p-4 shadow-card ring-1 ring-line ring-inset">
          <dt className="text-[13px] text-fg-muted">Fechado</dt>
          <dd className="mt-1 text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{funnelText(won)}</dd>
        </div>
        <div className="rounded-card bg-raised p-4 shadow-card ring-1 ring-line ring-inset">
          <dt className="text-[13px] text-fg-muted">Sem valor estimado</dt>
          <dd className={cn("mt-1 text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums", openValue.semValor > 0 && "text-warn")}>
            {openValue.semValor} {openValue.semValor === 1 ? "lead" : "leads"}
          </dd>
        </div>
      </dl>

      <div className="gutter mb-8 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FunnelPanel />
        <InsightList onOpenLead={(id) => setRecord({ type: "lead", id })} />
      </div>

      <h2 className="gutter mb-4 text-[22px] font-semibold tracking-[-0.02em]">Por etapa</h2>
      <div className="gutter no-scrollbar flex snap-x snap-mandatory scroll-px-[clamp(20px,4vw,56px)] gap-3 overflow-x-auto pb-8">
        {active.map((stage, i) => {
          const leads = db.leads.filter((l) => l.stage === stage.id);
          const total = funnelValue(leads);
          return (
            <section
              key={stage.id}
              aria-labelledby={`st-${stage.id}`}
              className="w-[84vw] max-w-[320px] shrink-0 snap-start rounded-card bg-surface-2 p-3 md:w-[280px]"
            >
              <h2 id={`st-${stage.id}`} className="flex items-baseline gap-2 px-2 pt-2 pb-4 text-[17px] font-semibold tracking-[-0.02em]">
                <span className="text-[13px] font-semibold text-accent-text tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {stage.label}
                <span className="ml-auto text-[15px] font-normal text-fg-subtle">{leads.length}</span>
              </h2>
              {(total.mensal > 0 || total.unico > 0) && <p className="-mt-2 px-2 pb-4 text-[13px] font-medium text-fg-muted tabular-nums">{funnelText(total)}</p>}
              <ul className="grid gap-3">
                {leads.length === 0 && <li className="px-2 pb-3 text-[15px] text-fg-subtle">Ninguém nesta etapa.</li>}
                {leads.map((l) => (
                  <LeadCard key={l.id} lead={l} onOpen={() => setRecord({ type: "lead", id: l.id })} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {lost.length > 0 && (
        <details className="gutter">
          <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-medium text-fg-muted hover:text-fg">Perdidos ({lost.length})</summary>
          {lostReasons(lost).length > 0 && (
            <p className="mt-2 text-[15px] text-fg-muted">
              Motivos: {lostReasons(lost).map(([r, n]) => `${r} (${n})`).join(" · ")}
            </p>
          )}
          <ul className="mt-3 grid max-w-md gap-3">
            {lost.map((l) => (
              <LeadCard key={l.id} lead={l} onOpen={() => setRecord({ type: "lead", id: l.id })} />
            ))}
          </ul>
        </details>
      )}

      <RecordSheet record={record} onClose={() => setRecord(null)} />
      <NewLeadDialog open={creating} onOpenChange={setCreating} onCreated={(id) => setRecord({ type: "lead", id })} />
    </div>
  );
}

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const { db } = useData();
  const next = db.tasks
    .filter((t) => t.ref_type === "lead" && t.ref_id === lead.id && !t.done)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))[0];
  const idle = daysInStage(lead, db.lead_events);

  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full rounded-card bg-raised p-4 text-left shadow-card ring-1 ring-line ring-inset transition-shadow hover:ring-2 hover:ring-lime-deep"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-[17px] leading-snug font-semibold tracking-[-0.01em] text-fg">{lead.name}</span>
          <FrontTag front={lead.front} />
        </span>
        <span className="mt-2 line-clamp-2 text-[15px] leading-snug text-fg-muted">{lead.summary}</span>
        <span className={cn("mt-3 block text-[15px] font-semibold tabular-nums", lead.value_estimate == null ? "font-normal text-fg-subtle" : "text-fg")}>
          {lead.value_estimate == null ? "Sem valor estimado" : `${brl(lead.value_estimate)}${lead.value_kind === "mensal" ? "/mês" : ", valor único"}`}
        </span>
        {lead.stage === "perdido" && (
          <span className={cn("mt-2 block text-[15px]", lead.lost_reason ? "text-fg" : "font-semibold text-warn")}>
            {lead.lost_reason ? `Motivo: ${lead.lost_reason}` : "Sem motivo da perda"}
          </span>
        )}
        {lead.stage !== "perdido" && (
          <span className="mt-4 block border-t border-line pt-3">
            <span className="block text-[13px] text-fg-subtle">Próximo passo</span>
            {next ? (
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className="line-clamp-2 text-[15px] leading-snug text-fg">{next.title}</span>
                <Avatars ids={next.owners} />
              </span>
            ) : (
              <span className="mt-1 block text-[15px] font-semibold text-danger">Sem próximo passo</span>
            )}
            <span className="mt-2 flex justify-between text-[13px] text-fg-muted">
              <span className={cn(next?.due && "font-semibold text-accent-text")}>{next?.due ? dueLabel(next.due) : "Sem prazo"}</span>
              <span className={cn(idle > IDLE_DAYS && lead.stage !== "fechado" && "font-semibold text-warn")}>
                {idle === 0 ? "Entrou na etapa hoje" : `Nesta etapa há ${idle} ${idle === 1 ? "dia" : "dias"}`}
              </span>
            </span>
          </span>
        )}
      </button>
    </li>
  );
}

function NewLeadDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { insert } = useData();
  const [name, setName] = useState("");
  const [front, setFront] = useState<Front>("Studio");
  const [source, setSource] = useState("WhatsApp");
  const [summary, setSummary] = useState("");
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<ValueKind>("mensal");

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = newId("lead");
    insert("leads", { id, name: name.trim(), front, stage: "contato", source, summary: summary.trim(), value_estimate: value ? Number(value.replace(/\D/g, "")) : null, value_kind: kind, updated_at: new Date().toISOString() });
    toast.success("Lead criado", { description: name.trim() });
    setName("");
    setSummary("");
    setValue("");
    onOpenChange(false);
    onCreated(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-panel bg-surface p-7 sm:max-w-lg">
        <DialogHeader>
          <p className="kicker">Comercial</p>
          <DialogTitle className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-fg">Novo lead</DialogTitle>
          <DialogDescription className="text-[15px] text-fg-muted">Ele entra na etapa Contato. Depois de criar, defina o próximo passo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={create} className="mt-2 grid gap-5">
          <Field label="Nome do negócio">
            <input autoFocus required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frente">
              <select className={cn(inputClass, "field")} value={front} onChange={(e) => setFront(e.target.value as Front)}>
                <option>Studio</option>
                <option>Software</option>
              </select>
            </Field>
            <Field label="Origem">
              <select className={cn(inputClass, "field")} value={source} onChange={(e) => setSource(e.target.value)}>
                <option>WhatsApp</option>
                <option>Instagram</option>
                <option>Indicação</option>
                <option>Prospecção ativa</option>
                <option>Site</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor estimado (R$)">
              <input inputMode="numeric" className={inputClass} placeholder="Opcional" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Tipo de valor">
              <select className={cn(inputClass, "field")} value={kind} onChange={(e) => setKind(e.target.value as ValueKind)}>
                <option value="mensal">Por mês</option>
                <option value="unico">Valor único</option>
              </select>
            </Field>
          </div>
          <Field label="O que o negócio precisa">
            <textarea rows={3} className={cn(inputClass, "resize-none")} placeholder="Ex.: quer um site para a clínica e ajuda com o Instagram…" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <ActionButton type="submit" className="w-full sm:w-auto sm:justify-self-end">
            Criar lead
          </ActionButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
