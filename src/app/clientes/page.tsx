"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { CLIENT_STATUS_LABEL, PROJECT_STATUS_LABEL, brl } from "@/lib/labels";
import { newId } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { RecordSheet, type RecordRef } from "@/components/record-sheet";
import { ActionButton, EmptyState, FrontTag, PageHeader, Segmented } from "@/components/ui-bits";

function Count({ n }: { n: number }) {
  return (
    <span className={cn("text-[15px]", n > 0 ? "font-semibold text-fg" : "text-fg-subtle")}>
      {n} {n === 1 ? "ação aberta" : "ações abertas"}
    </span>
  );
}

export default function ClientesPage() {
  const { db, insert } = useData();
  const [tab, setTab] = useState<"clients" | "projects">("clients");
  const [record, setRecord] = useState<RecordRef | null>(null);

  const openTasks = (type: "client" | "project", id: string) => db.tasks.filter((t) => t.ref_type === type && t.ref_id === id && !t.done).length;

  function create() {
    const now = new Date().toISOString();
    if (tab === "clients") {
      const id = newId("client");
      insert("clients", { id, name: "Novo cliente", front: "Studio", status: "ativo", delivery: "", monthly_value: null, can_publicize: false, summary: "", updated_at: now });
      setRecord({ type: "client", id });
      toast.success("Ficha de cliente criada. Preencha os dados.");
    } else {
      const id = newId("project");
      insert("projects", { id, name: "Novo projeto", kind: "interno", status: "ideia", client_id: null, summary: "", updated_at: now });
      setRecord({ type: "project", id });
      toast.success("Projeto criado. Preencha os dados.");
    }
  }

  const rowClass =
    "grid w-full gap-2 px-5 py-5 text-left transition-colors hover:bg-surface md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:px-6";

  return (
    <div>
      <PageHeader
        kicker="Carteira"
        title="Clientes e projetos"
        description="Quem já trabalha com a Lumora, o que entregamos e o que está em andamento."
        action={
          <ActionButton onClick={create} icon={<Plus className="size-4" strokeWidth={2.6} aria-hidden />}>
            {tab === "clients" ? "Novo cliente" : "Novo projeto"}
          </ActionButton>
        }
      />
      <div className="gutter max-w-[1100px]">
        <Segmented
          label="Lista"
          value={tab}
          onChange={setTab}
          options={[
            ["clients", `Clientes (${db.clients.length})`],
            ["projects", `Projetos (${db.projects.length})`],
          ]}
        />

        <div className="mt-6">
          {tab === "clients" ? (
            db.clients.length === 0 ? (
              <EmptyState>Nenhum cliente ainda. Leads fechados no Pipeline viram clientes aqui.</EmptyState>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-card bg-raised shadow-card ring-1 ring-line ring-inset">
                {db.clients.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setRecord({ type: "client", id: c.id })} className={rowClass}>
                      <span>
                        <span className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[19px] font-semibold tracking-[-0.02em] text-fg">{c.name}</span>
                          <FrontTag front={c.front} />
                        </span>
                        <span className="mt-1 block text-[15px] text-fg-muted">{c.delivery || "Entrega não registrada"}</span>
                        {!c.can_publicize && <span className="mt-1 block text-[13px] text-fg-subtle">Não divulgar como case</span>}
                      </span>
                      <span className="flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-fg-muted md:justify-end">
                        <span>{CLIENT_STATUS_LABEL[c.status]}</span>
                        <span>{brl(c.monthly_value)}</span>
                        <Count n={openTasks("client", c.id)} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-card bg-raised shadow-card ring-1 ring-line ring-inset">
              {db.projects.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setRecord({ type: "project", id: p.id })} className={rowClass}>
                    <span>
                      <span className="block text-[19px] font-semibold tracking-[-0.02em] text-fg">{p.name}</span>
                      <span className="mt-1 line-clamp-2 text-[15px] text-fg-muted">{p.summary}</span>
                    </span>
                    <span className="flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-fg-muted md:justify-end">
                      <span>{PROJECT_STATUS_LABEL[p.status]}</span>
                      <Count n={openTasks("project", p.id)} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <RecordSheet record={record} onClose={() => setRecord(null)} />
    </div>
  );
}
