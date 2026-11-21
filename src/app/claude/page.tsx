"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { PEOPLE, PERSON } from "@/lib/people";
import { shortDate } from "@/lib/dates";
import { linkableTargets, type LinkTarget } from "@/lib/links";
import { briefings, countTasks, splitByPerson } from "@/lib/briefing";
import { cn } from "@/lib/utils";
import { NoteBody } from "@/components/note-body";
import { RecordSheet, type RecordRef } from "@/components/record-sheet";
import { Avatar } from "@/components/brand";
import { EmptyState } from "@/components/ui-bits";

function Card({ title, meta, children, className }: { title: string; meta?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-panel bg-raised p-6 shadow-card ring-1 ring-line ring-inset md:p-8", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[24px] font-semibold tracking-[-0.03em]">{title}</h2>
        {meta && <span className="text-[13px] text-fg-subtle">{meta}</span>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ClaudePage() {
  const { db, me } = useData();
  const router = useRouter();
  const [record, setRecord] = useState<RecordRef | null>(null);
  const targets = useMemo(() => linkableTargets(db), [db]);
  const { hoje, hojeFresh, latestResumo, resumos } = briefings(db);
  const split = hojeFresh ? splitByPerson(hojeFresh) : null;

  function open(t: LinkTarget) {
    if (t.kind === "lead" || t.kind === "client" || t.kind === "project") setRecord({ type: t.kind, id: t.id });
    else if (t.kind === "personal_note") router.push(`/notas?id=${t.id}`);
    else if (t.kind === "post") router.push("/conteudo");
    else if (t.kind === "decision") router.push("/decisoes");
  }

  const order = me ? [me, ...PEOPLE.map((p) => p.id).filter((id) => id !== me)] : PEOPLE.map((p) => p.id);

  return (
    <div>
      {/* Apresentação: o Claude como alguém da equipe */}
      <section className="md:gutter md:pt-8">
        <div className="on-ink bg-ink px-5 pt-8 pb-10 text-on-ink md:rounded-panel md:px-12 md:pt-12 md:pb-12">
          <p className="kicker">Assistente de operação</p>
          <h1 className="mt-5 text-[clamp(40px,4.5vw,64px)] leading-[1.04] font-medium tracking-[-0.04em] text-on-ink">
            Briefing do Claude.
            <br />
            <span className="text-lime-glow">O que precisa de vocês.</span>
          </h1>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-fog">
            Todo dia útil às 7h30 eu leio o HUB e deixo aqui o que vence e o que atrasou para cada um. Às segundas, às 8h, entra também o resumo da semana. Não invento nada: tudo vem das tarefas, leads, posts e decisões que vocês registram.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-fog-dim">
            <span>Último briefing: {hoje ? shortDate(hoje.updated_at) : "ainda não houve"}</span>
            <span>Último resumo: {latestResumo ? shortDate(latestResumo.updated_at) : "ainda não houve"}</span>
          </div>
        </div>
      </section>

      <div className="gutter grid max-w-[1100px] gap-6 pt-8">
        {/* Briefing do dia */}
        <Card title="Hoje" meta={split?.title}>
          {!split ? (
            <EmptyState>O briefing de hoje ainda não saiu. Ele chega nos dias úteis às 7h30.</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {order.map((id) => {
                const text = split.sections[id];
                const mine = id === me;
                const n = countTasks(text);
                return (
                  <div
                    key={id}
                    className={cn(
                      "rounded-card p-5 ring-1 ring-line ring-inset",
                      mine && "bg-lime/[0.06] ring-2 ring-lime-deep md:col-span-2",
                    )}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar id={id} className="size-9 text-xs" />
                      <div>
                        <p className="font-semibold text-fg">{mine ? `Você, ${PERSON[id].short}` : PERSON[id].short}</p>
                        <p className="text-[13px] text-fg-muted">{n === 0 ? "Nada para hoje" : `${n} ${n === 1 ? "item" : "itens"}`}</p>
                      </div>
                    </div>
                    <NoteBody body={text || "Nada vence hoje."} targets={targets} onOpen={open} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Resumo da semana */}
        <Card title="Resumo da semana" meta={latestResumo ? latestResumo.title.replace("Resumo da semana, ", "Publicado em ") : undefined}>
          {latestResumo ? (
            <NoteBody body={latestResumo.body.replace(/^# .*\n?/, "")} targets={targets} onOpen={open} />
          ) : (
            <EmptyState>O primeiro resumo sai na próxima segunda, às 8h.</EmptyState>
          )}
        </Card>

        {resumos.length > 1 && (
          <section aria-labelledby="anteriores">
            <h2 id="anteriores" className="text-[19px] font-semibold tracking-[-0.02em]">
              Resumos anteriores
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {resumos.slice(1).map((r) => (
                <li key={r.id}>
                  <Link href={`/notas?id=${r.id}`} className="inline-flex min-h-11 items-center rounded-pill px-4 text-[15px] text-fg ring-1 ring-line-strong ring-inset hover:bg-surface-2">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[13px] leading-relaxed text-fg-muted">
          Quer algo diferente no briefing? Peça ao Leo no Claude Code: dá para mudar o horário, incluir outras informações ou criar novos relatórios.
        </p>
      </div>

      <RecordSheet record={record} onClose={() => setRecord(null)} />
    </div>
  );
}
