"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { dueLabel, newId, shortDate, todayISO } from "@/lib/dates";
import { charges, money, mrr, periodLabel, periodOf, type Charge } from "@/lib/money";
import type { Contract, ContractStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContractDialog, STATUS_LABEL, contractTerms } from "@/components/contracts";
import { Avatars } from "@/components/brand";
import { ActionButton, EmptyState, PageHeader, QuietButton, SecondaryButton, SectionTitle, Segmented } from "@/components/ui-bits";

export default function DinheiroPage() {
  const { db } = useData();
  const [view, setView] = useState<"cobrancas" | "contratos">("cobrancas");
  const [editing, setEditing] = useState<Contract | "new" | null>(null);
  const today = todayISO();
  const month = periodOf(today);

  const all = useMemo(() => charges(db.contracts, db.payments, today), [db.contracts, db.payments, today]);
  const late = all.filter((c) => c.state === "atrasado");
  const thisMonth = all.filter((c) => c.period === month && c.state !== "atrasado");
  const received = db.payments.filter((p) => periodOf(p.paid_at) === month).reduce((s, p) => s + p.amount, 0);
  const toReceive = thisMonth.filter((c) => !c.payment).reduce((s, c) => s + c.amount, 0);
  const lateSum = late.reduce((s, c) => s + c.amount, 0);
  const recurring = mrr(db.contracts);
  const activeMonthly = db.contracts.filter((c) => c.status === "ativo" && c.kind === "mensal").length;

  return (
    <div>
      <PageHeader
        kicker="Dinheiro"
        title="Contratos e mensalidades"
        description="Quem paga quanto, quando vence e o que já entrou."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dinheiro/contrato"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-pill px-5 text-[15px] font-semibold text-fg ring-1 ring-line-strong ring-inset transition-colors hover:bg-surface-2"
            >
              <FileText className="size-4" aria-hidden /> Gerar contrato
            </Link>
            <ActionButton onClick={() => setEditing("new")} icon={<Plus className="size-4" strokeWidth={2.6} aria-hidden />}>
              Novo contrato
            </ActionButton>
          </div>
        }
      />

      <div className="gutter max-w-[960px]">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Receita recorrente" value={`${money(recurring)}/mês`} hint={`${activeMonthly} ${activeMonthly === 1 ? "contrato mensal" : "contratos mensais"}`} />
          <Tile label={`Recebido em ${periodLabel(month).split(" ")[0]}`} value={money(received)} />
          <Tile label="Falta receber no mês" value={money(toReceive)} />
          <Tile label="Em atraso" value={money(lateSum)} hint={late.length ? `${late.length} ${late.length === 1 ? "cobrança" : "cobranças"}` : "Nada atrasado"} danger={late.length > 0} />
        </dl>

        <div className="mt-10">
          <Segmented
            label="Visão"
            value={view}
            onChange={setView}
            options={[
              ["cobrancas", "Cobranças"],
              ["contratos", "Contratos"],
            ]}
          />
        </div>

        {db.contracts.length === 0 ? (
          <div className="mt-6">
            <EmptyState>
              Nenhum contrato ainda. Toque em <strong className="font-semibold text-fg">Novo contrato</strong> para registrar o que cada cliente paga.
            </EmptyState>
          </div>
        ) : view === "cobrancas" ? (
          <div className="mt-6 grid gap-10">
            {late.length > 0 && (
              <section aria-labelledby="late">
                <SectionTitle id="late" count={late.length} tone="danger">
                  Atrasadas
                </SectionTitle>
                <ul>
                  {late.map((c) => (
                    <ChargeRow key={c.key} charge={c} showPeriod />
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="month">
              <SectionTitle id="month" count={thisMonth.length}>
                <span className="first-letter:uppercase">{periodLabel(month)}</span>
              </SectionTitle>
              {thisMonth.length === 0 ? (
                <p className="py-3 text-[15px] text-fg-muted">Nenhuma cobrança neste mês.</p>
              ) : (
                <ul>
                  {thisMonth.map((c) => (
                    <ChargeRow key={c.key} charge={c} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <ContractList onOpen={setEditing} />
        )}
      </div>

      <ContractDialog contract={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Tile({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-card bg-raised p-4 shadow-card ring-1 ring-line ring-inset">
      <dt className="text-[13px] text-fg-muted">{label}</dt>
      <dd className={cn("mt-1 text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums", danger && "text-danger")}>{value}</dd>
      {hint && <dd className="mt-1 text-[13px] text-fg-subtle">{hint}</dd>}
    </div>
  );
}

function useClientName() {
  const { db } = useData();
  return (id: string) => db.clients.find((c) => c.id === id)?.name ?? "Cliente removido";
}

function ChargeRow({ charge, showPeriod }: { charge: Charge; showPeriod?: boolean }) {
  const { insert, remove } = useData();
  const clientName = useClientName();
  const c = charge.contract;
  const name = clientName(c.client_id);

  function markPaid() {
    const id = newId("pay");
    insert("payments", { id, contract_id: c.id, period: charge.period, amount: charge.amount, paid_at: todayISO(), created_at: new Date().toISOString() });
    toast.success("Pagamento registrado", {
      description: `${name}, ${money(charge.amount)}`,
      action: { label: "Desfazer", onClick: () => remove("payments", id) },
    });
  }

  const stateText =
    charge.state === "pago"
      ? `Pago em ${shortDate(charge.payment!.paid_at + "T12:00:00")}`
      : charge.state === "atrasado"
        ? `Atrasada, venceu ${dueLabel(charge.due).toLowerCase()}`
        : charge.state === "hoje"
          ? "Vence hoje"
          : `Vence ${dueLabel(charge.due).toLowerCase()}`;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-base leading-snug font-medium text-fg">
          {name}
          {c.title && <span className="font-normal text-fg-muted">, {c.title}</span>}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-fg-muted">
          <span
            className={cn(
              charge.state === "atrasado" && "font-semibold text-danger",
              charge.state === "hoje" && "font-semibold text-accent-text",
              charge.state === "pago" && "text-fg-subtle",
            )}
          >
            {stateText}
          </span>
          {showPeriod && <span>{periodLabel(charge.period)}</span>}
        </p>
      </div>
      <span className={cn("text-base font-semibold tabular-nums", charge.state === "pago" && "text-fg-subtle")}>{money(charge.amount)}</span>
      {c.owner && <Avatars ids={[c.owner]} />}
      {charge.payment ? (
        <QuietButton onClick={() => remove("payments", charge.payment!.id)} aria-label={`Desfazer pagamento de ${name}`}>
          Desfazer
        </QuietButton>
      ) : (
        <SecondaryButton onClick={markPaid} aria-label={`Marcar como recebido: ${name}, ${money(charge.amount)}`}>
          Recebido
        </SecondaryButton>
      )}
    </li>
  );
}

function ContractList({ onOpen }: { onOpen: (c: Contract) => void }) {
  const { db } = useData();
  const clientName = useClientName();
  const groups: ContractStatus[] = ["ativo", "pausado", "encerrado"];
  return (
    <div className="mt-6 grid gap-10">
      {groups.map((status) => {
        const list = db.contracts.filter((c) => c.status === status).sort((a, b) => clientName(a.client_id).localeCompare(clientName(b.client_id)));
        if (list.length === 0) return null;
        return (
          <section key={status} aria-labelledby={`ct-${status}`}>
            <SectionTitle id={`ct-${status}`} count={list.length}>
              {STATUS_LABEL[status]}
            </SectionTitle>
            <ul>
              {list.map((c) => (
                <li key={c.id} className="border-b border-line last:border-b-0">
                  <button onClick={() => onOpen(c)} className="flex w-full items-center gap-4 rounded-sm py-4 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block text-base leading-snug font-medium text-fg">
                        {clientName(c.client_id)}
                        {c.title && <span className="font-normal text-fg-muted">, {c.title}</span>}
                      </span>
                      <span className="mt-1 block text-[13px] text-fg-muted">
                        {contractTerms(c)}
                        {c.document && <span className="text-fg-subtle">, contrato gerado</span>}
                      </span>
                    </span>
                    {c.owner && <Avatars ids={[c.owner]} />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

