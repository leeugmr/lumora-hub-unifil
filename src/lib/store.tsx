"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import type { Lead, LeadStage, PersonId, TableName, Tables } from "./types";
import { getSupabase, supabaseConfigured } from "./supabase";
import { seedClients, seedContracts, seedDecisions, seedLeads, seedNotes, seedPayments, seedPosts, seedProjects, seedTasks } from "./seed";

export type DB = { [K in TableName]: Tables[K][] };

const TABLES: TableName[] = ["tasks", "leads", "clients", "projects", "posts", "decisions", "notes", "personal_notes", "contracts", "payments", "lead_events"];
const LOCAL_KEY = "lumora-hub:db:v1";
const ME_KEY = "lumora-hub:me";

const EMPTY: DB = { tasks: [], leads: [], clients: [], projects: [], posts: [], decisions: [], notes: [], personal_notes: [], contracts: [], payments: [], lead_events: [] };

function seedDB(): DB {
  return {
    tasks: seedTasks,
    leads: seedLeads,
    clients: seedClients,
    projects: seedProjects,
    posts: seedPosts,
    decisions: seedDecisions,
    notes: seedNotes,
    personal_notes: [],
    contracts: seedContracts,
    payments: seedPayments,
    lead_events: seedLeads.map((l) => ({ id: `ev-${l.id}`, lead_id: l.id, from_stage: null, to_stage: l.stage, at: l.updated_at, by_person: null })),
  };
}

function readLocal(): DB {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<DB>) };
  } catch {
    /* armazenamento indisponível: usa os dados iniciais */
  }
  return seedDB();
}

function writeLocal(db: DB) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
  } catch {
    /* sem armazenamento: os dados ficam só nesta aba */
  }
}

async function loadRemote(): Promise<DB> {
  const sb = getSupabase()!;
  const results = await Promise.all(TABLES.map((t) => sb.from(t).select("*")));
  const db = { ...EMPTY };
  results.forEach((r, i) => {
    if (r.error) throw r.error;
    (db as Record<string, unknown[]>)[TABLES[i]] = r.data ?? [];
  });
  return db;
}

type Mode = "local" | "supabase";

