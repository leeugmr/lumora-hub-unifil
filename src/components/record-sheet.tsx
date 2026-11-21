"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { CLIENT_STATUSES, CLIENT_STATUS_LABEL, LEAD_STAGES, LOST_REASONS, PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/lib/labels";
import { newId } from "@/lib/dates";
import type { Client, Front, Lead, PersonId, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LinkedTasks } from "./tasks";
import { Notes } from "./notes";
import { ContractDialog, STATUS_LABEL, contractTerms } from "./contracts";
import type { Contract } from "@/lib/types";
import { FrontSymbol } from "./brand";
import { ActionButton, Field, SecondaryButton, inputClass } from "./ui-bits";

export type RecordRef = { type: "lead"; id: string } | { type: "client"; id: string } | { type: "project"; id: string };

const FRONTS: Front[] = ["Studio", "Software", "Lumora"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-7">
      <h3 className="mb-4 text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
      {children}
    </section>
  );
}

const moneyInput = (v: unknown) => (v == null ? "" : String(v));
const parseMoney = (s: string) => (s ? Number(s.replace(/\D/g, "")) : null);

export function RecordSheet({ record, onClose }: { record: RecordRef | null; onClose: () => void }) {
  const { db, update, insert } = useData();
  const lead = record?.type === "lead" ? db.leads.find((l) => l.id === record.id) : undefined;
  const client = record?.type === "client" ? db.clients.find((c) => c.id === record.id) : undefined;
  const project = record?.type === "project" ? db.projects.find((p) => p.id === record.id) : undefined;
  const row = lead ?? client ?? project;

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [contract, setContract] = useState<Contract | "new" | null>(null);
  useEffect(() => {
    setDraft(row ? { ...row } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  if (!record || !row) {
    return (
      <Sheet open={false} onOpenChange={() => onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  // Dono padrão segue a jornada do site: comercial e clientes com a Fran, projetos com Leo e Fab.
  const owners: PersonId[] = record.type === "project" ? ["leo", "fab"] : ["fran"];
  const area = record.type === "lead" ? "comercial" : record.type === "client" ? "clientes" : "projetos";

  function save() {
    const now = new Date().toISOString();
    if (record!.type === "lead") {
      const lost = draft.stage === "perdido";
      if (lost && !draft.lost_reason) {
        toast.error("Escolha o motivo da perda", { description: "Ele alimenta os insights do Pipeline." });
        return;
      }
      update("leads", record!.id, { ...(draft as Partial<Lead>), lost_reason: lost ? (draft.lost_reason as string) : null, updated_at: now });
    }
    if (record!.type === "client") update("clients", record!.id, { ...(draft as Partial<Client>), updated_at: now });
    if (record!.type === "project") update("projects", record!.id, { ...(draft as Partial<Project>), updated_at: now });
    toast.success("Ficha salva");
  }

  function makeClient() {
    if (!lead) return;
    insert("clients", {
      id: newId("client"),
      name: lead.name,
      front: lead.front,
      status: "ativo",
      delivery: "",
      monthly_value: lead.value_kind === "mensal" ? lead.value_estimate : null,
      can_publicize: false,
      summary: lead.summary,
      updated_at: new Date().toISOString(),
    });
    toast.success(`${lead.name} agora é cliente`, { description: "A ficha foi criada em Clientes." });
  }

  const typeLabel = record.type === "lead" ? "Lead" : record.type === "client" ? "Cliente" : "Projeto";
  const alreadyClient = lead ? db.clients.some((c) => c.name === lead.name) : false;
  const front = (draft.front as Front | undefined) ?? (lead?.front || client?.front);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full data-[side=right]:w-full gap-0 overflow-x-hidden overflow-y-auto bg-surface sm:max-w-xl">
        <SheetHeader className="px-6 pt-8 pb-6">
          <p className="kicker">{typeLabel}</p>
          <SheetTitle className="mt-2 flex items-center gap-3 text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] text-fg">
            {front && <FrontSymbol front={front} className="size-7" />}
            {String(draft.name ?? row.name)}
          </SheetTitle>
          <SheetDescription className="sr-only">Próximos passos, ficha e anotações</SheetDescription>
        </SheetHeader>

        <Section title="Próximos passos">
          <LinkedTasks refType={record.type} refId={record.id} defaultOwners={owners} area={area} />
        </Section>

        <Section title="Ficha">
          <div className="grid gap-5">
            <Field label="Nome">
              <input className={inputClass} value={String(draft.name ?? "")} onChange={(e) => set("name", e.target.value)} />
            </Field>

            {record.type === "lead" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Etapa">
                  <select className={cn(inputClass, "field")} value={String(draft.stage)} onChange={(e) => set("stage", e.target.value)}>
                    {LEAD_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Frente">
                  <select className={cn(inputClass, "field")} value={String(draft.front)} onChange={(e) => set("front", e.target.value)}>
                    {FRONTS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                {draft.stage === "perdido" && (
                  <Field label="Motivo da perda" className="col-span-2">
                    <select required className={cn(inputClass, "field")} value={String(draft.lost_reason ?? "")} onChange={(e) => set("lost_reason", e.target.value || null)}>
                      <option value="">Escolha o motivo</option>
                      {LOST_REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <span className="mt-2 block text-[13px] text-fg-subtle">Detalhes vão no resumo ou numa anotação.</span>
                  </Field>
                )}
                <Field label="Origem" className="col-span-2">
                  <input className={inputClass} value={String(draft.source ?? "")} onChange={(e) => set("source", e.target.value)} />
                </Field>
                <Field label="Valor estimado (R$)">
                  <input inputMode="numeric" className={inputClass} value={moneyInput(draft.value_estimate)} onChange={(e) => set("value_estimate", parseMoney(e.target.value))} />
                </Field>
                <Field label="Tipo de valor">
                  <select className={cn(inputClass, "field")} value={String(draft.value_kind ?? "mensal")} onChange={(e) => set("value_kind", e.target.value)}>
                    <option value="mensal">Por mês</option>
                    <option value="unico">Valor único</option>
                  </select>
                </Field>
              </div>
            )}

            {record.type === "client" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Situação">
                  <select className={cn(inputClass, "field")} value={String(draft.status)} onChange={(e) => set("status", e.target.value)}>
                    {CLIENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {CLIENT_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Frente">
                  <select className={cn(inputClass, "field")} value={String(draft.front)} onChange={(e) => set("front", e.target.value)}>
                    {FRONTS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                <Field label="O que entregamos" className="col-span-2">
                  <input className={inputClass} value={String(draft.delivery ?? "")} onChange={(e) => set("delivery", e.target.value)} />
                </Field>
                <Field label="Valor mensal (R$)">
                  <input inputMode="numeric" className={inputClass} value={moneyInput(draft.monthly_value)} onChange={(e) => set("monthly_value", parseMoney(e.target.value))} />
                </Field>
                <label className="flex min-h-11 items-center gap-3 self-end pb-1 text-[15px] text-fg">
                  <input type="checkbox" className="size-5 accent-[#142b45]" checked={Boolean(draft.can_publicize)} onChange={(e) => set("can_publicize", e.target.checked)} />
                  Pode virar case
                </label>
              </div>
            )}

            {record.type === "project" && (
              <Field label="Situação">
                <select className={cn(inputClass, "field")} value={String(draft.status)} onChange={(e) => set("status", e.target.value)}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PROJECT_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Resumo">
              <textarea rows={5} className={cn(inputClass, "min-h-[120px] resize-y leading-relaxed")} value={String(draft.summary ?? "")} onChange={(e) => set("summary", e.target.value)} />
            </Field>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {lead && lead.stage === "fechado" && !alreadyClient && <SecondaryButton onClick={makeClient}>Criar ficha de cliente</SecondaryButton>}
              <ActionButton onClick={save}>Salvar ficha</ActionButton>
            </div>
          </div>
        </Section>

        {record.type === "client" && (
          <Section title="Contratos">
            {db.contracts.filter((c) => c.client_id === record.id).length === 0 ? (
              <p className="text-[15px] text-fg-muted">Nenhum contrato registrado.</p>
            ) : (
              <ul className="mb-4">
                {db.contracts
                  .filter((c) => c.client_id === record.id)
                  .map((c) => (
                    <li key={c.id} className="border-b border-line last:border-b-0">
                      <button onClick={() => setContract(c)} className="w-full rounded-sm py-3 text-left">
                        <span className="block text-base font-medium text-fg">
                          {c.title || "Contrato"}
                          {c.status !== "ativo" && <span className="font-normal text-fg-subtle">, {STATUS_LABEL[c.status].toLowerCase()}</span>}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-fg-muted">{contractTerms(c)}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <SecondaryButton onClick={() => setContract("new")}>Novo contrato</SecondaryButton>
              <Link
                href={`/dinheiro/contrato?cliente=${record.id}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 text-[15px] font-semibold text-fg ring-1 ring-line-strong ring-inset transition-colors hover:bg-surface-2"
              >
                Gerar contrato
              </Link>
            </div>
            <ContractDialog contract={contract} clientId={record.id} onClose={() => setContract(null)} />
          </Section>
        )}

        <Section title="Anotações">
          <Notes refType={record.type} refId={record.id} />
        </Section>
      </SheetContent>
    </Sheet>
  );
}
