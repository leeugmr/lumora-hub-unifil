import type { Person, PersonId } from "./types";

// Os quatro sócios da Lumora.
export const PEOPLE: Person[] = [
  { id: "leo", name: "Leonardo Gabriel", short: "Leo", area: "Software e edição" },
  { id: "fab", name: "Fabiano Francisco", short: "Fab", area: "Software" },
  { id: "bea", name: "Beatriz Joquebede", short: "Bea", area: "Marketing e design" },
  { id: "fran", name: "Franciely Santos", short: "Fran", area: "Atendimento e comercial" },
];

export const PERSON: Record<PersonId, Person> = Object.fromEntries(
  PEOPLE.map((p) => [p.id, p]),
) as Record<PersonId, Person>;

export function personShort(id: PersonId | null | undefined) {
  return id ? PERSON[id]?.short ?? id : "Sem dono";
}