type Ctx = {
  db: DB;
  ready: boolean;
  mode: Mode;
  session: Session | null;
  me: PersonId | null;
  setMe: (p: PersonId | null) => void;
  /** Supabase: o e-mail logado está na lista da equipe? */
  access: "unknown" | "team" | "outsider";
  /** A pessoa abriu o link de "esqueci a senha" e precisa definir uma nova. */
  recovering: boolean;
  endRecovery: () => void;
  insert: <K extends TableName>(table: K, row: Tables[K]) => Promise<void>;
  update: <K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>) => Promise<void>;
  remove: (table: TableName, id: string) => Promise<void>;
  resetLocal: () => void;
  signOut: () => Promise<void>;
};

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const mode: Mode = supabaseConfigured ? "supabase" : "local";
  const [db, setDb] = useState<DB>(EMPTY);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMeState] = useState<PersonId | null>(null);
  const [access, setAccess] = useState<Ctx["access"]>("unknown");
  const [recovering, setRecovering] = useState(false);
  const dbRef = useRef(db);
  dbRef.current = db;
  const userId = session?.user.id ?? null;
  const userEmail = session?.user.email ?? null;

  // Modo local: a pessoa é escolhida na tela "Quem está usando?" e lembrada no navegador.
  useEffect(() => {
    if (mode !== "local") return;
    try {
      const saved = localStorage.getItem(ME_KEY) as PersonId | null;
      if (saved) setMeState(saved);
    } catch {
      /* ignora */
    }
  }, [mode]);

  // Supabase: a pessoa vem da lista da equipe, pelo e-mail do login. Ninguém escolhe ser outra pessoa.
  useEffect(() => {
    if (mode !== "supabase") return;
    if (!userEmail) {
      setMeState(null);
      setAccess("unknown");
      return;
    }
    getSupabase()!
      .from("team_members")
      .select("person")
      .eq("email", userEmail.toLowerCase())
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error);
        if (data?.person) {
          setMeState(data.person as PersonId);
          setAccess("team");
        } else {
          setMeState(null);
          setAccess("outsider");
        }
      });
  }, [mode, userEmail]);

  const setMe = useCallback((p: PersonId | null) => {
    if (supabaseConfigured) return;
    setMeState(p);
    try {
      if (p) localStorage.setItem(ME_KEY, p);
      else localStorage.removeItem(ME_KEY);
    } catch {
      /* ignora */
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await loadRemote();
      setDb(next);
    } catch (e) {
      toast.error("Não foi possível carregar os dados. Confira a conexão e recarregue a página.");
      console.error(e);
    } finally {
      setReady(true);
    }
  }, []);

  // Local: lê do navegador. Supabase: espera a sessão e assina mudanças em tempo real.
  useEffect(() => {
    if (mode === "local") {
      setDb(readLocal());
      setReady(true);
      return;
    }
    const sb = getSupabase()!;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (!s) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [mode]);

  // Carrega e assina o tempo real só para quem é da equipe (depende do usuário, não de cada renovação de token).
  useEffect(() => {
    if (mode !== "supabase" || !userId || access !== "team") return;
    setReady(false);
    refresh();
    const sb = getSupabase()!;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = sb.channel("hub-changes");
    TABLES.forEach((t) =>
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(refresh, 300);
      }),
    );
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      sb.removeChannel(channel);
    };
  }, [mode, userId, access, refresh]);

  const commit = useCallback(
    (next: DB) => {
      // Atualiza a ref já: vários insert/update seguidos (parcelas, próximos passos da ata) leem o estado novo.
      dbRef.current = next;
      setDb(next);
      if (mode === "local") writeLocal(next);
    },
    [mode],
  );

  /** Modo local: faz o papel do gatilho lead_stage_log do banco. */
  const logStage = useCallback(
    (next: DB, leadId: string, from: LeadStage | null, to: LeadStage | undefined): DB => {
      if (mode !== "local" || !to || from === to) return next;
      const ev = { id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, lead_id: leadId, from_stage: from, to_stage: to, at: new Date().toISOString(), by_person: me };
      return { ...next, lead_events: [...next.lead_events, ev] };
    },
    [mode, me],
  );

  const insert = useCallback<Ctx["insert"]>(
    async (table, row) => {
      const prev = dbRef.current;
      let next = { ...prev, [table]: [...prev[table], row] } as DB;
      if (table === "leads") next = logStage(next, (row as Lead).id, null, (row as Lead).stage);
      commit(next);
      if (mode === "supabase") {
        const { error } = await getSupabase()!.from(table).insert(row);
        if (error) {
          commit(prev);
          toast.error("Não foi possível salvar. Tente de novo.");
        }
      }
    },
    [commit, mode, logStage],
  );

  const update = useCallback<Ctx["update"]>(
    async (table, id, patch) => {
      const prev = dbRef.current;
      const rows = prev[table] as Array<{ id: string }>;
      let next = { ...prev, [table]: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) } as DB;
      if (table === "leads") next = logStage(next, id, prev.leads.find((l) => l.id === id)?.stage ?? null, (patch as Partial<Lead>).stage);
      commit(next);
      if (mode === "supabase") {
        const { error } = await getSupabase()!
          .from(table)
          .update(patch as Record<string, unknown>)
          .eq("id", id);
        if (error) {
          commit(prev);
          toast.error("Não foi possível salvar a alteração. Tente de novo.");
        }
      }
    },
    [commit, mode, logStage],
  );

  const remove = useCallback<Ctx["remove"]>(
    async (table, id) => {
      const prev = dbRef.current;
      const rows = prev[table] as Array<{ id: string }>;
      commit({ ...prev, [table]: rows.filter((r) => r.id !== id) });
      if (mode === "supabase") {
        const { error } = await getSupabase()!.from(table).delete().eq("id", id);
        if (error) {
          commit(prev);
          toast.error("Não foi possível excluir. Tente de novo.");
        }
      }
    },
    [commit, mode],
  );

  const resetLocal = useCallback(() => {
    if (mode !== "local") return;
    const fresh = seedDB();
    commit(fresh);
  }, [commit, mode]);

  const signOut = useCallback(async () => {
    if (mode !== "supabase") return;
    await getSupabase()!.auth.signOut();
    setDb(EMPTY);
  }, [mode]);

  const endRecovery = useCallback(() => setRecovering(false), []);

  const value = useMemo<Ctx>(
    () => ({ db, ready, mode, session, me, setMe, access, recovering, endRecovery, insert, update, remove, resetLocal, signOut }),
    [db, ready, mode, session, me, setMe, access, recovering, endRecovery, insert, update, remove, resetLocal, signOut],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData precisa estar dentro de <DataProvider>");
  return ctx;
}
