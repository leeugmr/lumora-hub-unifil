"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Lock, Pin, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { PERSON } from "@/lib/people";
import { longDate, newId, shortDate } from "@/lib/dates";
import { extractLinks, linkableTargets, resolveLink, type LinkTarget } from "@/lib/links";
import type { PersonalNote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NoteBody } from "@/components/note-body";
import { isBriefingNote } from "@/lib/briefing";
import { RecordSheet, type RecordRef } from "@/components/record-sheet";
import { Avatar } from "@/components/brand";
import { ActionButton, EmptyState, QuietButton, Segmented, SecondaryButton, inputClass } from "@/components/ui-bits";

const GROUPS: [LinkTarget["kind"], string][] = [
  ["client", "Clientes"],
  ["lead", "Leads"],
  ["project", "Projetos"],
  ["person", "Pessoas"],
  ["personal_note", "Anotações"],
  ["decision", "Decisões"],
  ["post", "Posts"],
];

const TEMPLATE_DIA =(data: string) => `# ${data}

## Foco do dia
- [ ]

## Conversas e contatos
-

## Próximos passos
- [ ] `;

export default function NotasPage() {
  return (
    <Suspense>
      <Notas />
    </Suspense>
  );
}

function Notas() {
  const { db, me, insert, update, remove } = useData();
  const router = useRouter();
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [query, setQuery] = useState("");
  const [record, setRecord] = useState<RecordRef | null>(null);
  const targets = useMemo(() => linkableTargets(db), [db]);

  useEffect(() => {
    const id = params.get("id");
    if (id) setSelectedId(id);
  }, [params]);

  // Briefings do Claude ficam na aba própria, fora da lista de anotações.
  const notes = db.personal_notes.filter((n) => !isBriefingNote(n.id) || n.id === selectedId);
  const q = query.trim().toLowerCase();
  const match = (n: PersonalNote) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
  const byDate = (a: PersonalNote, b: PersonalNote) => b.updated_at.localeCompare(a.updated_at);
  const mine = notes.filter((n) => n.owner === me && match(n)).sort(byDate);
  const pinned = mine.filter((n) => n.pinned);
  const rest = mine.filter((n) => !n.pinned);
  const shared = notes.filter((n) => n.owner !== me && n.shared && match(n)).sort(byDate);
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  function select(id: string | null) {
    setSelectedId(id);
    router.replace(id ? `/notas?id=${id}` : "/notas", { scroll: false });
  }

  function create(title: string, body = "") {
    if (!me) return;
    const now = new Date().toISOString();
    const id = newId("nota");
    insert("personal_notes", { id, owner: me, title, body, shared: false, pinned: false, created_at: now, updated_at: now });
    select(id);
  }

  function daily() {
    const title = `Diário, ${longDate()}`;
    const existing = notes.find((n) => n.owner === me && n.title === title);
    if (existing) select(existing.id);
    else create(title, TEMPLATE_DIA(longDate()));
  }

  function openTarget(t: LinkTarget) {
    if (t.kind === "lead" || t.kind === "client" || t.kind === "project") setRecord({ type: t.kind, id: t.id });
    else if (t.kind === "personal_note") select(t.id);
    else if (t.kind === "post") router.push("/conteudo");
    else if (t.kind === "decision") router.push("/decisoes");
    else router.push("/mapa");
  }

  return (
    <div className="gutter pt-8 pb-10 md:pt-12">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* Lista */}
        <aside className={cn("min-w-0", selected && "hidden lg:block")}>
          <p className="kicker">Pessoal</p>
          <h1 className="mt-4 text-[clamp(32px,3.4vw,44px)] leading-[1.05] font-semibold tracking-[-0.035em]">Anotações</h1>
          <p className="mt-3 text-[17px] text-fg-muted">Suas notas ficam só com você. Compartilhe as que a equipe precisa ver.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <ActionButton onClick={() => create("")} icon={<Plus className="size-4" strokeWidth={2.6} aria-hidden />}>
              Nova nota
            </ActionButton>
            <SecondaryButton onClick={daily}>
              <CalendarDays className="size-4" aria-hidden /> Nota do dia
            </SecondaryButton>
          </div>

          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nas notas…" aria-label="Buscar nas notas" className={cn(inputClass, "mt-6")} />

          <div className="mt-6 grid gap-7">
            {mine.length === 0 && shared.length === 0 && (
              <EmptyState>{q ? "Nada encontrado com essa busca." : "Nenhuma anotação ainda. Comece pela nota do dia."}</EmptyState>
            )}
            <NoteList title="Fixadas" notes={pinned} selectedId={selectedId} onSelect={select} />
            <NoteList title="Minhas" notes={rest} selectedId={selectedId} onSelect={select} />
            <NoteList title="Compartilhadas pela equipe" notes={shared} selectedId={selectedId} onSelect={select} showOwner />
          </div>
        </aside>

        {/* Editor */}
        <section className={cn("min-w-0", !selected && "hidden lg:block")}>
          {selected ? (
            <Editor
              key={selected.id}
              note={selected}
              canEdit={selected.owner === me}
              targets={targets}
              onBack={() => select(null)}
              onOpen={openTarget}
              onSave={(patch) => update("personal_notes", selected.id, { ...patch, updated_at: new Date().toISOString() })}
              onDelete={() => {
                remove("personal_notes", selected.id);
                select(null);
                toast("Nota excluída");
              }}
              backlinks={notes.filter((n) => n.id !== selected.id && selected.title.trim() && extractLinks(n.body).some((l) => resolveLink(l, targets)?.id === selected.id))}
              onSelect={select}
            />
          ) : (
            <div className="hidden h-full min-h-[420px] place-items-center rounded-panel border border-dashed border-line-strong lg:grid">
              <p className="max-w-xs text-center text-fg-muted">Escolha uma nota na lista ou crie uma nova. Use [[nome]] para ligar a nota a um cliente, lead ou projeto.</p>
            </div>
          )}
        </section>
      </div>
      <RecordSheet record={record} onClose={() => setRecord(null)} />
    </div>
  );
}

