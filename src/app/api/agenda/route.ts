// Agenda de hoje e amanhã de quem pede. Lê o link secreto iCal da pessoa (tabela personal_settings,
// só o dono enxerga) usando o login dela, baixa a agenda e expande os eventos repetidos.
// O link nunca vem do navegador: só o token de login.

import { eventsFromIcs, type AgendaEvent } from "@/lib/ical-agenda";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export type { AgendaEvent };
export type AgendaResponse = { connected: boolean; events: AgendaEvent[]; error?: string };

const ALLOWED = [/^calendar\.google\.com$/, /^outlook\.(office365|live)\.com$/, /(^|\.)icloud\.com$/];
function reply(body: AgendaResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return reply({ connected: false, events: [], error: "sem login" }, 401);

  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: user } = await sb.auth.getUser(token);
  if (!user.user) return reply({ connected: false, events: [], error: "sem login" }, 401);

  const { data: settings } = await sb.from("personal_settings").select("calendar_ics").maybeSingle();
  const raw = settings?.calendar_ics?.trim();
  if (!raw) return reply({ connected: false, events: [] });

  let icsUrl: URL;
  try {
    icsUrl = new URL(raw.replace(/^webcal:\/\//i, "https://"));
  } catch {
    return reply({ connected: true, events: [], error: "O link da agenda não é válido." });
  }
  if (icsUrl.protocol !== "https:" || !ALLOWED.some((r) => r.test(icsUrl.hostname)))
    return reply({ connected: true, events: [], error: "Use o endereço secreto iCal do Google Agenda, Outlook ou iCloud." });

  let text: string;
  try {
    const res = await fetch(icsUrl, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) return reply({ connected: true, events: [], error: "A agenda não respondeu. Confira se o link ainda vale." });
    text = await res.text();
  } catch {
    return reply({ connected: true, events: [], error: "Não deu para abrir a agenda agora." });
  }

  try {
    return reply({ connected: true, events: eventsFromIcs(text) });
  } catch (e) {
    console.error("agenda", e);
    return reply({ connected: true, events: [], error: "Não entendi o formato da agenda." });
  }
}
