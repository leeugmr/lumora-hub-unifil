"use client";

// Agenda na tela Hoje (Google Agenda, Outlook ou iCloud pelo link secreto iCal) e a ata de reunião,
// que salva a anotação e transforma os próximos passos em tarefas.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Plus, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { PEOPLE } from "@/lib/people";
import { newId, shortDate } from "@/lib/dates";
import type { AgendaEvent, AgendaResponse } from "@/app/api/agenda/route";
import type { PersonId, RefType, TaskArea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionButton, Field, QuietButton, SectionTitle, inputClass } from "./ui-bits";

export function useAgenda() {
  const { mode, session } = useData();
  const token = session?.access_token ?? null;
  const [data, setData] = useState<AgendaResponse | null>(null);

  const load = useCallback(async () => {
    if (mode !== "supabase" || !token) return;
    try {
      const r = await fetch("/api/agenda", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      setData(await r.json());
    } catch {
      setData({ connected: true, events: [], error: "Não deu para abrir a agenda agora." });
    }
  }, [mode, token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return { data, reload: load, available: mode === "supabase" };
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function when(e: AgendaEvent) {
  return e.allDay ? "Dia todo" : `${time(e.start)} às ${time(e.end)}`;
}

export function AgendaBlock({ data, available, className }: { data: AgendaResponse | null; available: boolean; className?: string }) {
  const [ata, setAta] = useState<AgendaEvent | null>(null);
  if (!available) return null;
  if (data && !data.connected) {
    return (
      <Link
        href="/ajustes#agenda"
        className={cn("flex items-center gap-3 rounded-card bg-raised p-4 text-[15px] text-fg-muted shadow-card ring-1 ring-line ring-inset hover:text-fg hover:ring-line-strong", className)}
      >
        <CalendarPlus className="size-5 shrink-0 text-accent-text" aria-hidden />
        Ligue sua agenda do Google para ver as reuniões de hoje aqui.
      </Link>
    );
  }

  const today = data?.events.filter((e) => e.day === "hoje") ?? [];
  const tomorrow = data?.events.filter((e) => e.day === "amanha") ?? [];

  return (
    <section aria-labelledby="agenda" className={className}>
      <SectionTitle id="agenda" count={data ? today.length : undefined}>
        Agenda de hoje
      </SectionTitle>
      {!data ? (
        <p className="py-3 text-[15px] text-fg-subtle" aria-busy="true">
          Abrindo a agenda…
        </p>
      ) : data.error ? (
        <p className="py-3 text-[15px] text-fg-muted">
          {data.error}{" "}
          <Link href="/ajustes#agenda" className="font-medium text-fg underline decoration-lime-deep decoration-2 underline-offset-4">
            Ajustes
          </Link>
        </p>
      ) : today.length === 0 ? (
        <p className="py-3 text-[15px] text-fg-muted">Nada na agenda hoje.</p>
      ) : (
        <ul>
          {today.map((e) => (
            <EventRow key={e.id} event={e} onAta={() => setAta(e)} />
          ))}
        </ul>
      )}
      {tomorrow.length > 0 && (
        <details className="mt-1">
          <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-medium text-fg-muted hover:text-fg">Amanhã ({tomorrow.length})</summary>
          <ul>
            {tomorrow.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        </details>
      )}
      <AtaDialog event={ata} onClose={() => setAta(null)} />
    </section>
  );
}

function EventRow({ event, onAta }: { event: AgendaEvent; onAta?: () => void }) {
  const past = !event.allDay && new Date(event.end) < new Date();
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className={cn("text-base leading-snug font-medium text-fg", past && "text-fg-muted")}>{event.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-fg-muted">
          {when(event)}
          {event.location && `, ${event.location}`}
        </p>
      </div>
      {event.link && !past && (
        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Entrar na chamada: ${event.title}`}
          className="grid size-11 shrink-0 place-items-center rounded-full text-fg-muted ring-1 ring-line ring-inset hover:text-fg hover:ring-line-strong"
        >
          <Video className="size-[18px]" aria-hidden />
        </a>
      )}
      {onAta && (
        <QuietButton onClick={onAta} className="shrink-0 px-3" aria-label={`Anotar a reunião: ${event.title}`}>
          Anotar
        </QuietButton>
      )}
    </li>
  );
}

type Step = { key: string; title: string; owner: PersonId | ""; due: string };
const AREA_OF: Record<string, TaskArea> = { lead: "comercial", client: "clientes", project: "projetos" };

function AtaDialog({ event, onClose }: { event: AgendaEvent | null; onClose: () => void }) {
  const { db, insert, me } = useData();
  const [refKey, setRefKey] = useState("");
  const [body, setBody] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);

  const newStep = (): Step => ({ key: newId("s"), title: "", owner: me ?? "", due: "" });
  if ((event?.id ?? null) !== lastId) {
    setLastId(event?.id ?? null);
    setRefKey("");
    setBody("");
    setSteps([newStep()]);
  }
  if (!event) return null;

  const setStep = (key: string, patch: Partial<Step>) => setSteps((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    const filled = steps.filter((s) => s.title.trim());
    if (!body.trim() && filled.length === 0) {
      toast.error("Escreva o que foi falado ou um próximo passo.");
      return;
    }
    const [refType, refId] = refKey ? (refKey.split(":") as [RefType, string]) : [null, null];
    const now = new Date().toISOString();
    const date = shortDate(event.allDay ? `${event.start}T12:00:00` : event.start);
    const nextText = filled.length
      ? `\n\nPróximos passos:\n${filled.map((s) => `- ${s.title.trim()}${s.owner ? ` (${PEOPLE.find((p) => p.id === s.owner)?.short})` : ""}`).join("\n")}`
      : "";
    const text = `${body.trim()}${nextText}`.trim();

    if (refType && refId) insert("notes", { id: newId("n"), ref_type: refType, ref_id: refId, body: `Reunião "${event.title}", ${date}\n\n${text}`, author: me, created_at: now });
    else if (me) insert("personal_notes", { id: newId("pn"), owner: me, title: `Reunião: ${event.title}, ${date}`, body: text, shared: true, pinned: false, created_at: now, updated_at: now });

    for (const s of filled)
      insert("tasks", {
        id: newId("t"),
        title: s.title.trim(),
        owners: s.owner ? [s.owner] : [],
        due: s.due || null,
        done: false,
        done_at: null,
        area: refType ? AREA_OF[refType] ?? "operacao" : "operacao",
        ref_type: refType,
        ref_id: refId,
        created_at: now,
      });

    toast.success("Ata salva", {
      description: filled.length ? `${filled.length} ${filled.length === 1 ? "próximo passo virou tarefa" : "próximos passos viraram tarefas"}.` : undefined,
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-panel bg-surface p-7 sm:max-w-xl">
        <DialogHeader>
          <p className="kicker">Ata de reunião</p>
          <DialogTitle className="mt-2 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-fg">{event.title}</DialogTitle>
          <DialogDescription className="text-[15px] text-fg-muted">{when(event)}. Os próximos passos viram tarefas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="mt-2 grid gap-5">
          <Field label="Sobre quem foi a reunião">
            <select className={cn(inputClass, "field")} value={refKey} onChange={(e) => setRefKey(e.target.value)}>
              <option value="">Interna (vai para Anotações, compartilhada)</option>
              {db.clients.length > 0 && (
                <optgroup label="Clientes">
                  {db.clients.map((c) => (
                    <option key={c.id} value={`client:${c.id}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {db.leads.length > 0 && (
                <optgroup label="Leads">
                  {db.leads.map((l) => (
                    <option key={l.id} value={`lead:${l.id}`}>
                      {l.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {db.projects.length > 0 && (
                <optgroup label="Projetos">
                  {db.projects.map((p) => (
                    <option key={p.id} value={`project:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
          <Field label="O que foi falado">
            <textarea rows={4} className={cn(inputClass, "min-h-[110px] resize-y")} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Decisões, pedidos, combinados…" />
          </Field>

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-[15px] text-fg-muted">Próximos passos</legend>
            {steps.map((s, i) => (
              <div key={s.key} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-field bg-surface-2 p-3 sm:grid-cols-[1fr_96px_150px_auto]">
                <input
                  aria-label={`Próximo passo ${i + 1}`}
                  className={cn(inputClass, "col-span-2 sm:col-span-1")}
                  placeholder="Ex.: Enviar proposta revisada"
                  value={s.title}
                  onChange={(e) => setStep(s.key, { title: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setSteps((all) => (all.length > 1 ? all.filter((x) => x.key !== s.key) : [newStep()]))}
                  aria-label={`Remover passo ${i + 1}`}
                  className="grid size-11 place-items-center rounded-full text-fg-subtle hover:text-fg sm:order-last"
                >
                  <X className="size-4" aria-hidden />
                </button>
                <select aria-label="Dono" className={cn(inputClass, "field")} value={s.owner} onChange={(e) => setStep(s.key, { owner: e.target.value as PersonId | "" })}>
                  <option value="">Sem dono</option>
                  {PEOPLE.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.short}
                    </option>
                  ))}
                </select>
                <input aria-label="Prazo" type="date" className={inputClass} value={s.due} onChange={(e) => setStep(s.key, { due: e.target.value })} />
              </div>
            ))}
            <QuietButton type="button" onClick={() => setSteps((all) => [...all, newStep()])} className="justify-self-start">
              <Plus className="size-4" aria-hidden /> Mais um passo
            </QuietButton>
          </fieldset>

          <ActionButton type="submit" className="w-full sm:w-auto sm:justify-self-end">
            Salvar ata
          </ActionButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
