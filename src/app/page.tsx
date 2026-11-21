"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { briefings, countTasks, splitByPerson } from "@/lib/briefing";
import { useData } from "@/lib/store";
import { PEOPLE, PERSON } from "@/lib/people";
import { addDays, greeting, longDate, todayISO } from "@/lib/dates";
import type { PersonId, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskComposer, TaskRow } from "@/components/tasks";
import { Avatar } from "@/components/brand";
import { ClockWeather, TechNews } from "@/components/world";
import { AgendaBlock, useAgenda } from "@/components/agenda";
import { charges, money } from "@/lib/money";
import { EmptyState, SectionTitle, Segmented } from "@/components/ui-bits";

function byDue(a: Task, b: Task) {
  return (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.created_at.localeCompare(b.created_at);
}

function group(tasks: Task[], today: string) {
  const week = addDays(today, 7);
  const open = tasks.filter((t) => !t.done).sort(byDue);
  return [
    { key: "late", title: "Atrasadas", items: open.filter((t) => t.due && t.due < today) },
    { key: "today", title: "Hoje", items: open.filter((t) => t.due === today) },
    { key: "week", title: "Próximos 7 dias", items: open.filter((t) => t.due && t.due > today && t.due <= week) },
    { key: "later", title: "Mais adiante", items: open.filter((t) => t.due && t.due > week) },
    { key: "nodue", title: "Sem prazo", items: open.filter((t) => !t.due) },
  ];
}

/** Trilho de encaixe: um módulo por tarefa do dia; as concluídas se encaixam em lima. */
function Rail({ total, done }: { total: number; done: number }) {
  if (total === 0) return <p className="mt-8 text-[15px] text-fog">Nada vence hoje. Dê um prazo ao que estiver sem data.</p>;
  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2" role="img" aria-label={`${done} de ${total} tarefas de hoje concluídas`}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={cn("module size-7 md:size-8", i < done ? "module-done bg-lime shadow-[0_0_18px_rgba(176,245,0,0.45)]" : "bg-white/[0.08] ring-1 ring-white/15 ring-inset")} />
        ))}
      </div>
      <p className="mt-4 text-[15px] text-fog">{done === total ? "Tudo de hoje encaixado." : `${done} de ${total} feitas hoje`}</p>
    </div>
  );
}

