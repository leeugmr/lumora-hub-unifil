import type { DB } from "./store";
import { PEOPLE } from "./people";

/** Tipos de coisa que um [[link]] pode apontar, e que viram pontos no mapa. */
export type LinkKind = "lead" | "client" | "project" | "decision" | "post" | "personal_note" | "person";

export type LinkTarget = { kind: LinkKind; id: string; label: string };

const WIKILINK = /\[\[([^\]\n]+)\]\]/g;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Tudo o que pode ser citado, com o nome pelo qual é citado. */
export function linkableTargets(db: DB): LinkTarget[] {
  return [
    ...PEOPLE.flatMap((p) => [
      { kind: "person" as const, id: p.id, label: p.short },
      { kind: "person" as const, id: p.id, label: p.name },
    ]),
    ...db.leads.map((l) => ({ kind: "lead" as const, id: l.id, label: l.name })),
    ...db.clients.map((c) => ({ kind: "client" as const, id: c.id, label: c.name })),
    ...db.projects.map((p) => ({ kind: "project" as const, id: p.id, label: p.name })),
    ...db.decisions.map((d) => ({ kind: "decision" as const, id: d.id, label: d.title })),
    ...db.posts.map((p) => ({ kind: "post" as const, id: p.id, label: p.title })),
    ...db.personal_notes.filter((n) => n.title.trim()).map((n) => ({ kind: "personal_note" as const, id: n.id, label: n.title })),
  ];
}

/** Resolve o texto de um [[link]] para um registro, sem diferenciar maiúsculas nem acentos. */
export function resolveLink(text: string, targets: LinkTarget[]): LinkTarget | null {
  const key = norm(text.split("|")[0]);
  return targets.find((t) => norm(t.label) === key) ?? null;
}

/** Textos dentro de [[ ]] num corpo de nota, na ordem e sem repetir. */
export function extractLinks(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(WIKILINK)) {
    const t = m[1].trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Quebra uma linha em pedaços de texto e de link, para renderizar. */
export function splitLinks(line: string): Array<{ text: string; link?: string }> {
  const parts: Array<{ text: string; link?: string }> = [];
  let last = 0;
  for (const m of line.matchAll(WIKILINK)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: line.slice(last, i) });
    const inner = m[1].trim();
    const [target, alias] = inner.split("|");
    parts.push({ text: (alias ?? target).trim(), link: target.trim() });
    last = i + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}