function NoteList({
  title,
  notes,
  selectedId,
  onSelect,
  showOwner,
}: {
  title: string;
  notes: PersonalNote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showOwner?: boolean;
}) {
  if (notes.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-[15px] font-semibold text-fg-muted">{title}</h2>
      <ul className="grid gap-1">
        {notes.map((n) => {
          const on = n.id === selectedId;
          const preview = n.body.replace(/[#\-\[\]x]/g, " ").replace(/\s+/g, " ").trim();
          return (
            <li key={n.id}>
              <button
                onClick={() => onSelect(n.id)}
                className={cn(
                  "w-full rounded-field px-4 py-3 text-left transition-colors hover:bg-surface-2",
                  on && "bg-lime/12 ring-2 ring-lime-deep ring-inset hover:bg-lime/12",
                )}
              >
                <span className="flex items-center gap-2">
                  {showOwner && <Avatar id={n.owner} className="size-5 text-[9px]" />}
                  <span className="truncate font-semibold text-fg">{n.title || "Sem título"}</span>
                  {n.shared && !showOwner && <Users className="size-3.5 shrink-0 text-fg-subtle" aria-label="Compartilhada" />}
                </span>
                <span className="mt-0.5 line-clamp-1 text-[13px] text-fg-muted">
                  {shortDate(n.updated_at)}
                  {preview ? `, ${preview}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Editor({
  note,
  canEdit,
  targets,
  onBack,
  onOpen,
  onSave,
  onDelete,
  backlinks,
  onSelect,
}: {
  note: PersonalNote;
  canEdit: boolean;
  targets: LinkTarget[];
  onBack: () => void;
  onOpen: (t: LinkTarget) => void;
  onSave: (patch: Partial<PersonalNote>) => void;
  onDelete: () => void;
  backlinks: PersonalNote[];
  onSelect: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [mode, setMode] = useState<"write" | "read">(canEdit && !note.body ? "write" : "read");
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // Salvamento automático: 700 ms depois de parar de digitar.
  function schedule(next: { title?: string; body?: string }) {
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSave(next);
      setSaved(true);
    }, 700);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function flushAndSave(patch: Partial<PersonalNote>) {
    if (timer.current) clearTimeout(timer.current);
    onSave({ title, body, ...patch });
    setSaved(true);
  }

  function toggleLine(i: number) {
    const lines = body.split("\n");
    lines[i] = lines[i].replace(/- \[( |x|X)\]/, (m) => (m.includes(" ]") ? "- [x]" : "- [ ]"));
    const next = lines.join("\n");
    setBody(next);
    flushAndSave({ body: next });
  }

  function insertLink(label: string) {
    const el = area.current;
    const token = `[[${label}]]`;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    schedule({ body: next });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const links = extractLinks(body)
    .map((l) => resolveLink(l, targets))
    .filter((t): t is LinkTarget => Boolean(t));
  const linkOptions = targets.filter((t) => t.kind !== "personal_note" || t.id !== note.id).filter((t, i, all) => all.findIndex((o) => o.label === t.label) === i);

  return (
    <article className="rounded-panel bg-raised p-5 shadow-card ring-1 ring-line ring-inset md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-[15px] text-fg-muted hover:text-fg lg:hidden">
          <ArrowLeft className="size-4" aria-hidden /> Todas as notas
        </button>
        <p className="kicker">
          {canEdit ? (note.shared ? "Compartilhada com a equipe" : "Só você vê") : `De ${PERSON[note.owner].short}, compartilhada`}
        </p>
        {canEdit && (
          <Segmented
            label="Modo"
            value={mode}
            onChange={(m) => {
              if (m === "read") flushAndSave({});
              setMode(m);
            }}
            options={[
              ["write", "Escrever"],
              ["read", "Ler"],
            ]}
          />
        )}
      </div>

      {canEdit ? (
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            schedule({ title: e.target.value, body });
          }}
          placeholder="Título da nota"
          aria-label="Título"
          className="mt-5 w-full bg-transparent text-[clamp(28px,3vw,40px)] leading-[1.1] font-semibold tracking-[-0.035em] text-fg outline-none placeholder:text-fg-subtle focus-visible:outline-none"
        />
      ) : (
        <h2 className="mt-5 text-[clamp(28px,3vw,40px)] leading-[1.1] font-semibold tracking-[-0.035em]">{note.title || "Sem título"}</h2>
      )}

      <div className="mt-5">
        {canEdit && mode === "write" ? (
          <>
            <textarea
              ref={area}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                schedule({ title, body: e.target.value });
              }}
              rows={14}
              aria-label="Texto da nota"
              placeholder={"Escreva livre. Atalhos:\n# Título\n- item de lista\n- [ ] próximo passo\n[[Salão Bela Forma]] liga a nota a um cliente, lead ou projeto"}
              className={cn(inputClass, "min-h-[340px] resize-y font-sans leading-relaxed")}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Ligar a</span>
                <select
                  value=""
                  onChange={(e) => e.target.value && insertLink(e.target.value)}
                  className={cn(inputClass, "field py-2.5 text-[15px] text-fg-muted")}
                >
                  <option value="">Ligar a… (cliente, lead, projeto, nota)</option>
                  {GROUPS.map(([kind, groupLabel]) => {
                    const opts = linkOptions.filter((t) => t.kind === kind && (kind !== "person" || t.label.length <= 4));
                    if (opts.length === 0) return null;
                    return (
                      <optgroup key={kind} label={groupLabel}>
                        {opts.map((t) => (
                          <option key={`${t.kind}-${t.id}-${t.label}`} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </label>
              <span className="text-[13px] text-fg-subtle">{saved ? "Salvo" : "Salvando…"}</span>
            </div>
          </>
        ) : (
          <NoteBody body={body} targets={targets} onOpen={onOpen} onToggle={canEdit ? toggleLine : undefined} />
        )}
      </div>

      {(links.length > 0 || backlinks.length > 0) && (
        <div className="mt-8 grid gap-5 border-t border-line pt-6 md:grid-cols-2">
          {links.length > 0 && (
            <div>
              <h3 className="text-[15px] font-semibold text-fg-muted">Esta nota cita</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {links.map((t) => (
                  <li key={`${t.kind}-${t.id}`}>
                    <button onClick={() => onOpen(t)} className="min-h-9 rounded-pill px-3.5 text-[14px] font-medium text-fg ring-1 ring-line-strong ring-inset hover:bg-surface-2">
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {backlinks.length > 0 && (
            <div>
              <h3 className="text-[15px] font-semibold text-fg-muted">Citada em</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {backlinks.map((n) => (
                  <li key={n.id}>
                    <button onClick={() => onSelect(n.id)} className="min-h-9 rounded-pill px-3.5 text-[14px] font-medium text-fg ring-1 ring-line-strong ring-inset hover:bg-surface-2">
                      {n.title || "Sem título"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              onClick={() => {
                flushAndSave({ shared: !note.shared });
                toast.success(note.shared ? "Nota agora é só sua" : "Nota compartilhada com a equipe");
              }}
            >
              {note.shared ? <Lock className="size-4" aria-hidden /> : <Users className="size-4" aria-hidden />}
              {note.shared ? "Deixar só comigo" : "Compartilhar com a equipe"}
            </SecondaryButton>
            <SecondaryButton onClick={() => flushAndSave({ pinned: !note.pinned })} aria-pressed={note.pinned}>
              <Pin className="size-4" aria-hidden /> {note.pinned ? "Desafixar" : "Fixar"}
            </SecondaryButton>
          </div>
          <QuietButton className="text-danger hover:text-danger" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden /> Excluir nota
          </QuietButton>
        </div>
      )}
    </article>
  );
}
