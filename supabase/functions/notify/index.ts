// Lumora HUB: avisos no celular (Web Push).
// Chamada só pelo banco (private.notify_hub), com o segredo hub_push_secret no cabeçalho x-hub-secret.
// Tipos: task_assigned (tarefa nova para alguém), daily (resumo das 7h), test (aviso de teste).
// Lê o banco direto (SUPABASE_DB_URL) e as chaves VAPID do Vault. Deploy: MCP do Supabase, verify_jwt = false.

import postgres from "npm:postgres@3.4.5";
import webpush from "npm:web-push@3.6.7";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const SHORT: Record<string, string> = { leo: "Leo", fab: "Fab", bea: "Bea", fran: "Fran" };
const TZ = "America/Sao_Paulo";

type Cfg = { secret: string; pub: string; priv: string };
let cfg: Cfg | null = null;

async function config(): Promise<Cfg> {
  if (cfg) return cfg;
  const rows = await sql`
    select name, decrypted_secret from vault.decrypted_secrets
    where name in ('hub_push_secret', 'hub_vapid_public', 'hub_vapid_private')`;
  const m = Object.fromEntries(rows.map((r) => [r.name, r.decrypted_secret]));
  cfg = { secret: m.hub_push_secret, pub: m.hub_vapid_public, priv: m.hub_vapid_private };
  webpush.setVapidDetails("https://hub.lumoratech.tech", cfg.pub, cfg.priv);
  return cfg;
}

type Payload = { title: string; body: string; url: string; tag?: string };

async function send(people: string[], payload: Payload) {
  if (people.length === 0) return 0;
  const subs = await sql`select endpoint, p256dh, auth from public.push_subscriptions where person = any(${people})`;
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
          TTL: 60 * 60 * 12,
          urgency: "normal",
        });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // Aparelho desinscrito ou expirado: remove a inscrição.
        if (code === 404 || code === 410) await sql`delete from public.push_subscriptions where endpoint = ${s.endpoint}`;
        else console.error("push falhou", code, (e as Error).message);
      }
    }),
  );
  return sent;
}

function todaySP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function dueText(due: string | null, today: string) {
  if (!due) return "";
  if (due === today) return " · vence hoje";
  if (due < today) return " · atrasada";
  const [, m, d] = due.split("-");
  return ` · prazo ${d}/${m}`;
}

// Cobranças (mesma regra de src/lib/money.ts): mensal gera uma por mês desde o início; único gera uma.
function lastDay(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function pendingCharges(
  contracts: { id: string; kind: string; due_day: number | null; due_date: string | null; start_date: string; end_date: string | null; owner: string | null }[],
  paid: Set<string>,
  today: string,
) {
  const out: { owner: string | null; due: string }[] = [];
  const [ty, tm] = today.split("-").map(Number);
  for (const c of contracts) {
    if (c.kind === "unico") {
      const due = c.due_date ?? c.start_date;
      if (!paid.has(`${c.id}|${due.slice(0, 7)}`) && due <= today) out.push({ owner: c.owner, due });
      continue;
    }
    let [y, m] = c.start_date.split("-").map(Number);
    if ((ty - y) * 12 + (tm - m) > 12) [y, m] = [tm === 12 ? ty : ty - 1, tm === 12 ? 1 : tm + 1];
    while (y < ty || (y === ty && m <= tm)) {
      const period = `${y}-${String(m).padStart(2, "0")}`;
      const due = `${period}-${String(Math.min(c.due_day ?? 10, lastDay(y, m))).padStart(2, "0")}`;
      if (due >= c.start_date && (!c.end_date || due <= c.end_date) && due <= today && !paid.has(`${c.id}|${period}`)) out.push({ owner: c.owner, due });
      m++;
      if (m > 12) [y, m] = [y + 1, 1];
    }
  }
  return out;
}

async function daily() {
  const today = todaySP();
  const tasks = await sql`select owners, to_char(due, 'YYYY-MM-DD') as due from public.tasks where not done and due is not null and due <= ${today}`;
  const contracts = await sql`
    select id, kind, due_day, to_char(due_date, 'YYYY-MM-DD') as due_date, to_char(start_date, 'YYYY-MM-DD') as start_date,
           to_char(end_date, 'YYYY-MM-DD') as end_date, owner
    from public.contracts where status = 'ativo'`;
  const payments = await sql`select contract_id, period from public.payments`;
  const paid = new Set(payments.map((p) => `${p.contract_id}|${p.period}`));
  const charges = pendingCharges(contracts as never, paid, today);

  let sent = 0;
  for (const person of Object.keys(SHORT)) {
    const mine = tasks.filter((t) => (t.owners as string[]).includes(person));
    const dueToday = mine.filter((t) => t.due === today).length;
    const late = mine.length - dueToday;
    const toCharge = charges.filter((c) => c.owner === person).length;
    const parts: string[] = [];
    if (dueToday) parts.push(`${dueToday} ${dueToday === 1 ? "tarefa vence" : "tarefas vencem"} hoje`);
    if (late) parts.push(`${late} ${late === 1 ? "atrasada" : "atrasadas"}`);
    if (toCharge) parts.push(`${toCharge} ${toCharge === 1 ? "cobrança" : "cobranças"} para fazer`);
    if (parts.length === 0) continue;
    sent += await send([person], { title: `Bom dia, ${SHORT[person]}`, body: parts.join(", ") + ".", url: toCharge && !dueToday && !late ? "/dinheiro" : "/", tag: "daily" });
  }
  return sent;
}

async function taskAssigned(taskId: string, to: string[], actor: string | null) {
  const [task] = await sql`select title, to_char(due, 'YYYY-MM-DD') as due, done from public.tasks where id = ${taskId}`;
  if (!task || task.done) return 0;
  const people = to.filter((p) => p !== actor && p in SHORT);
  const who = actor && SHORT[actor] ? `${SHORT[actor]} te passou uma tarefa` : "Nova tarefa para você";
  return send(people, { title: who, body: `${task.title}${dueText(task.due, todaySP())}`, url: "/", tag: `task-${taskId}` });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("método não permitido", { status: 405 });
  const c = await config();
  if (!c.secret || req.headers.get("x-hub-secret") !== c.secret) return new Response("não autorizado", { status: 401 });
  const body = await req.json().catch(() => ({}));
  let sent = 0;
  if (body.type === "task_assigned") sent = await taskAssigned(String(body.task_id), body.to ?? [], body.actor ?? null);
  else if (body.type === "daily") sent = await daily();
  else if (body.type === "test" && Array.isArray(body.to))
    sent = await send(body.to, { title: "Avisos ligados", body: "É assim que o HUB vai te avisar de tarefas e prazos.", url: "/ajustes", tag: "test" });
  return Response.json({ ok: true, sent });
});
