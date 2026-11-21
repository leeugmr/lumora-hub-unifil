// Funil do Pipeline e insights comerciais.
// "Chegou à etapa" = a etapa mais avançada que o lead já teve (histórico em lead_events, gravado pelo
// gatilho do banco), contando também os perdidos. Percentuais e médias só aparecem com base mínima,
// para não tirar conclusão de um ou dois leads.

import type { Lead, LeadEvent, LeadStage, Task } from "./types";
import { addDays, todayISO } from "./dates";
import { STAGE_LABEL } from "./labels";

export const FUNNEL: LeadStage[] = ["contato", "diagnostico", "proposta", "negociacao", "fechado"];
const OPEN: LeadStage[] = ["contato", "diagnostico", "proposta", "negociacao"];

/** Base mínima para mostrar percentual de conversão ou ranking de origem. */
export const MIN_BASE = 5;
/** Base mínima para mostrar tempo médio numa etapa. */
export const MIN_TIME_BASE = 3;
/** Dias na mesma etapa a partir dos quais o lead conta como parado. */
export const IDLE_DAYS = 7;

const DAY = 86400000;
const idx = (s: LeadStage) => FUNNEL.indexOf(s);

function eventsOf(events: LeadEvent[], leadId: string) {
  return events.filter((e) => e.lead_id === leadId).sort((a, b) => a.at.localeCompare(b.at));
}

/** Etapa mais avançada que o lead já alcançou (0 = Contato). */
export function reachedIndex(lead: Lead, events: LeadEvent[]) {
  const stages = [lead.stage, ...eventsOf(events, lead.id).flatMap((e) => [e.to_stage, e.from_stage])];
  return Math.max(0, ...stages.filter((s): s is LeadStage => !!s && s !== "perdido").map(idx));
}

/** Desde quando o lead está na etapa atual (último evento que o levou até ela; senão, updated_at). */
export function stageSince(lead: Lead, events: LeadEvent[]) {
  const last = eventsOf(events, lead.id).filter((e) => e.to_stage === lead.stage).at(-1);
  return last?.at ?? lead.updated_at;
}

export function daysInStage(lead: Lead, events: LeadEvent[], now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(stageSince(lead, events)).getTime()) / DAY));
}

export type FunnelStep = {
  stage: LeadStage;
  /** Quantos leads chegaram até aqui (inclui quem avançou ou se perdeu depois). */
  reached: number;
  /** Quantos estão nesta etapa agora. */
  now: number;
  /** Perdidos depois de chegar a esta etapa (e não avançar). */
  lost: number;
  /** Dos que já saíram desta etapa, quantos avançaram (0 a 1), se houver base suficiente. */
  conversion: number | null;
  /** Dias médios nesta etapa (quem já saiu e quem ainda está nela), se houver base suficiente. */
  avgDays: number | null;
};

export function funnel(leads: Lead[], events: LeadEvent[], now = Date.now()): FunnelStep[] {
  const reach = new Map(leads.map((l) => [l.id, reachedIndex(l, events)]));
  // Tempo em cada etapa: do evento que entrou até o próximo evento (ou agora, se ainda está nela).
  const durations: Record<string, number[]> = {};
  for (const l of leads) {
    const evs = eventsOf(events, l.id);
    evs.forEach((e, i) => {
      if (e.to_stage === "perdido" || e.to_stage === "fechado") return;
      const end = evs[i + 1]?.at ? new Date(evs[i + 1].at).getTime() : now;
      (durations[e.to_stage] ??= []).push((end - new Date(e.at).getTime()) / DAY);
    });
  }

  return FUNNEL.map((stage, i) => {
    const reached = leads.filter((l) => (reach.get(l.id) ?? 0) >= i).length;
    const next = i < FUNNEL.length - 1 ? leads.filter((l) => (reach.get(l.id) ?? 0) >= i + 1).length : null;
    const lost = leads.filter((l) => l.stage === "perdido" && reach.get(l.id) === i).length;
    const d = durations[stage] ?? [];
    const here = leads.filter((l) => l.stage === stage).length;
    // Conversão só entre quem já saiu da etapa (avançou ou se perdeu); quem ainda está nela não conta.
    const left = reached - here;
    return {
      stage,
      reached,
      now: here,
      lost,
      conversion: next != null && left >= MIN_BASE ? next / left : null,
      avgDays: d.length >= MIN_TIME_BASE ? Math.round(d.reduce((s, x) => s + x, 0) / d.length) : null,
    };
  });
}

/** "Prospecção ativa (análise de Instagram)" → "Prospecção ativa". */
export function sourceGroup(source: string) {
  return source.split(" (")[0].trim() || "Sem origem";
}

export type InsightTone = "danger" | "warn" | "info" | "good";

export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  /** Leads citados (viram atalhos para abrir a ficha). */
  leadIds?: string[];
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const names = (ls: Lead[]) => (ls.length <= 2 ? ls.map((l) => l.name).join(" e ") : `${ls[0].name}, ${ls[1].name} e mais ${ls.length - 2}`);

