import type { DB } from "./store";
import { PEOPLE } from "./people";
import { extractLinks, linkableTargets, resolveLink } from "./links";
import type { PersonId } from "./types";

export type NodeKind = "hub" | "person" | "lead" | "client" | "project" | "decision" | "post" | "personal_note";

export type GraphNode = {
  id: string;
  kind: NodeKind;
  label: string;
  refId: string;
  /** Atrasado, sem próximo passo ou pendente: aceso em lima no mapa. */
  hot?: boolean;
  owners?: PersonId[];
  detail?: string;
};

export type GraphEdge = { source: string; target: string; kind: "team" | "task" | "link" | "owner" | "converted" | "belongs" | "decides"; weight: number };

export const KIND_LABEL: Record<NodeKind, string> = {
  hub: "Lumora",
  person: "Pessoas",
  lead: "Leads",
  client: "Clientes",
  project: "Projetos",
  decision: "Decisões abertas",
  post: "Posts",
  personal_note: "Anotações",
};

export const KIND_SINGULAR: Record<NodeKind, string> = {
  hub: "Lumora",
  person: "Pessoa",
  lead: "Lead",
  client: "Cliente",
  project: "Projeto",
  decision: "Decisão aberta",
  post: "Post",
  personal_note: "Anotação",
};

const nid =(kind: NodeKind, id: string) => `${kind}:${id}`;

/** Monta pontos e linhas a partir dos dados do HUB. */
export function buildGraph(db: DB, today: string) {
  const nodes: GraphNode[] = [];
  const edges = new Map<string, GraphEdge>();

  const addEdge = (a: string, b: string, kind: GraphEdge["kind"]) => {
    if (a === b) return;
    const key = [a, b].sort().join("|") + kind;
    const e = edges.get(key);
    if (e) e.weight += 1;
    else edges.set(key, { source: a, target: b, kind, weight: 1 });
  };

  const openTasks = db.tasks.filter((t) => !t.done);
  const lateFor = (refType: string, refId: string) => openTasks.some((t) => t.ref_type === refType && t.ref_id === refId && t.due && t.due < today);

  nodes.push({ id: "hub", kind: "hub", label: "Lumora", refId: "hub" });

  for (const p of PEOPLE) {
    const mine = openTasks.filter((t) => t.owners.includes(p.id));
    const late = mine.filter((t) => t.due && t.due < today).length;
    nodes.push({ id: nid("person", p.id), kind: "person", label: p.short, refId: p.id, hot: late > 0, detail: `${p.area}. ${mine.length} ações abertas${late ? `, ${late} atrasadas` : ""}.` });
    addEdge("hub", nid("person", p.id), "team");
  }

  for (const l of db.leads) {
    const open = openTasks.filter((t) => t.ref_type === "lead" && t.ref_id === l.id);
    nodes.push({
      id: nid("lead", l.id),
      kind: "lead",
      label: l.name,
      refId: l.id,
      hot: l.stage !== "perdido" && l.stage !== "fechado" && (open.length === 0 || lateFor("lead", l.id)),
      detail: `${l.front}. ${open.length ? `${open.length} próximos passos.` : "Sem próximo passo."}`,
    });
  }
  for (const c of db.clients) {
    nodes.push({ id: nid("client", c.id), kind: "client", label: c.name, refId: c.id, hot: lateFor("client", c.id), detail: `${c.front}. ${c.delivery || "Entrega não registrada"}.` });
    const lead = db.leads.find((l) => l.name.trim().toLowerCase() === c.name.trim().toLowerCase());
    if (lead) addEdge(nid("lead", lead.id), nid("client", c.id), "converted");
  }
  for (const p of db.projects) {
    nodes.push({ id: nid("project", p.id), kind: "project", label: p.name, refId: p.id, hot: lateFor("project", p.id), detail: p.summary });
    if (p.client_id) addEdge(nid("project", p.id), nid("client", p.client_id), "belongs");
  }
  // No mapa, só o que ainda está para decidir; o histórico fica na tela Decisões.
  for (const d of db.decisions.filter((x) => x.state === "aberta")) {
    nodes.push({ id: nid("decision", d.id), kind: "decision", label: d.title, refId: d.id, hot: d.state === "aberta", detail: d.state === "aberta" ? `Para decidir, ${d.area}.` : `Decidido, ${d.area}.` });
    addEdge("hub", nid("decision", d.id), "decides");
  }
  for (const p of db.posts) {
    nodes.push({ id: nid("post", p.id), kind: "post", label: p.title, refId: p.id, detail: `Semana ${p.week}, ${p.front}, ${p.status}.` });
    if (p.owner) addEdge(nid("person", p.owner), nid("post", p.id), "owner");
  }

  // Tarefas abertas ligam quem faz ao registro.
  for (const t of openTasks) {
    if (!t.ref_type || !t.ref_id) continue;
    const kind = t.ref_type === "client" ? "client" : t.ref_type === "lead" ? "lead" : t.ref_type === "project" ? "project" : t.ref_type === "post" ? "post" : "decision";
    const target = nid(kind, t.ref_id);
    for (const o of t.owners) addEdge(nid("person", o), target, "task");
  }

  // Anotações pessoais: ligam ao dono e a tudo o que citam com [[ ]].
  const targets = linkableTargets(db);
  for (const n of db.personal_notes) {
    nodes.push({ id: nid("personal_note", n.id), kind: "personal_note", label: n.title || "Sem título", refId: n.id, owners: [n.owner], detail: n.shared ? "Anotação compartilhada." : "Anotação pessoal." });
    addEdge(nid("person", n.owner), nid("personal_note", n.id), "owner");
    for (const text of extractLinks(n.body)) {
      const t = resolveLink(text, targets);
      if (!t) continue;
      addEdge(nid("personal_note", n.id), nid(t.kind, t.id), "link");
    }
  }

  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, edges: [...edges.values()].filter((e) => ids.has(e.source) && ids.has(e.target)) };
}
