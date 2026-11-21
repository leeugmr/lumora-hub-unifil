export type PersonId = "leo" | "fab" | "bea" | "fran";

export type Person = {
  id: PersonId;
  name: string;
  short: string;
  area: string;
};

export type Front = "Software" | "Studio" | "Lumora";

export type TaskArea = "comercial" | "clientes" | "conteudo" | "projetos" | "operacao";

export type RefType = "lead" | "client" | "project" | "post" | "decision";

export type Task = {
  id: string;
  title: string;
  owners: PersonId[];
  due: string | null; // AAAA-MM-DD
  done: boolean;
  done_at: string | null;
  area: TaskArea;
  ref_type: RefType | null;
  ref_id: string | null;
  created_at: string;
};

export type ValueKind = "mensal" | "unico";

export type LeadStage = "contato" | "diagnostico" | "proposta" | "negociacao" | "fechado" | "perdido";

export type Lead = {
  id: string;
  name: string;
  front: Front;
  stage: LeadStage;
  source: string;
  summary: string;
  value_estimate: number | null;
  value_kind: ValueKind;
  /** Motivo da perda (um de LOST_REASONS); só quando stage = "perdido". */
  lost_reason?: string | null;
  updated_at: string;
};

export type ClientStatus = "ativo" | "pausado" | "encerrado" | "a confirmar";

export type Client = {
  id: string;
  name: string;
  front: Front;
  status: ClientStatus;
  delivery: string;
  monthly_value: number | null;
  can_publicize: boolean;
  summary: string;
  updated_at: string;
};

export type ProjectStatus = "ideia" | "em andamento" | "aguardando cliente" | "concluido";

export type Project = {
  id: string;
  name: string;
  kind: "interno" | "cliente";
  status: ProjectStatus;
  client_id: string | null;
  summary: string;
  updated_at: string;
};

export type PostStatus = "nao iniciado" | "em producao" | "pronto" | "publicado";

export type Post = {
  id: string;
  cycle: number;
  week: number;
  weekday: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
  front: Front;
  title: string;
  format: string;
  brief: string;
  visual: string;
  channel: string;
  status: PostStatus;
  owner: PersonId | null;
  link: string | null;
  blocked_by: string | null;
};

export type Decision = {
  id: string;
  title: string;
  state: "aberta" | "decidida";
  context: string;
  decided_at: string | null;
  area: string;
};

export type Note = {
  id: string;
  ref_type: RefType;
  ref_id: string;
  body: string;
  author: PersonId | null;
  created_at: string;
};

/** Anotação pessoal: privada do dono, ou compartilhada com a equipe. Aceita [[links]] e checklists. */
export type PersonalNote = {
  id: string;
  owner: PersonId;
  title: string;
  body: string;
  shared: boolean;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ContractStatus = "ativo" | "pausado" | "encerrado";

/** Contrato: o que o cliente paga. Mensal vence todo mês no due_day; único vence em due_date. Valores em reais. */
export type Contract = {
  id: string;
  client_id: string;
  title: string;
  kind: ValueKind;
  amount: number;
  due_day: number | null;
  due_date: string | null;
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  owner: PersonId | null;
  notes: string;
  /** Texto do contrato gerado no HUB (HTML limpo por `sanitizeDoc`), editado na prévia. */
  document?: string | null;
  document_at?: string | null;
  created_at: string;
  updated_at: string;
};

/** Pagamento recebido de uma cobrança (period = AAAA-MM). */
export type Payment = {
  id: string;
  contract_id: string;
  period: string;
  amount: number;
  paid_at: string;
  created_at: string;
};

/** Mudança de etapa de um lead (gravada pelo gatilho do banco; from_stage nulo = lead criado). */
export type LeadEvent = {
  id: string;
  lead_id: string;
  from_stage: LeadStage | null;
  to_stage: LeadStage;
  at: string;
  by_person: string | null;
};

export type Tables = {
  lead_events: LeadEvent;
  contracts: Contract;
  payments: Payment;
  personal_notes: PersonalNote;
  tasks: Task;
  leads: Lead;
  clients: Client;
  projects: Project;
  posts: Post;
  decisions: Decision;
  notes: Note;
};

export type TableName = keyof Tables;
