"use client";

import { useMemo, useState } from "react";
import { ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { PEOPLE } from "@/lib/people";
import { AREAS } from "@/lib/labels";
import { dueLabel, newId, todayISO } from "@/lib/dates";
import type { PersonId, RefType, Task, TaskArea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatars } from "./brand";
import { ActionButton, Field, QuietButton, inputClass } from "./ui-bits";

/** Nome do registro ao qual a tarefa está ligada (lead, cliente, projeto...). */
export function useRefName() {
  const { db } = useData();
  return (type: RefType | null, id: string | null) => {
    if (!type || !id) return null;
    const list =
      type === "lead" ? db.leads : type === "client" ? db.clients : type === "project" ? db.projects : type === "post" ? db.posts : db.decisions;
    const row = (list as Array<{ id: string; name?: string; title?: string }>).find((r) => r.id === id);
    return row ? row.name ?? row.title ?? null : null;
  };
}

/** Caixa de conclusão no formato do módulo; alvo de toque de 44px. */
export function TaskCheck({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={done}
      aria-label={done ? `Reabrir: ${label}` : `Concluir: ${label}`}
      className="group/check -m-2.5 grid size-11 shrink-0 place-items-center rounded-full"
    >
      <span
        className={cn(
          "module grid size-6 place-items-center transition-colors",
          done ? "module-done bg-lime text-navy" : "bg-raised ring-2 ring-fg-subtle/60 ring-inset group-hover/check:ring-fg",
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}

export function TaskRow({ task, showRef = true }: { task: Task; showRef?: boolean }) {
  const { update } = useData();
  const refName = useRefName();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const late = !task.done && task.due && task.due < today;
  const ref = showRef ? refName(task.ref_type, task.ref_id) : null;

  function toggle() {
    const done = !task.done;
    update("tasks", task.id, { done, done_at: done ? new Date().toISOString() : null });
    if (done) toast.success("Tarefa concluída", { description: task.title, duration: 2500 });
  }

  return (
    <li className="flex items-start gap-4 border-b border-line py-4 last:border-b-0">
      <div className="pt-0.5">
        <TaskCheck done={task.done} onToggle={toggle} label={task.title} />
      </div>
      <button onClick={() => setOpen(true)} className="min-w-0 flex-1 rounded-sm text-left">
        <span className={cn("block text-base leading-snug text-fg", task.done && "text-fg-subtle line-through decoration-fg-subtle/60")}>{task.title}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
          {task.due && (
            <span className={cn(late && "font-semibold text-danger", task.due === today && !task.done && "font-semibold text-accent-text")}>
              {late ? `Atrasada, ${dueLabel(task.due)}` : dueLabel(task.due)}
            </span>
          )}
          {ref && <span className="truncate">{ref}</span>}
        </span>
      </button>
      <Avatars ids={task.owners} />
      <TaskSheet open={open} onOpenChange={setOpen} task={task} />
    </li>
  );
}

type Draft = { title: string; owners: PersonId[]; due: string; area: TaskArea };

/** Fichas de pessoa. Selecionada: lima a 12% com contorno lima-escuro de 2px (sobre o papel). */
function OwnerPicker({ value, onChange }: { value: PersonId[]; onChange: (v: PersonId[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Quem faz">
      {PEOPLE.map((p) => {
        const on = value.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== p.id) : [...value, p.id])}
            className={cn(
              "min-h-11 rounded-pill px-4 text-[15px] transition-colors md:min-h-9",
              on ? "bg-lime/12 font-semibold text-fg ring-2 ring-lime-deep ring-inset" : "text-fg-muted ring-1 ring-line-strong ring-inset hover:text-fg",
            )}
          >
            {p.short}
          </button>
        );
      })}
    </div>
  );
}

function TaskFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="grid gap-5">
      <Field label="O que precisa ser feito">
        <textarea rows={2} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={cn(inputClass, "resize-none")} />
      </Field>
      <div>
        <span className="mb-2 block text-[15px] text-fg-muted">Quem faz</span>
        <OwnerPicker value={draft.owners} onChange={(owners) => setDraft({ ...draft, owners })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Até quando">
          <input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Área">
          <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as TaskArea })} className={cn(inputClass, "field")}>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function TaskSheet({ open, onOpenChange, task }: { open: boolean; onOpenChange: (o: boolean) => void; task: Task }) {
  const { update, remove } = useData();
  const refName = useRefName();
  const [draft, setDraft] = useState<Draft>({ title: task.title, owners: task.owners, due: task.due ?? "", area: task.area });
  const ref = refName(task.ref_type, task.ref_id);

  function save() {
    if (!draft.title.trim()) return;
    update("tasks", task.id, { title: draft.title.trim(), owners: draft.owners, due: draft.due || null, area: draft.area });
    onOpenChange(false);
    toast.success("Tarefa salva");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft({ title: task.title, owners: task.owners, due: task.due ?? "", area: task.area });
        onOpenChange(o);
      }}
    >
      <SheetContent side="right" className="w-full data-[side=right]:w-full gap-0 overflow-x-hidden bg-surface sm:max-w-md">
        <SheetHeader className="px-6 pt-7 pb-5">
          <p className="kicker">Tarefa</p>
          <SheetTitle className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-fg">Editar tarefa</SheetTitle>
          <SheetDescription className="text-[15px] text-fg-muted">{ref ? `Ligada a ${ref}` : "Tarefa solta, sem cliente ou projeto"}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <TaskFields draft={draft} setDraft={setDraft} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
          <QuietButton
            className="text-danger hover:text-danger"
            onClick={() => {
              remove("tasks", task.id);
              onOpenChange(false);
              toast("Tarefa excluída", { description: task.title });
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Excluir
          </QuietButton>
          <ActionButton onClick={save}>Salvar tarefa</ActionButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Campo rápido para criar tarefa. Enter cria; quem faz e prazo aparecem ao focar. */
export function TaskComposer({
  defaultOwners,
  refType = null,
  refId = null,
  defaultArea = "operacao",
  placeholder = "Qual é a próxima ação? Escreva e aperte Enter",
}: {
  defaultOwners: PersonId[];
  refType?: RefType | null;
  refId?: string | null;
  defaultArea?: TaskArea;
  placeholder?: string;
}) {
  const { insert } = useData();
  const [draft, setDraft] = useState<Draft>({ title: "", owners: defaultOwners, due: "", area: defaultArea });
  const [expanded, setExpanded] = useState(false);

  function add() {
    const title = draft.title.trim();
    if (!title) return;
    insert("tasks", {
      id: newId("t"),
      title,
      owners: draft.owners,
      due: draft.due || null,
      done: false,
      done_at: null,
      area: draft.area,
      ref_type: refType,
      ref_id: refId,
      created_at: new Date().toISOString(),
    });
    setDraft({ title: "", owners: defaultOwners, due: "", area: defaultArea });
    setExpanded(false);
    toast.success("Tarefa criada", { description: title, duration: 2500 });
  }

  return (
    <div className="rounded-card bg-raised p-2 shadow-card ring-1 ring-line ring-inset focus-within:ring-2 focus-within:ring-focus">
      <div className="flex items-center gap-2">
        <Plus className="ml-3 size-5 shrink-0 text-fg-subtle" aria-hidden />
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          aria-label="Nova tarefa"
          placeholder={placeholder}
          className="min-h-12 min-w-0 flex-1 bg-transparent px-1 text-base text-fg outline-none placeholder:text-fg-subtle focus-visible:outline-none"
        />
        <button
          onClick={add}
          disabled={!draft.title.trim()}
          aria-label="Criar tarefa"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-action text-on-action transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="size-5" strokeWidth={2.4} aria-hidden />
        </button>
      </div>
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-2 pt-3 pb-1.5">
          <OwnerPicker value={draft.owners} onChange={(owners) => setDraft({ ...draft, owners })} />
          <input
            type="date"
            aria-label="Prazo"
            value={draft.due}
            onChange={(e) => setDraft({ ...draft, due: e.target.value })}
            className="min-h-11 rounded-pill bg-transparent px-4 text-[15px] text-fg ring-1 ring-line-strong ring-inset outline-none focus-visible:ring-2 focus-visible:ring-focus md:min-h-9"
          />
        </div>
      )}
    </div>
  );
}

/** Lista de tarefas ligadas a um registro, com composer. */
export function LinkedTasks({ refType, refId, defaultOwners, area }: { refType: RefType; refId: string; defaultOwners: PersonId[]; area: TaskArea }) {
  const { db } = useData();
  const tasks = useMemo(
    () =>
      db.tasks
        .filter((t) => t.ref_type === refType && t.ref_id === refId)
        .sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "9999").localeCompare(b.due ?? "9999")),
    [db.tasks, refType, refId],
  );
  return (
    <div className="grid gap-3">
      <TaskComposer defaultOwners={defaultOwners} refType={refType} refId={refId} defaultArea={area} placeholder="Próximo passo com este registro" />
      {tasks.length > 0 && (
        <ul>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} showRef={false} />
          ))}
        </ul>
      )}
    </div>
  );
}
