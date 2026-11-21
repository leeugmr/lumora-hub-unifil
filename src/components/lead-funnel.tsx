"use client";

import { AlertCircle, ArrowDown, Clock, Lightbulb, TrendingUp } from "lucide-react";
import { useData } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/labels";
import { MIN_BASE, funnel, insights, type InsightTone } from "@/lib/funnel";
import { cn } from "@/lib/utils";

/** Opacidade do lima por etapa: o funil "apaga" conforme afunila. */
const FILL = [1, 0.82, 0.66, 0.52, 0.4];

/** Funil visual (painel escuro): quantos chegaram a cada etapa, quantos estão nela agora e conversão. */
export function FunnelPanel() {
  const { db } = useData();
  const steps = funnel(db.leads, db.lead_events);
  const top = Math.max(1, steps[0].reached);
  const lostTotal = db.leads.filter((l) => l.stage === "perdido").length;
  const hasConversion = steps.some((s) => s.conversion != null);

  return (
    <section aria-labelledby="funil" className="on-ink rounded-panel bg-ink p-5 text-on-ink md:p-7">
      <p className="kicker">Funil</p>
      <h2 id="funil" className="mt-3 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-on-ink">
        Até onde os leads chegam
      </h2>
      <p className="mt-1 text-[15px] text-fog">
        {db.leads.length === 0 ? "Nenhum lead ainda." : `${db.leads.length} ${db.leads.length === 1 ? "lead" : "leads"} no total${lostTotal ? `, ${lostTotal} ${lostTotal === 1 ? "perdido" : "perdidos"}` : ""}.`}
      </p>

      <ol className="mt-6 grid gap-1">
        {steps.map((s, i) => {
          const width = s.reached === 0 ? 0 : Math.max(12, (s.reached / top) * 100);
          return (
            <li key={s.stage}>
              {i > 0 && steps[i - 1].conversion != null && (
                <p className="flex items-center justify-center gap-1 py-0.5 text-[13px] font-medium text-fog tabular-nums">
                  <ArrowDown className="size-3.5" aria-hidden />
                  {Math.round(steps[i - 1].conversion! * 100)}% avançaram
                </p>
              )}
              <div className="grid grid-cols-[100px_1fr] items-center gap-3 md:grid-cols-[132px_1fr]">
                <div className="min-w-0">
                  <p className="text-[15px] leading-tight font-semibold">{STAGE_LABEL[s.stage]}</p>
                  <p className="text-[13px] text-fog-dim tabular-nums">
                    {s.stage === "fechado" ? `${s.now} ${s.now === 1 ? "fechado" : "fechados"}` : `${s.now} agora`}
                    {s.avgDays != null && ` · média ${s.avgDays}d`}
                  </p>
                </div>
                <div className="relative flex h-11 items-center justify-center pr-8">
                  {width === 0 ? (
                    <span className="h-full w-[12%] rounded-sm border border-dashed border-white/20" aria-hidden />
                  ) : (
                    <span
                      className="flex h-full items-center justify-center rounded-sm text-[15px] font-semibold text-navy tabular-nums transition-[width] duration-500 ease-lumora"
                      style={{ width: `${width}%`, backgroundColor: `rgba(176, 245, 0, ${FILL[i]})` }}
                      aria-hidden
                    >
                      {s.reached}
                    </span>
                  )}
                  <span className="sr-only">
                    {s.reached} {s.reached === 1 ? "lead chegou" : "leads chegaram"} a {STAGE_LABEL[s.stage]}, {s.now} nesta etapa agora
                    {s.lost ? `, ${s.lost} perdido${s.lost === 1 ? "" : "s"} aqui` : ""}.
                  </span>
                  {s.lost > 0 && (
                    <span className="absolute right-0 text-[13px] font-medium text-fog tabular-nums" aria-hidden>
                      −{s.lost}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 border-t border-white/10 pt-4 text-[13px] leading-relaxed text-fog-dim">
        A barra conta quem chegou à etapa, mesmo que tenha avançado ou se perdido depois; “−” são os perdidos ali. O percentual conta só quem já saiu da etapa, e “média” é quanto tempo os leads ficam nela.
        {!hasConversion && ` Os percentuais aparecem quando pelo menos ${MIN_BASE} leads já tiverem saído de uma etapa.`} O histórico de etapas começou em 17/11/2026.
      </p>
    </section>
  );
}

const TONE: Record<InsightTone, { icon: typeof AlertCircle; label: string; className: string }> = {
  danger: { icon: AlertCircle, label: "Agir agora", className: "text-danger" },
  warn: { icon: Clock, label: "Atenção", className: "text-warn" },
  info: { icon: Lightbulb, label: "Leitura", className: "text-fg-muted" },
  good: { icon: TrendingUp, label: "Bom sinal", className: "text-accent-text" },
};

/** Insights comerciais: o que fazer agora, calculado a partir dos leads, tarefas e histórico. */
export function InsightList({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { db } = useData();
  const list = insights(db.leads, db.lead_events, db.tasks);
  const leadName = (id: string) => db.leads.find((l) => l.id === id)?.name ?? "Lead";

  return (
    <section aria-labelledby="insights" className="rounded-panel bg-surface-2 p-5 md:p-7">
      <p className="kicker">Insights</p>
      <h2 id="insights" className="mt-3 text-[22px] leading-tight font-semibold tracking-[-0.02em]">
        O que o funil está dizendo
      </h2>
      {list.length === 0 ? (
        <p className="mt-4 text-[15px] text-fg-muted">Tudo em dia: todo lead tem próximo passo, valor e ritmo. Bom trabalho.</p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {list.map((ins) => {
            const tone = TONE[ins.tone];
            const Icon = tone.icon;
            return (
              <li key={ins.id} className="rounded-card bg-raised p-4 shadow-card ring-1 ring-line ring-inset">
                <p className={cn("flex items-center gap-1.5 text-[13px] font-semibold", tone.className)}>
                  <Icon className="size-4" aria-hidden />
                  {tone.label}
                </p>
                <p className="mt-1.5 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-fg">{ins.title}</p>
                <p className="mt-1 text-[15px] leading-snug text-fg-muted">{ins.detail}</p>
                {ins.leadIds && ins.leadIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ins.leadIds.slice(0, 4).map((id) => (
                      <button
                        key={id}
                        onClick={() => onOpenLead(id)}
                        className="min-h-11 rounded-pill px-3.5 text-[15px] font-medium text-fg ring-1 ring-line-strong ring-inset transition-shadow hover:ring-2 hover:ring-lime-deep md:min-h-9"
                      >
                        Abrir {leadName(id)}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