export default function HojePage() {
  const { db, me, ready } = useData();
  const [view, setView] = useState<"mine" | "team">("mine");
  const today = todayISO();
  const person = me ? PERSON[me] : null;
  const agenda = useAgenda();

  const mine = useMemo(() => db.tasks.filter((t) => me && t.owners.includes(me)), [db.tasks, me]);
  const todayScope = mine.filter((t) => (!t.done && t.due && t.due <= today) || (t.done && t.done_at && todayISO(new Date(t.done_at)) === today));
  const doneToday = todayScope.filter((t) => t.done).length;
  const groups = group(mine, today);
  const openCount = mine.filter((t) => !t.done).length;
  const recentDone = mine
    .filter((t) => t.done && t.done_at)
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""))
    .slice(0, 5);

  if (!person) return null;

  return (
    <div>
      {/* Seção escura: entra como cartão arredondado sobre o papel */}
      <section className="md:gutter md:pt-8">
        <div className="on-ink bg-ink px-5 pt-8 pb-10 text-on-ink md:rounded-panel md:px-12 md:pt-12 md:pb-12">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
            <p className="kicker">{longDate()}</p>
            <ClockWeather />
          </div>
          <h1 className="mt-6 text-[clamp(40px,4.5vw,70px)] leading-[1.04] font-medium tracking-[-0.04em] text-on-ink">
            {greeting()}, {person.short}.
            <br />
            <span className="text-lime-glow">
              {!ready
                ? "Carregando as suas ações…"
                : openCount === 0
                  ? "Nada aberto com o seu nome."
                  : `${openCount} ${openCount === 1 ? "ação aberta" : "ações abertas"}.`}
            </span>
          </h1>
          <Rail total={todayScope.length} done={doneToday} />
        </div>
      </section>

      <div className="gutter pt-8 xl:grid xl:grid-cols-[minmax(0,880px)_minmax(300px,380px)] xl:items-start xl:gap-14">
        <div className="max-w-[880px] min-w-0">
          <BriefingBanner />
          <ChargesBanner />
          <AgendaBlock data={agenda.data} available={agenda.available} className="mb-8 xl:hidden" />
          <Segmented
            label="Visão"
            value={view}
            onChange={setView}
            options={[
              ["mine", "Minhas"],
              ["team", "Equipe"],
            ]}
          />

          {view === "mine" ? (
            <div className="mt-6 grid gap-10">
              <TaskComposer defaultOwners={[person.id]} />
              {ready && openCount === 0 && <EmptyState>Sem ações abertas. Escreva acima a próxima coisa que precisa acontecer.</EmptyState>}
              {groups
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <section key={g.key} aria-labelledby={`g-${g.key}`}>
                    <SectionTitle id={`g-${g.key}`} count={g.items.length} tone={g.key === "late" ? "danger" : undefined}>
                      {g.title}
                    </SectionTitle>
                    <ul>
                      {g.items.map((t) => (
                        <TaskRow key={t.id} task={t} />
                      ))}
                    </ul>
                  </section>
                ))}
              {recentDone.length > 0 && (
                <details>
                  <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-medium text-fg-muted hover:text-fg">Concluídas recentemente ({recentDone.length})</summary>
                  <ul className="mt-2">
                    {recentDone.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : (
            <TeamView />
          )}
        </div>
        <aside className="mt-14 grid max-w-[880px] gap-10 xl:sticky xl:top-8 xl:mt-0">
          <AgendaBlock data={agenda.data} available={agenda.available} className="hidden xl:block" />
          <TechNews />
        </aside>
      </div>
    </div>
  );
}

/** Cobranças que vencem hoje ou estão atrasadas, para quem cobra. */
function ChargesBanner() {
  const { db, me } = useData();
  const due = charges(db.contracts, db.payments).filter((c) => c.contract.owner === me && (c.state === "atrasado" || c.state === "hoje"));
  if (due.length === 0) return null;
  const late = due.filter((c) => c.state === "atrasado").length;
  const total = due.reduce((s, c) => s + c.amount, 0);
  return (
    <Link
      href="/dinheiro"
      className="btn-action mb-6 flex items-center gap-4 rounded-card bg-raised p-4 shadow-card ring-1 ring-line ring-inset transition-shadow hover:ring-2 hover:ring-lime-deep"
    >
      <span aria-hidden className={cn("module grid size-10 shrink-0 place-items-center", late ? "bg-danger" : "bg-lime")} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-fg">
          {due.length} {due.length === 1 ? "cobrança para fazer" : "cobranças para fazer"}
        </span>
        <span className="block text-[15px] text-fg-muted">
          {money(total)}
          {late > 0 ? `, ${late} ${late === 1 ? "atrasada" : "atrasadas"}` : ", vencem hoje"}. Toque para ver em Dinheiro.
        </span>
      </span>
      <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-action text-on-action">
        <ArrowRight className="go-arrow size-4" strokeWidth={2.4} aria-hidden />
      </span>
    </Link>
  );
}

/** Aviso do briefing do Claude, quando o de hoje já saiu. */
function BriefingBanner() {
  const { db, me } = useData();
  const { hojeFresh } = briefings(db);
  if (!hojeFresh || !me) return null;
  const mine = countTasks(splitByPerson(hojeFresh).sections[me]);
  return (
    <Link
      href="/claude"
      className="btn-action mb-6 flex items-center gap-4 rounded-card bg-raised p-4 shadow-card ring-1 ring-line ring-inset transition-shadow hover:ring-2 hover:ring-lime-deep"
    >
      <span aria-hidden className="module grid size-10 shrink-0 place-items-center bg-lime" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-fg">Briefing do Claude de hoje</span>
        <span className="block text-[15px] text-fg-muted">
          {mine === 0 ? "Nada vence hoje para você." : `${mine} ${mine === 1 ? "item" : "itens"} para você hoje.`} Toque para ver o da equipe.
        </span>
      </span>
      <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-action text-on-action">
        <ArrowRight className="go-arrow size-4" strokeWidth={2.4} aria-hidden />
      </span>
    </Link>
  );
}

function TeamView() {
  const { db } = useData();
  const today = todayISO();
  const open = db.tasks.filter((t) => !t.done).sort(byDue);
  const lanes: { id: PersonId | "none"; label: string; area?: string; items: Task[] }[] = [
    ...PEOPLE.map((p) => ({ id: p.id, label: p.short, area: p.area, items: open.filter((t) => t.owners.includes(p.id)) })),
    { id: "none", label: "Sem dono", items: open.filter((t) => t.owners.length === 0) },
  ];

  return (
    <div className="mt-6 grid gap-10">
      {lanes
        .filter((l) => l.id !== "none" || l.items.length > 0)
        .map((lane) => {
          const late = lane.items.filter((t) => t.due && t.due < today).length;
          return (
            <section key={lane.id} aria-labelledby={`lane-${lane.id}`}>
              <div className="mb-1 flex items-center gap-3">
                {lane.id !== "none" && <Avatar id={lane.id} className="size-10 text-sm" />}
                <div>
                  <h2 id={`lane-${lane.id}`} className="text-[19px] leading-tight font-semibold tracking-[-0.02em]">
                    {lane.label}
                  </h2>
                  <p className="text-[13px] text-fg-muted">
                    {lane.area ? `${lane.area}, ` : ""}
                    {lane.items.length} {lane.items.length === 1 ? "aberta" : "abertas"}
                    {late > 0 && <span className="font-semibold text-danger">, {late} atrasada{late > 1 ? "s" : ""}</span>}
                  </p>
                </div>
              </div>
              {lane.items.length === 0 ? (
                <p className="py-3 text-[15px] text-fg-muted">Nada aberto.</p>
              ) : (
                <ul>
                  {lane.items.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
    </div>
  );
}
