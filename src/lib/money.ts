// Dinheiro: cobranças geradas a partir dos contratos.
// Mensal: uma cobrança por mês (period AAAA-MM), vencendo no due_day, do início até o fim (ou até hoje).
// Único: uma cobrança só, vencendo em due_date. Pago = existe um pagamento com o mesmo contrato e period.
// A Edge Function supabase/functions/notify usa a mesma regra para o aviso das 7h.

import type { Contract, Lead, Payment, ValueKind } from "./types";
import { todayISO } from "./dates";

export type ChargeState = "pago" | "atrasado" | "hoje" | "aberto";

export type Charge = {
  key: string;
  contract: Contract;
  period: string;
  due: string;
  amount: number;
  payment: Payment | undefined;
  state: ChargeState;
};

const LOOKBACK_MONTHS = 12;

function lastDay(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

export function periodOf(iso: string) {
  return iso.slice(0, 7);
}

export function addMonths(period: string, n: number) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dueIn(period: string, day: number) {
  const [y, m] = period.split("-").map(Number);
  return `${period}-${String(Math.min(day, lastDay(y, m))).padStart(2, "0")}`;
}

/** Todas as cobranças até o mês `until` (inclusive), dos contratos ativos. */
export function charges(contracts: Contract[], payments: Payment[], today = todayISO(), until = periodOf(today)): Charge[] {
  const paid = new Map(payments.map((p) => [`${p.contract_id}|${p.period}`, p]));
  const out: Charge[] = [];
  const push = (c: Contract, period: string, due: string) => {
    const payment = paid.get(`${c.id}|${period}`);
    const state: ChargeState = payment ? "pago" : due < today ? "atrasado" : due === today ? "hoje" : "aberto";
    out.push({ key: `${c.id}|${period}`, contract: c, period, due, amount: payment?.amount ?? c.amount, payment, state });
  };

  for (const c of contracts) {
    if (c.status !== "ativo") continue;
    if (c.kind === "unico") {
      const due = c.due_date ?? c.start_date;
      if (periodOf(due) <= until) push(c, periodOf(due), due);
      continue;
    }
    const floor = addMonths(periodOf(today), -LOOKBACK_MONTHS + 1);
    let p = periodOf(c.start_date) < floor ? floor : periodOf(c.start_date);
    const end = c.end_date ? periodOf(c.end_date) : until;
    while (p <= until && p <= end) {
      const due = dueIn(p, c.due_day ?? 10);
      if (due >= c.start_date && (!c.end_date || due <= c.end_date)) push(c, p, due);
      p = addMonths(p, 1);
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

/** Receita recorrente: soma dos contratos mensais ativos. */
export function mrr(contracts: Contract[]) {
  return contracts.filter((c) => c.status === "ativo" && c.kind === "mensal").reduce((s, c) => s + c.amount, 0);
}

export const OPEN_STAGES = ["contato", "diagnostico", "proposta", "negociacao"] as const;

/** Soma de valores dos leads, separada em mensal e único. */
export function funnelValue(leads: Lead[]) {
  const sum = (kind: ValueKind) => leads.filter((l) => l.value_kind === kind).reduce((s, l) => s + (l.value_estimate ?? 0), 0);
  return { mensal: sum("mensal"), unico: sum("unico"), semValor: leads.filter((l) => l.value_estimate == null).length };
}

export function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** "R$ 1.500/mês + R$ 3.000" (ou só uma parte, ou "R$ 0"). */
export function funnelText(v: { mensal: number; unico: number }) {
  const parts = [];
  if (v.mensal) parts.push(`${money(v.mensal)}/mês`);
  if (v.unico) parts.push(money(v.unico));
  return parts.length ? parts.join(" + ") : money(0);
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export function periodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}