export function insights(leads: Lead[], events: LeadEvent[], tasks: Task[], today = todayISO(), now = Date.now()): Insight[] {
  const out: Insight[] = [];
  const open = leads.filter((l) => OPEN.includes(l.stage));
  const tasksOf = (l: Lead) => tasks.filter((t) => t.ref_type === "lead" && t.ref_id === l.id && !t.done);

  if (leads.length === 0) {
    return [{ id: "vazio", tone: "info", title: "O funil ainda está vazio", detail: "Cadastre o primeiro lead em Novo lead. A partir daí, o HUB acompanha cada etapa e aponta onde agir." }];
  }

  // 1. Ação: sem próximo passo, próximo passo atrasado.
  const noNext = open.filter((l) => tasksOf(l).length === 0);
  if (noNext.length)
    out.push({ id: "sem-passo", tone: "danger", title: `${plural(noNext.length, "lead", "leads")} sem próximo passo`, detail: `${names(noNext)}. Lead sem ação marcada esfria. Abra a ficha e defina quem faz o quê, e até quando.`, leadIds: noNext.map((l) => l.id) });

  const late = open.filter((l) => tasksOf(l).some((t) => t.due && t.due < today));
  if (late.length)
    out.push({ id: "atrasado", tone: "danger", title: `Próximo passo atrasado em ${plural(late.length, "lead", "leads")}`, detail: `${names(late)}. Faça hoje ou remarque com uma data real.`, leadIds: late.map((l) => l.id) });

  // 2. Ritmo: parado na mesma etapa.
  const idle = open.filter((l) => daysInStage(l, events, now) > IDLE_DAYS).sort((a, b) => daysInStage(b, events, now) - daysInStage(a, events, now));
  if (idle.length) {
    const top = idle[0];
    out.push({
      id: "parado",
      tone: "warn",
      title: idle.length === 1 ? `${top.name} está há ${daysInStage(top, events, now)} dias na mesma etapa` : `${idle.length} leads parados há mais de ${IDLE_DAYS} dias`,
      detail: idle.length === 1 ? "Vale um contato para destravar: uma pergunta direta ou uma proposta de próximo encontro." : `O mais antigo é ${top.name} (${daysInStage(top, events, now)} dias). Priorize quem está mais perto da proposta.`,
      leadIds: idle.map((l) => l.id),
    });
  }

  // 3. Clareza do valor.
  const noValue = open.filter((l) => l.value_estimate == null);
  if (noValue.length)
    out.push({ id: "sem-valor", tone: "warn", title: `${plural(noValue.length, "lead", "leads")} sem valor estimado`, detail: `${noValue.length === open.length ? "Nenhum lead aberto tem valor" : names(noValue)}. Sem uma estimativa, o funil não mostra quanto está em jogo. Um chute por faixa já ajuda.`, leadIds: noValue.map((l) => l.id) });

  // 4. Forma do funil.
  const proposals = open.filter((l) => l.stage === "proposta" || l.stage === "negociacao");
  if (open.length > 0 && proposals.length === 0)
    out.push({ id: "sem-proposta", tone: "info", title: "Nenhuma proposta na rua", detail: "Todos os leads abertos ainda estão em Contato ou Diagnóstico. O que falta para o mais avançado receber uma proposta?" });

  if (open.length > 0 && open.length < 3)
    out.push({ id: "fino", tone: "info", title: open.length === 1 ? "O funil depende de um lead só" : `O funil depende de ${open.length} leads`, detail: `${open.length === 1 ? "Se ele não avançar" : "Se eles não avançarem"}, o funil fica vazio. Vale manter a prospecção rodando em paralelo.` });

  if (open.length >= 4) {
    const crowded = OPEN.map((s) => ({ s, n: open.filter((l) => l.stage === s).length })).sort((a, b) => b.n - a.n)[0];
    if (crowded.n / open.length > 0.5)
      out.push({ id: "gargalo", tone: "warn", title: `Gargalo em ${STAGE_LABEL[crowded.s]}`, detail: `${crowded.n} de ${open.length} leads abertos estão nessa etapa. O que trava a passagem para a próxima?` });
  }

  // 5. Resultado, só com base suficiente.
  const steps = funnel(leads, events, now);
  const drops = steps.filter((s) => s.conversion != null).sort((a, b) => a.conversion! - b.conversion!);
  if (drops.length > 1) {
    const d = drops[0];
    const next = FUNNEL[idx(d.stage) + 1];
    out.push({ id: "queda", tone: "warn", title: `Maior queda: de ${STAGE_LABEL[d.stage]} para ${STAGE_LABEL[next]}`, detail: `Dos leads que já saíram de ${STAGE_LABEL[d.stage]}, ${d.conversion === 0 ? "nenhum avançou" : `só ${Math.round(d.conversion! * 100)}% avançaram`}. É a passagem que mais vale melhorar.` });
  }
  const slow = steps.filter((s) => s.avgDays != null).sort((a, b) => b.avgDays! - a.avgDays!);
  if (slow.length > 1 && slow[0].avgDays! > slow[1].avgDays!)
    out.push({ id: "lenta", tone: "info", title: `${STAGE_LABEL[slow[0].stage]} é a etapa mais lenta`, detail: `Os leads ficam em média ${slow[0].avgDays} dias nela. Encurtar essa espera acelera o funil inteiro.` });

  const lostLeads = leads.filter((l) => l.stage === "perdido");
  const noReason = lostLeads.filter((l) => !l.lost_reason);
  if (noReason.length)
    out.push({ id: "perda-sem-motivo", tone: "warn", title: `${plural(noReason.length, "lead perdido", "leads perdidos")} sem motivo`, detail: `${names(noReason)}. Sem o motivo, não dá para saber o que corrigir. Abra a ficha e escolha um.`, leadIds: noReason.map((l) => l.id) });
  const reasons = lostReasons(lostLeads);
  const withReason = lostLeads.length - noReason.length;
  if (withReason >= 3 && reasons[0][1] > (reasons[1]?.[1] ?? 0))
    out.push({ id: "motivo", tone: "info", title: `Principal motivo de perda: ${reasons[0][0]}`, detail: `${reasons[0][1]} de ${withReason} perdas com motivo. ${REASON_HINT[reasons[0][0]] ?? "Vale olhar esses casos juntos e ver o que se repete."}` });

  const decided = leads.filter((l) => l.stage === "fechado" || l.stage === "perdido");
  if (decided.length >= MIN_BASE) {
    const won = decided.filter((l) => l.stage === "fechado").length;
    out.push({ id: "taxa", tone: "info", title: `Fechamos ${won} de ${decided.length} leads decididos (${Math.round((won / decided.length) * 100)}%)`, detail: "Conta só quem já foi fechado ou perdido." });
  }

  const bySource = new Map<string, Lead[]>();
  leads.forEach((l) => bySource.set(sourceGroup(l.source), [...(bySource.get(sourceGroup(l.source)) ?? []), l]));
  if (leads.length >= MIN_BASE && bySource.size > 1) {
    const ranked = [...bySource.entries()]
      .filter(([, ls]) => ls.length >= 2)
      .map(([src, ls]) => ({ src, n: ls.length, rate: ls.filter((l) => reachedIndex(l, events) >= idx("proposta")).length / ls.length }))
      .sort((a, b) => b.rate - a.rate);
    if (ranked.length > 1 && ranked[0].rate > ranked[1].rate)
      out.push({ id: "origem", tone: "good", title: `${ranked[0].src} é a origem que mais chega à proposta`, detail: `${Math.round(ranked[0].rate * 100)}% dos ${ranked[0].n} leads dessa origem receberam proposta.` });
  } else if (leads.length >= 3 && bySource.size === 1) {
    out.push({ id: "origem-unica", tone: "info", title: `Todos os leads vêm de ${[...bySource.keys()][0]}`, detail: "Depender de um canal só deixa o funil frágil. Vale testar uma segunda origem." });
  }

  // 6. Boa notícia: negociação com passo marcado para os próximos dias.
  const hot = leads.filter((l) => l.stage === "negociacao" && tasksOf(l).some((t) => t.due && t.due >= today && t.due <= addDays(today, 3)));
  if (hot.length)
    out.push({ id: "quente", tone: "good", title: `${plural(hot.length, "lead perto", "leads perto")} de fechar`, detail: `${names(hot)}: em negociação, com passo marcado para os próximos 3 dias.`, leadIds: hot.map((l) => l.id) });

  const order: InsightTone[] = ["danger", "warn", "info", "good"];
  return out.sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone));
}


/** Motivos de perda com contagem, do mais frequente ao menos. */
export function lostReasons(leads: Lead[]): [string, number][] {
  const count = new Map<string, number>();
  leads.filter((l) => l.stage === "perdido" && l.lost_reason).forEach((l) => count.set(l.lost_reason!, (count.get(l.lost_reason!) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1]);
}

/** Uma pergunta para cada motivo: o que dá para fazer diferente. */
const REASON_HINT: Record<string, string> = {
  Preço: "Vale rever como a proposta mostra o valor, ou ter uma opção de entrada.",
  "Sem resposta": "Vale encurtar o tempo até o primeiro retorno e combinar a próxima data na própria conversa.",
  "Escolheu outra opção": "Vale entender o que a outra opção ofereceu e deixar mais clara a diferença da Lumora.",
  "Não era o momento": "Vale marcar uma data para voltar a falar em vez de encerrar.",
  "Fora do perfil da Lumora": "Vale filtrar melhor na prospecção, antes do diagnóstico.",
};
