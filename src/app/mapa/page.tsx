"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useData } from "@/lib/store";
import { PEOPLE } from "@/lib/people";
import { todayISO } from "@/lib/dates";
import { buildGraph, KIND_LABEL, KIND_SINGULAR, type GraphNode, type NodeKind } from "@/lib/graph";
import type { PersonId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GraphView } from "@/components/graph-view";
import { RecordSheet, type RecordRef } from "@/components/record-sheet";
import { PageHeader, inputClass } from "@/components/ui-bits";

const FILTERABLE: NodeKind[] = ["lead", "client", "project", "personal_note", "decision", "post"];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-pill px-4 text-[15px] transition-colors md:min-h-9",
        on ? "bg-lime/12 font-semibold text-fg ring-2 ring-lime-deep ring-inset" : "text-fg-subtle ring-1 ring-line ring-inset hover:text-fg hover:ring-line-strong",
      )}
    >
      {children}
    </button>
  );
}

export default function MapaPage() {
  const { db } = useData();
  const router = useRouter();
  const [kinds, setKinds] = useState<Set<NodeKind>>(new Set(["lead", "client", "project", "personal_note", "decision"]));
  const [person, setPerson] = useState<PersonId | "all">("all");
  const [attention, setAttention] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [record, setRecord] = useState<RecordRef | null>(null);

  const today = todayISO();
  const full = useMemo(() => buildGraph(db, today), [db, today]);

  // Filtros: tipo, pessoa e "precisa de atenção". Pessoas e o centro Lumora sempre ficam.
  const { nodes, edges } = useMemo(() => {
    let ns = full.nodes.filter((n) => n.kind === "hub" || n.kind === "person" || kinds.has(n.kind));
    if (attention) ns = ns.filter((n) => n.kind === "hub" || n.kind === "person" || n.hot);
    let ids = new Set(ns.map((n) => n.id));
    let es = full.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    if (person !== "all") {
      const pid = `person:${person}`;
      const keep = new Set([pid]);
      for (const e of es) {
        if (e.source === pid) keep.add(e.target);
        if (e.target === pid) keep.add(e.source);
      }
      keep.delete("hub");
      ns = ns.filter((n) => keep.has(n.id) && (n.kind !== "person" || n.id === pid));
      ids = new Set(ns.map((n) => n.id));
      es = es.filter((e) => ids.has(e.source) && ids.has(e.target));
    }
    return { nodes: ns, edges: es };
  }, [full, kinds, person, attention]);

  const highlight = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id));
  }, [nodes, query]);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const connections = selected
    ? edges
        .filter((e) => e.source === selected.id || e.target === selected.id)
        .map((e) => nodes.find((n) => n.id === (e.source === selected.id ? e.target : e.source)))
        .filter((n): n is GraphNode => Boolean(n))
    : [];

  function open(n: GraphNode) {
    if (n.kind === "lead" || n.kind === "client" || n.kind === "project") setRecord({ type: n.kind, id: n.refId });
    else if (n.kind === "personal_note") router.push(`/notas?id=${n.refId}`);
    else if (n.kind === "post") router.push("/conteudo");
    else if (n.kind === "decision") router.push("/decisoes");
    else if (n.kind === "person") router.push("/");
  }

  const openLabel: Partial<Record<NodeKind, string>> = {
    lead: "Abrir ficha",
    client: "Abrir ficha",
    project: "Abrir ficha",
    personal_note: "Abrir anotação",
    post: "Ver no calendário",
    decision: "Ver decisões",
  };

  const counts = FILTERABLE.map((k) => [k, full.nodes.filter((n) => n.kind === k).length] as const);
  const hotCount = full.nodes.filter((n) => n.hot).length;

  return (
    <div>
      <PageHeader kicker="Visão geral" title="Mapa" description="Como pessoas, clientes, leads, projetos e anotações se ligam. Toque num ponto para ver as conexões dele." />

      <div className="gutter grid gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="O que mostrar">
          {counts.map(([k, n]) => (
            <Chip
              key={k}
              on={kinds.has(k)}
              onClick={() =>
                setKinds((s) => {
                  const next = new Set(s);
                  if (next.has(k)) next.delete(k);
                  else next.add(k);
                  return next;
                })
              }
            >
              {KIND_LABEL[k]} <span className="font-normal text-fg-subtle">{n}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="De quem">
            <Chip on={person === "all"} onClick={() => setPerson("all")}>
              Todos
            </Chip>
            {PEOPLE.map((p) => (
              <Chip key={p.id} on={person === p.id} onClick={() => setPerson(person === p.id ? "all" : p.id)}>
                {p.short}
              </Chip>
            ))}
          </div>
          <Chip on={attention} onClick={() => setAttention((a) => !a)}>
            Só o que precisa de atenção <span className="font-normal text-fg-subtle">{hotCount}</span>
          </Chip>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no mapa…" aria-label="Buscar no mapa" className={cn(inputClass, "w-full py-2.5 md:ml-auto md:w-64")} />
        </div>

        <div className="on-ink relative overflow-hidden rounded-panel bg-ink">
          <GraphView
            nodes={nodes}
            edges={edges}
            highlight={highlight}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-[clamp(480px,70vh,820px)]"
          />

          {/* Legenda */}
          <ul className="pointer-events-none absolute top-4 left-4 hidden flex-col gap-1.5 text-[12px] text-fog md:flex">
            <li className="flex items-center gap-2">
              <span className="module inline-block size-3 bg-lime" /> Cliente
            </li>
            <li className="flex items-center gap-2">
              <span className="module inline-block size-3 ring-2 ring-lime-glow ring-inset" /> Lead
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-fog" /> Projeto
            </li>
            <li className="flex items-center gap-2">
              <span className="module inline-block size-3 ring-[1.5px] ring-on-ink ring-inset" /> Anotação
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-full shadow-[0_0_8px_rgba(176,245,0,0.9)] ring-2 ring-lime-glow ring-inset" /> Precisa de atenção
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-0 w-4 border-t-2 border-dashed border-lime-glow/70" /> Citado numa anotação
            </li>
          </ul>

          {/* Detalhe do ponto escolhido */}
          {selected && (
            <div className="absolute inset-x-3 bottom-3 max-h-[60%] overflow-y-auto rounded-card bg-ink-raised/95 p-5 shadow-card ring-1 ring-white/12 ring-inset backdrop-blur md:inset-x-auto md:top-4 md:right-4 md:bottom-auto md:w-[320px]">
              <div className="flex items-start justify-between gap-3">
                <p className="kicker">{KIND_SINGULAR[selected.kind]}</p>
                <button onClick={() => setSelectedId(null)} aria-label="Fechar detalhe" className="-m-2 grid size-10 place-items-center rounded-full text-fog hover:text-on-ink">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-on-ink">{selected.label}</h2>
              {selected.detail && <p className="mt-2 line-clamp-4 text-[15px] leading-relaxed text-fog">{selected.detail}</p>}
              {selected.hot && <p className="mt-2 text-[13px] font-semibold text-lime-glow">Precisa de atenção</p>}
              {connections.length > 0 && (
                <>
                  <h3 className="mt-4 text-[13px] font-semibold text-fog-dim">Ligado a {connections.length}</h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {connections.slice(0, 14).map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => setSelectedId(c.id)}
                          className="min-h-9 max-w-[260px] truncate rounded-pill bg-white/[0.06] px-3 text-[13px] text-on-ink ring-1 ring-white/12 ring-inset hover:ring-lime-glow/60"
                        >
                          {c.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {openLabel[selected.kind] && (
                <button onClick={() => open(selected)} className="mt-5 min-h-11 w-full rounded-pill bg-white text-[15px] font-semibold text-ink transition-shadow hover:shadow-glow-lime">
                  {openLabel[selected.kind]}
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-[13px] text-fg-muted">Arraste os pontos, use a roda do mouse ou os botões para aproximar. Linhas mais grossas: mais tarefas em comum.</p>
      </div>

      <RecordSheet record={record} onClose={() => setRecord(null)} />
    </div>
  );
}
