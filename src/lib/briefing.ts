import type { DB } from "./store";
import type { PersonalNote, PersonId } from "./types";
import { PERSON } from "./people";
import { todayISO } from "./dates";

/** Anotações que as rotinas do Claude escrevem: "hoje" (dias úteis) e "resumo-AAAA-MM-DD" (segundas). */
export const isBriefingNote = (id: string) => id === "hoje" || id.startsWith("resumo-");

export function briefings(db: DB) {
  const today = todayISO();
  const hoje = db.personal_notes.find((n) => n.id === "hoje") ?? null;
  const hojeFresh = hoje && todayISO(new Date(hoje.updated_at)) === today ? hoje : null;
  const resumos = db.personal_notes.filter((n) => n.id.startsWith("resumo-")).sort((a, b) => b.id.localeCompare(a.id));
  return { hoje, hojeFresh, resumos, latestResumo: resumos[0] ?? null };
}

/** Separa o corpo da nota "Hoje" por pessoa (seções "## Leo", "## Fab"...). */
export function splitByPerson(note: PersonalNote) {
  const lines = note.body.split("\n");
  const title = lines.find((l) => l.startsWith("# "))?.slice(2) ?? note.title;
  const sections: Partial<Record<PersonId, string>> = {};
  let current: PersonId | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current) sections[current] = buf.join("\n").trim();
    buf = [];
  };
  for (const l of lines) {
    const h = /^##\s+(.+)$/.exec(l);
    if (h) {
      flush();
      const name = h[1].trim().toLowerCase();
      current = (Object.keys(PERSON) as PersonId[]).find((id) => PERSON[id].short.toLowerCase() === name) ?? null;
      continue;
    }
    if (current) buf.push(l);
  }
  flush();
  return { title, sections };
}

/** Quantas linhas de tarefa ("- [ ]") há num trecho. */
export const countTasks = (text?: string) => (text ? (text.match(/^- \[ \]/gm) ?? []).length : 0);
