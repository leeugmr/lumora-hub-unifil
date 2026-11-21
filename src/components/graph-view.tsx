"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { Minus, Plus, Scan } from "lucide-react";
import type { GraphEdge, GraphNode } from "@/lib/graph";
import { cn } from "@/lib/utils";

type SimNode = GraphNode & SimulationNodeDatum;
type SimEdge = Omit<GraphEdge, "source" | "target"> & SimulationLinkDatum<SimNode>;

// O módulo da marca, desenhado numa caixa de 400.
const MODULE = "M20 0H205C313 0 400 88 400 197V382Q400 400 382 400H117C52 400 0 349 0 283V20Q0 0 20 0Z";

const RADIUS: Record<GraphNode["kind"], number> = { hub: 18, person: 19, lead: 13, client: 14, project: 10, decision: 8, post: 5, personal_note: 8 };
const ALWAYS_LABEL = new Set(["hub", "person", "lead", "client", "project"]);

function Module({ size, className, ...rest }: { size: number } & React.SVGProps<SVGPathElement>) {
  return <path d={MODULE} transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 400})`} className={className} {...rest} />;
}

function NodeShape({ n, dim }: { n: GraphNode; dim: boolean }) {
  const glow = n.hot ? "drop-shadow(0 0 6px rgba(176,245,0,0.7))" : undefined;
  const common = { style: { filter: dim ? undefined : glow } };
  switch (n.kind) {
    case "hub":
      return <Module size={34} fill="#b0f500" {...common} />;
    case "person":
      return (
        <>
          <circle r={19} fill="#f2f6fa" stroke={n.hot ? "#c6ff3a" : "none"} strokeWidth={3} {...common} />
          <text textAnchor="middle" dy="0.35em" fontSize={12} fontWeight={700} fill="#070e18">
            {n.label.slice(0, 2)}
          </text>
        </>
      );
    case "lead":
      return <Module size={26} fill={n.hot ? "rgba(176,245,0,0.25)" : "#0f1d2e"} stroke="#c6ff3a" strokeWidth={2 * (400 / 26)} {...common} />;
    case "client":
      return <Module size={28} fill="#b0f500" {...common} />;
    case "project":
      return <circle r={10} fill="#a9b8c9" stroke={n.hot ? "#c6ff3a" : "none"} strokeWidth={2.5} {...common} />;
    case "decision":
      return <Module size={16} fill={n.hot ? "#0f1d2e" : "#6f8399"} stroke={n.hot ? "#c6ff3a" : "none"} strokeWidth={1.8 * (400 / 16)} {...common} />;
    case "post":
      return <circle r={5} fill="#6f8399" />;
    case "personal_note":
      return <Module size={16} fill="#0f1d2e" stroke="#f2f6fa" strokeWidth={1.6 * (400 / 16)} />;
  }
}

export function GraphView({
  nodes,
  edges,
  highlight,
  selectedId,
  onSelect,
  className,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Ids que a busca encontrou; os demais ficam apagados. Vazio = sem busca. */
  highlight: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [, setFrame] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const cache = useRef(new Map<string, { x: number; y: number }>());
  const sim = useRef<Simulation<SimNode, SimEdge> | null>(null);
  const simNodes = useRef<SimNode[]>([]);
  const simEdges = useRef<SimEdge[]>([]);
  const drag = useRef<{ id?: string; startX: number; startY: number; moved: number; panX?: number; panY?: number } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  // Tamanho do quadro.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let first = true;
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
      // No celular, começa um pouco mais afastado para caber o mapa inteiro.
      if (first) {
        first = false;
        if (e.contentRect.width < 640) setView({ x: 0, y: 0, k: 0.7 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Simulação de forças: reaproveita posições anteriores para o mapa não "pular" ao filtrar.
  useEffect(() => {
    const positions = cache.current;
    const ns: SimNode[] = nodes.map((n, i) => {
      const p = positions.get(n.id);
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      return { ...n, x: p?.x ?? Math.cos(angle) * 160, y: p?.y ?? Math.sin(angle) * 160 };
    });
    const es: SimEdge[] = edges.map((e) => ({ ...e }));
    simNodes.current = ns;
    simEdges.current = es;
    sim.current?.stop();
    let raf = 0;
    const s = forceSimulation<SimNode, SimEdge>(ns)
      .force(
        "link",
        forceLink<SimNode, SimEdge>(es)
          .id((d) => d.id)
          .distance((e) => (e.kind === "team" ? 90 : e.kind === "decides" ? 110 : e.kind === "owner" ? 70 : 110))
          .strength((e) => (e.kind === "decides" ? 0.2 : e.kind === "team" ? 0.6 : 0.35)),
      )
      .force("charge", forceManyBody<SimNode>().strength((d) => (d.kind === "hub" || d.kind === "person" ? -520 : d.kind === "post" ? -60 : d.kind === "decision" ? -110 : -220)))
      .force("center", forceCenter(0, 0).strength(0.05))
      .force("collide", forceCollide<SimNode>((d) => RADIUS[d.kind] + 10))
      .alpha(positions.size ? 0.4 : 1)
      .on("tick", () => {
        if (!raf)
          raf = requestAnimationFrame(() => {
            raf = 0;
            setFrame((f) => f + 1);
          });
      })
      .on("end", () => {
        for (const n of ns) positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
      });
    sim.current = s;
    return () => {
      s.stop();
      cancelAnimationFrame(raf);
      for (const n of ns) positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
    };
  }, [nodes, edges]);

  // Zoom com a roda do mouse, em volta do cursor.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = svg.getBoundingClientRect();
      const v = viewRef.current;
      const k = Math.min(3, Math.max(0.35, v.k * Math.exp(-ev.deltaY * 0.0015)));
      const cx = ev.clientX - rect.left - rect.width / 2;
      const cy = ev.clientY - rect.top - rect.height / 2;
      setView({ k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const neighbors = useMemo(() => {
    const focus = hover ?? selectedId;
    if (!focus) return null;
    const set = new Set([focus]);
    for (const e of edges) {
      if (e.source === focus) set.add(e.target);
      if (e.target === focus) set.add(e.source);
    }
    return set;
  }, [edges, hover, selectedId]);

  const toGraph = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - rect.width / 2 - view.x) / view.k, y: (clientY - rect.top - rect.height / 2 - view.y) / view.k };
  };

  function onPointerDown(ev: React.PointerEvent, id?: string) {
    ev.stopPropagation();
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    drag.current = { id, startX: ev.clientX, startY: ev.clientY, moved: 0, panX: view.x, panY: view.y };
    if (id) {
      const n = simNodes.current.find((s) => s.id === id);
      if (n) {
        n.fx = n.x;
        n.fy = n.y;
      }
      sim.current?.alphaTarget(0.25).restart();
    }
  }

  function onPointerMove(ev: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    d.moved = Math.max(d.moved, Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY));
    if (d.id) {
      const n = simNodes.current.find((s) => s.id === d.id);
      if (n) {
        const p = toGraph(ev.clientX, ev.clientY);
        n.fx = p.x;
        n.fy = p.y;
      }
    } else {
      setView((v) => ({ ...v, x: (d.panX ?? 0) + ev.clientX - d.startX, y: (d.panY ?? 0) + ev.clientY - d.startY }));
    }
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.id) {
      const n = simNodes.current.find((s) => s.id === d.id);
      if (n) {
        n.fx = null;
        n.fy = null;
      }
      sim.current?.alphaTarget(0);
      if (d.moved < 5) onSelect(d.id === selectedId ? null : d.id);
    } else if (d.moved < 5) {
      onSelect(null);
    }
  }

  const zoomBy = (f: number) => setView((v) => ({ x: v.x * f, y: v.y * f, k: Math.min(3, Math.max(0.35, v.k * f)) }));
  const searching = highlight.size > 0;

  return (
    <div ref={wrap} className={cn("relative overflow-hidden", className)}>
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="block touch-none select-none"
        role="group"
        aria-label={`Mapa com ${nodes.length} pontos e ${edges.length} ligações`}
        onPointerDown={(e) => onPointerDown(e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <pattern id="grade" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="rgba(214,228,243,0.04)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={size.w} height={size.h} fill="url(#grade)" />
        <g transform={`translate(${size.w / 2 + view.x} ${size.h / 2 + view.y}) scale(${view.k})`}>
          {simEdges.current.map((e, i) => {
            const s = e.source as SimNode;
            const t = e.target as SimNode;
            if (typeof s !== "object" || typeof t !== "object") return null;
            const on = neighbors ? neighbors.has(s.id) && neighbors.has(t.id) : !searching;
            const lime = e.kind === "link" || e.kind === "converted";
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={on && (neighbors || lime) ? "#c6ff3a" : "#d6e4f3"}
                strokeOpacity={on ? (neighbors ? 0.75 : lime ? 0.45 : e.kind === "decides" ? 0.07 : 0.16) : 0.04}
                strokeWidth={(e.kind === "task" ? 1 + Math.min(e.weight, 4) * 0.5 : 1) / Math.sqrt(view.k)}
                strokeDasharray={e.kind === "link" ? "4 4" : undefined}
              />
            );
          })}
          {simNodes.current.map((n) => {
            const dim = neighbors ? !neighbors.has(n.id) : searching && !highlight.has(n.id);
            const showLabel = !dim && (ALWAYS_LABEL.has(n.kind) || view.k > 1.4 || n.id === selectedId || n.id === hover || (neighbors?.has(n.id) ?? false) || highlight.has(n.id));
            const selected = n.id === selectedId;
            const label = n.label.length > 34 ? n.label.slice(0, 32) + "…" : n.label;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                opacity={dim ? 0.18 : 1}
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-label={`${n.label}${n.hot ? ", precisa de atenção" : ""}`}
                aria-pressed={selected}
                onPointerDown={(e) => onPointerDown(e, n.id)}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(selected ? null : n.id);
                  }
                }}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover((h) => (h === n.id ? null : h))}
              >
                {selected && <circle r={RADIUS[n.kind] + 9} fill="none" stroke="#c6ff3a" strokeWidth={2} strokeOpacity={0.9} />}
                <NodeShape n={n} dim={dim} />
                {showLabel && (
                  <text
                    y={RADIUS[n.kind] + 15}
                    textAnchor="middle"
                    fontSize={n.kind === "person" || n.kind === "hub" ? 13 : 11.5}
                    fontWeight={n.kind === "person" || n.kind === "hub" || n.kind === "client" ? 600 : 500}
                    fill={n.kind === "person" || n.kind === "hub" || selected ? "#f2f6fa" : "#a9b8c9"}
                    stroke="#070e18"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
        {(
          [
            [Plus, "Aproximar", () => zoomBy(1.25)],
            [Minus, "Afastar", () => zoomBy(0.8)],
            [Scan, "Centralizar", () => setView({ x: 0, y: 0, k: 1 })],
          ] as const
        ).map(([Icon, label, fn]) => (
          <button
            key={label}
            onClick={fn}
            aria-label={label}
            title={label}
            className="grid size-11 place-items-center rounded-full bg-white/[0.08] text-on-ink ring-1 ring-white/15 ring-inset backdrop-blur hover:bg-white/[0.14]"
          >
            <Icon className="size-[18px]" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
