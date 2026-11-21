import type { ClientStatus, LeadStage, PostStatus, ProjectStatus, TaskArea } from "./types";

export const LEAD_STAGES: { id: LeadStage; label: string }[] = [
  { id: "contato", label: "Contato" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

/** Motivos de perda: lista fixa para dar para somar e comparar. Detalhes vão no resumo ou numa anotação. */
export const LOST_REASONS = ["Preço", "Sem resposta", "Escolheu outra opção", "Não era o momento", "Fora do perfil da Lumora", "Outro"] as const;

export const STAGE_LABEL = Object.fromEntries(LEAD_STAGES.map((s) => [s.id, s.label])) as Record<LeadStage, string>;

export const AREAS: { id: TaskArea; label: string }[] = [
  { id: "comercial", label: "Comercial" },
  { id: "clientes", label: "Clientes" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "projetos", label: "Projetos" },
  { id: "operacao", label: "Operação" },
];

export const AREA_LABEL = Object.fromEntries(AREAS.map((a) => [a.id, a.label])) as Record<TaskArea, string>;

export const POST_STATUSES: { id: PostStatus; label: string }[] = [
  { id: "nao iniciado", label: "Não iniciado" },
  { id: "em producao", label: "Em produção" },
  { id: "pronto", label: "Pronto" },
  { id: "publicado", label: "Publicado" },
];

export const POST_STATUS_LABEL = Object.fromEntries(POST_STATUSES.map((s) => [s.id, s.label])) as Record<PostStatus, string>;

export const CLIENT_STATUSES: ClientStatus[] = ["ativo", "a confirmar", "pausado", "encerrado"];
export const PROJECT_STATUSES: ProjectStatus[] = ["ideia", "em andamento", "aguardando cliente", "concluido"];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ideia: "Ideia",
  "em andamento": "Em andamento",
  "aguardando cliente": "Aguardando cliente",
  concluido: "Concluído",
};

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  "a confirmar": "A confirmar",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export const WEEKDAY_LABEL = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" } as const;

export function brl(n: number | null) {
  if (n == null) return "Sem valor";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
