"use client";

// Contratos: formulário de criar/editar e textos de resumo. Usado em /dinheiro e na ficha do cliente.

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { PEOPLE } from "@/lib/people";
import { dueLabel, newId, todayISO } from "@/lib/dates";
import { money } from "@/lib/money";
import type { Contract, ContractStatus, PersonId, ValueKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionButton, EmptyState, Field, QuietButton, inputClass } from "./ui-bits";

export const STATUS_LABEL: Record<ContractStatus, string> = { ativo: "Ativo", pausado: "Pausado", encerrado: "Encerrado" };

export function contractTerms(c: Contract) {
  if (c.kind === "mensal") return `${money(c.amount)}/mês, vence dia ${c.due_day ?? 10}`;
  return `${money(c.amount)}, vence ${c.due_date ? dueLabel(c.due_date) : "sem data"}`;
}

type Draft = {
  client_id: string;
  title: string;
  kind: ValueKind;
  amount: string;
  due_day: string;
  due_date: string;
  start_date: string;
  end_date: string;
  status: ContractStatus;
  owner: PersonId | "";
  notes: string;
};

function toDraft(c: Contract | null, firstClient: string): Draft {
  return {
    client_id: c?.client_id ?? firstClient,
    title: c?.title ?? "",
    kind: c?.kind ?? "mensal",
    amount: c ? String(c.amount) : "",
    due_day: String(c?.due_day ?? 10),
    due_date: c?.due_date ?? "",
    start_date: c?.start_date ?? todayISO(),
    end_date: c?.end_date ?? "",
    status: c?.status ?? "ativo",
    owner: c?.owner ?? "",
    notes: c?.notes ?? "",
  };
}

export function ContractDialog({ contract, onClose, clientId }: { contract: Contract | "new" | null; onClose: () => void; clientId?: string }) {
  const { db, insert, update, remove } = useData();
  const clients = [...db.clients].sort((a, b) => a.name.localeCompare(b.name));
  const existing = contract && contract !== "new" ? contract : null;
  const key = contract === null ? "closed" : existing?.id ?? "new";
  const [draft, setDraft] = useState<Draft>(() => toDraft(existing, clientId ?? clients[0]?.id ?? ""));
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setDraft(toDraft(existing, clientId ?? clients[0]?.id ?? ""));
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function pickClient(id: string) {
    set("client_id", id);
    const monthly = db.clients.find((c) => c.id === id)?.monthly_value;
    if (!draft.amount && monthly) set("amount", String(monthly));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(draft.amount.replace(/\D/g, ""));
    if (!draft.client_id || !amount) {
      toast.error("Escolha o cliente e informe o valor.");
      return;
    }
    if (draft.kind === "unico" && !draft.due_date) {
      toast.error("Informe a data de vencimento.");
      return;
    }
    const now = new Date().toISOString();
    const row = {
      client_id: draft.client_id,
      title: draft.title.trim(),
      kind: draft.kind,
      amount,
      due_day: draft.kind === "mensal" ? Math.min(31, Math.max(1, Number(draft.due_day) || 10)) : null,
      due_date: draft.kind === "unico" ? draft.due_date : null,
      start_date: draft.start_date || todayISO(),
      end_date: draft.end_date || null,
      status: draft.status,
      owner: (draft.owner || null) as PersonId | null,
      notes: draft.notes.trim(),
      updated_at: now,
    };
    if (existing) update("contracts", existing.id, row);
    else insert("contracts", { id: newId("ct"), created_at: now, ...row });
    toast.success(existing ? "Contrato salvo" : "Contrato criado");
    onClose();
  }

  function destroy() {
    if (!existing) return;
    if (!confirm("Excluir este contrato e os pagamentos registrados nele? Não dá para desfazer. Para parar de cobrar sem apagar o histórico, use a situação Encerrado.")) return;
    remove("contracts", existing.id);
    toast.success("Contrato excluído");
    onClose();
  }

  return (
    <Dialog open={contract !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-panel bg-surface p-7 sm:max-w-lg">
        <DialogHeader>
          <p className="kicker">Dinheiro</p>
          <DialogTitle className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-fg">{existing ? "Contrato" : "Novo contrato"}</DialogTitle>
          <DialogDescription className="text-[15px] text-fg-muted">
            {existing ? "Mude o que precisar. O histórico de pagamentos continua." : "As cobranças aparecem sozinhas a cada vencimento."}
          </DialogDescription>
        </DialogHeader>

        {clients.length === 0 ? (
          <EmptyState>Cadastre o cliente primeiro na tela Clientes.</EmptyState>
        ) : (
          <form onSubmit={save} className="mt-2 grid gap-5">
            <Field label="Cliente">
              <select required className={cn(inputClass, "field")} value={draft.client_id} onChange={(e) => pickClient(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="O que é (opcional)">
              <input className={inputClass} placeholder="Ex.: Plano Lumina, Site institucional" value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className={cn(inputClass, "field")} value={draft.kind} onChange={(e) => set("kind", e.target.value as ValueKind)}>
                  <option value="mensal">Mensalidade</option>
                  <option value="unico">Valor único</option>
                </select>
              </Field>
              <Field label="Valor (R$)">
                <input required inputMode="numeric" className={inputClass} value={draft.amount} onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))} />
              </Field>
              {draft.kind === "mensal" ? (
                <Field label="Dia do vencimento">
                  <input inputMode="numeric" className={inputClass} value={draft.due_day} onChange={(e) => set("due_day", e.target.value.replace(/\D/g, "").slice(0, 2))} />
                </Field>
              ) : (
                <Field label="Vencimento">
                  <input type="date" required className={inputClass} value={draft.due_date} onChange={(e) => set("due_date", e.target.value)} />
                </Field>
              )}
              <Field label="Quem cobra">
                <select className={cn(inputClass, "field")} value={draft.owner} onChange={(e) => set("owner", e.target.value as PersonId | "")}>
                  <option value="">Sem dono</option>
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.short}
                    </option>
                  ))}
                </select>
              </Field>
              {draft.kind === "mensal" && (
                <>
                  <Field label="Começa em">
                    <input type="date" className={inputClass} value={draft.start_date} onChange={(e) => set("start_date", e.target.value)} />
                  </Field>
                  <Field label="Termina em (opcional)">
                    <input type="date" className={inputClass} value={draft.end_date} onChange={(e) => set("end_date", e.target.value)} />
                  </Field>
                </>
              )}
              {existing && (
                <Field label="Situação" className="col-span-2">
                  <select className={cn(inputClass, "field")} value={draft.status} onChange={(e) => set("status", e.target.value as ContractStatus)}>
                    {(Object.keys(STATUS_LABEL) as ContractStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            {existing && (
              <Link
                href={`/dinheiro/contrato?contrato=${existing.id}`}
                className="inline-flex min-h-11 items-center gap-2 self-start rounded-pill px-4 text-[15px] font-semibold text-fg ring-1 ring-line-strong ring-inset hover:bg-surface-2"
              >
                <FileText className="size-4" aria-hidden />
                {existing.document ? "Abrir contrato gerado" : "Gerar contrato em PDF"}
              </Link>
            )}
            <Field label="Observações">
              <textarea rows={2} className={cn(inputClass, "resize-none")} placeholder="Forma de pagamento, combinados…" value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {existing ? (
                <QuietButton type="button" onClick={destroy} className="text-danger hover:text-danger">
                  Excluir contrato
                </QuietButton>
              ) : (
                <span />
              )}
              <ActionButton type="submit">{existing ? "Salvar contrato" : "Criar contrato"}</ActionButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
