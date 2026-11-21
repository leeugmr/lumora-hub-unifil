"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { POST_STATUSES, POST_STATUS_LABEL, WEEKDAY_LABEL } from "@/lib/labels";
import { PEOPLE } from "@/lib/people";
import type { Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar } from "@/components/brand";
import { ActionButton, Field, FrontTag, PageHeader, Segmented, inputClass } from "@/components/ui-bits";

const ORDER = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

function StatusPill({ status }: { status: PostStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-[13px] font-semibold",
        status === "nao iniciado" && "font-medium text-fg-subtle ring-1 ring-line-strong ring-inset",
        status === "em producao" && "bg-lime/12 text-fg ring-2 ring-lime-deep ring-inset",
        status === "pronto" && "bg-lime text-navy",
        status === "publicado" && "bg-action text-on-action",
      )}
    >
      {POST_STATUS_LABEL[status]}
    </span>
  );
}

export default function ConteudoPage() {
  const { db } = useData();
  const [front, setFront] = useState<"Todos" | "Software" | "Studio">("Todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const cycle = 1;
  const posts = db.posts.filter((p) => p.cycle === cycle);
  const shown = posts.filter((p) => front === "Todos" || p.front === front);
  const ready = posts.filter((p) => p.status === "pronto" || p.status === "publicado").length;
  const producing = posts.filter((p) => p.status === "em producao").length;
  const weeks = [...new Set(posts.map((p) => p.week))].sort();
  const current = db.posts.find((p) => p.id === openId) ?? null;
  const ordered = [...posts].sort((a, b) => a.week - b.week || ORDER.indexOf(a.weekday) - ORDER.indexOf(b.weekday));

  return (
    <div>
      <PageHeader
        kicker="Calendário editorial"
        title="Conteúdo"
        description="Software de segunda a quarta, Studio de quinta a sábado. Domingo fica para posts extras, revisão e planejamento."
      />

      <div className="gutter max-w-[1100px]">
        <section className="on-ink rounded-panel bg-ink p-6 text-on-ink md:p-8" aria-labelledby="ciclo">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="ciclo" className="text-[28px] font-semibold tracking-[-0.03em] text-on-ink">
              Ciclo {cycle}
            </h2>
            <p className="text-[15px] text-fog">
              <span className="font-semibold text-lime-glow">{ready} prontos</span>, {producing} em produção, {posts.length} no total
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="img" aria-label={`${ready} de ${posts.length} posts prontos`}>
            {ordered.map((p) => (
              <span
                key={p.id}
                title={`Semana ${p.week}, ${WEEKDAY_LABEL[p.weekday]}: ${POST_STATUS_LABEL[p.status]}`}
                className={cn(
                  "module size-8 md:size-9",
                  p.status === "pronto" || p.status === "publicado"
                    ? "bg-lime shadow-[0_0_14px_rgba(176,245,0,0.4)]"
                    : p.status === "em producao"
                      ? "bg-lime/25 ring-2 ring-lime-glow/70 ring-inset"
                      : "bg-white/[0.07] ring-1 ring-white/12 ring-inset",
                )}
              />
            ))}
          </div>
          <p className="mt-4 text-[13px] text-fog-dim">Cada módulo é um post, na ordem do ciclo.</p>
        </section>

        <div className="mt-8">
          <Segmented
            label="Frente"
            value={front}
            onChange={setFront}
            options={[
              ["Todos", "Todos"],
              ["Software", "Software"],
              ["Studio", "Studio"],
            ]}
          />
        </div>

        <div className="grid gap-10 pt-8">
          {weeks.map((w) => {
            const items = shown.filter((p) => p.week === w).sort((a, b) => ORDER.indexOf(a.weekday) - ORDER.indexOf(b.weekday));
            if (items.length === 0) return null;
            return (
              <section key={w} aria-labelledby={`w-${w}`}>
                <p className="kicker">Semana {w}</p>
                <h2 id={`w-${w}`} className="sr-only">
                  Semana {w}
                </h2>
                <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card bg-raised shadow-card ring-1 ring-line ring-inset">
                  {items.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => setOpenId(p.id)}
                        className="grid w-full grid-cols-[3rem_1fr] gap-4 px-5 py-4 text-left transition-colors hover:bg-surface md:grid-cols-[3.5rem_1fr_auto] md:items-center md:px-6"
                      >
                        <span className="pt-0.5 text-[15px] font-semibold text-accent-text">{WEEKDAY_LABEL[p.weekday]}</span>
                        <span className="min-w-0">
                          <span className="block text-[17px] leading-snug font-medium text-fg">{p.title}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-fg-muted">
                            <FrontTag front={p.front} />
                            <span>{p.format}</span>
                          </span>
                          {p.blocked_by && p.status !== "pronto" && p.status !== "publicado" && (
                            <span className="mt-2 block text-[13px] font-semibold text-warn">Bloqueado: {p.blocked_by}</span>
                          )}
                        </span>
                        <span className="col-start-2 flex items-center gap-2 md:col-start-auto">
                          <StatusPill status={p.status} />
                          {p.owner && <Avatar id={p.owner} className="size-7 text-[11px]" />}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <PostSheet post={current} onClose={() => setOpenId(null)} />
    </div>
  );
}

function PostSheet({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const { update } = useData();
  const [link, setLink] = useState("");

  return (
    <Sheet open={Boolean(post)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full data-[side=right]:w-full gap-0 overflow-x-hidden overflow-y-auto bg-surface sm:max-w-xl">
        {post && (
          <>
            <SheetHeader className="px-6 pt-8 pb-6">
              <p className="kicker">
                Semana {post.week}, {WEEKDAY_LABEL[post.weekday]}
              </p>
              <SheetTitle className="mt-2 text-[30px] leading-[1.08] font-semibold tracking-[-0.035em] text-fg">{post.title}</SheetTitle>
              <SheetDescription className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-fg-muted">
                <FrontTag front={post.front} /> {post.format}, {post.channel}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-7 border-t border-line px-6 py-7">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Situação">
                  <select
                    className={cn(inputClass, "field")}
                    value={post.status}
                    onChange={(e) => {
                      const s = e.target.value as PostStatus;
                      update("posts", post.id, { status: s });
                      toast.success(`Post marcado como ${POST_STATUS_LABEL[s].toLowerCase()}`);
                    }}
                  >
                    {POST_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quem faz">
                  <select className={cn(inputClass, "field")} value={post.owner ?? ""} onChange={(e) => update("posts", post.id, { owner: (e.target.value || null) as Post["owner"] })}>
                    <option value="">Sem dono</option>
                    {PEOPLE.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.short}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {post.blocked_by && <p className="rounded-field bg-surface-2 px-4 py-3 text-[15px] font-medium text-warn">Bloqueado: {post.blocked_by}</p>}
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.02em]">O que desenvolver</h3>
                <p className="mt-2 text-base leading-relaxed text-fg-muted">{post.brief}</p>
              </div>
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.02em]">Direção visual</h3>
                <p className="mt-2 text-base leading-relaxed text-fg-muted">{post.visual}</p>
              </div>
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  update("posts", post.id, { link: link.trim() || null });
                  toast.success("Link salvo");
                }}
              >
                <Field label="Link da peça (Drive, Canva ou post publicado)">
                  <input key={post.id} type="url" defaultValue={post.link ?? ""} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={inputClass} />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {post.link ? (
                    <a href={post.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-fg underline underline-offset-4">
                      Abrir a peça <ExternalLink className="size-4" aria-hidden />
                    </a>
                  ) : (
                    <span />
                  )}
                  <ActionButton type="submit">Salvar link</ActionButton>
                </div>
              </form>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
