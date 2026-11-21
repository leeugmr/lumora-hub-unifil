// Datas no fuso de quem usa. Prazos são guardados como AAAA-MM-DD.

export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + n));
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function dueLabel(iso: string | null, today = todayISO()) {
  if (!iso) return "Sem prazo";
  if (iso === today) return "Hoje";
  if (iso === addDays(today, 1)) return "Amanhã";
  if (iso === addDays(today, -1)) return "Ontem";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const diff = Math.round((date.getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  if (diff > 1 && diff < 7) return WEEKDAYS[date.getDay()];
  return `${d} ${MONTHS[m - 1]}`;
}

export function shortDate(isoDateTime: string) {
  const d = new Date(isoDateTime);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function daysSince(isoDateTime: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(isoDateTime).getTime()) / 86400000));
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function newId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

const LONG_WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const LONG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function longDate(d = new Date()) {
  return `${LONG_WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${LONG_MONTHS[d.getMonth()]}`;
}
