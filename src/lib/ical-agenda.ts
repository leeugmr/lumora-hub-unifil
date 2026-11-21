// Lê um arquivo iCal (.ics) e devolve os eventos de hoje e amanhã (horário de São Paulo),
// expandindo os eventos repetidos e aplicando as exceções. Usado por /api/agenda.

import ICAL from "ical.js";

export type AgendaEvent = {
  id: string;
  title: string;
  day: "hoje" | "amanha";
  start: string; // ISO; dia inteiro: AAAA-MM-DD
  end: string;
  allDay: boolean;
  location: string;
  link: string | null;
};

const TZ_OFFSET = "-03:00"; // São Paulo, sem horário de verão desde 2019
const MAX_STEPS = 20000;

function spDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function meetLink(text: string) {
  return text.match(/https:\/\/(meet\.google\.com|[\w.-]*zoom\.us|teams\.microsoft\.com)\/[^\s<>"]+/i)?.[0] ?? null;
}

export function eventsFromIcs(text: string, now = new Date()): AgendaEvent[] {
  const today = spDate(now);
  const tomorrow = spDate(new Date(now.getTime() + 86400000));
  const rangeStart = new Date(`${today}T00:00:00${TZ_OFFSET}`);
  const rangeEnd = new Date(rangeStart.getTime() + 2 * 86400000);

  const comp = new ICAL.Component(ICAL.parse(text));
  for (const tz of comp.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const vevents = comp.getAllSubcomponents("vevent");
  const cancelled = (c: ICAL.Component) => String(c.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";
  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const v of vevents) {
    const ev = new ICAL.Event(v);
    if (v.hasProperty("recurrence-id")) exceptions.push(ev);
    else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) {
    const master = masters.get(ex.uid);
    if (master) master.relateException(ex);
    else masters.set(`${ex.uid}-${ex.recurrenceId}`, ex);
  }

  const events: AgendaEvent[] = [];
  const add = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time, key: string) => {
    const allDay = start.isDate;
    const s = allDay ? start.toString() : start.toJSDate().toISOString();
    const e = allDay ? end.toString() : end.toJSDate().toISOString();
    const startDay = allDay ? s : spDate(new Date(s));
    // Dia inteiro: aparece em cada dia que cobre (o fim é exclusivo).
    for (const [day, iso] of [["hoje", today], ["amanha", tomorrow]] as const) {
      const covers = allDay ? s <= iso && iso < e : startDay === iso;
      if (!covers) continue;
      const description = String(item.description ?? "");
      const location = String(item.location ?? "");
      events.push({
        id: `${key}-${day}`,
        title: item.summary || "(sem título)",
        day,
        start: s,
        end: e,
        allDay,
        location: meetLink(location) ? "" : location,
        link: meetLink(location) ?? meetLink(description) ?? (item.component.getFirstPropertyValue("x-google-conference") as string | null) ?? null,
      });
    }
  };

  for (const [uid, ev] of masters) {
    if (!ev.isRecurring()) {
      if (!ev.startDate || cancelled(ev.component)) continue;
      const end = ev.endDate ?? ev.startDate;
      if (end.toJSDate() <= rangeStart || ev.startDate.toJSDate() >= rangeEnd) continue;
      add(ev, ev.startDate, end, uid);
      continue;
    }
    const it = ev.iterator();
    let next: ICAL.Time | null;
    let steps = 0;
    while ((next = it.next()) && steps++ < MAX_STEPS) {
      const occStart = next.toJSDate();
      if (occStart >= rangeEnd) break;
      const det = ev.getOccurrenceDetails(next);
      if (det.endDate.toJSDate() <= rangeStart || cancelled(det.item.component)) continue;
      add(det.item, det.startDate, det.endDate, `${uid}-${next.toString()}`);
    }
  }

  const dayOrder = (d: AgendaEvent["day"]) => (d === "hoje" ? 0 : 1);
  events.sort((a, b) => dayOrder(a.day) - dayOrder(b.day) || Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
  return events;
}
