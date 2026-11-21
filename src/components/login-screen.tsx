"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Wordmark } from "./brand";

const fieldClass =
  "mt-2 w-full rounded-field bg-ink/60 px-4 py-3 text-base text-on-ink ring-1 ring-white/[0.14] ring-inset outline-none placeholder:text-[#8597ab] focus-visible:ring-2 focus-visible:ring-lime-glow";

const primaryClass =
  "mt-1 min-h-[50px] w-full rounded-pill bg-white px-6 text-base font-semibold text-ink transition-shadow hover:shadow-glow-lime active:scale-[0.98] disabled:opacity-60";

/** Traduz os erros do Supabase Auth para a voz da Lumora: o que houve e como resolver. */
function explain(message: string) {
  const m = message.toLowerCase();
  if (m.includes("database error saving new user") || m.includes("email_fora_da_equipe"))
    return "Este e-mail não está na equipe da Lumora. Use o e-mail que o Leo cadastrou para você.";
  if (m.includes("invalid login credentials")) return "E-mail ou senha não conferem. Confira e tente de novo.";
  if (m.includes("email not confirmed")) return "Falta confirmar o e-mail. Abra o link que enviamos para a sua caixa de entrada.";
  if (m.includes("rate limit")) return "Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  return "Não deu certo. Confira a conexão e tente de novo.";
}

function Shell({ kicker, title, lead, children }: { kicker: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="on-ink grid min-h-dvh place-items-center bg-ink px-5 py-12 text-on-ink">
      <div className="w-full max-w-sm">
        <div>
          <Wordmark />
        </div>
        <p className="kicker mt-14">{kicker}</p>
        <h1 className="mt-4 text-[clamp(36px,5vw,52px)] leading-[1.04] font-medium tracking-[-0.04em] text-on-ink">{title}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-fog">{lead}</p>
        {children}
      </div>
    </div>
  );
}

type Mode = "entrar" | "criar" | "esqueci";

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setSent(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase()!;
    const cleanEmail = email.trim().toLowerCase();
    setBusy(true);
    setError(null);

    if (mode === "entrar") {
      const { error } = await sb.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) setError(explain(error.message));
    }

    if (mode === "criar") {
      if (password !== confirm) {
        setError("As duas senhas não são iguais. Digite de novo.");
      } else {
        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) setError(explain(error.message));
        else if (data.user && data.user.identities?.length === 0)
          setError("Este e-mail já tem conta. Entre com a sua senha ou use Esqueci a senha.");
        else if (data.session) toast.success("Conta criada");
        else setSent(`Enviamos um link de confirmação para ${cleanEmail}. Abra o e-mail e clique no link para entrar.`);
      }
    }

    if (mode === "esqueci") {
      const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, { redirectTo: window.location.origin });
      if (error) setError(explain(error.message));
      else setSent(`Se ${cleanEmail} for da equipe, enviamos um link para criar uma nova senha.`);
    }

    setBusy(false);
  }

  const copy = {
    entrar: { kicker: "Acesso da equipe", title: "Entrar no HUB", lead: "Use o e-mail que a Lumora cadastrou para você e a sua senha.", button: "Entrar no HUB" },
    criar: { kicker: "Primeiro acesso", title: "Criar minha conta", lead: "Use o e-mail que a Lumora cadastrou para você e escolha a sua senha. O HUB reconhece quem você é pelo e-mail.", button: "Criar minha conta" },
    esqueci: { kicker: "Acesso da equipe", title: "Esqueci a senha", lead: "Digite o seu e-mail. Enviamos um link para você criar uma senha nova.", button: "Enviar link" },
  }[mode];

  return (
    <Shell kicker={copy.kicker} title={copy.title} lead={copy.lead}>
      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-card bg-ink-raised p-5 ring-1 ring-white/10 ring-inset">
        <label className="block text-[15px] text-fog">
          E-mail
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </label>
        {mode !== "esqueci" && (
          <label className="block text-[15px] text-fog">
            {mode === "criar" ? "Escolha uma senha" : "Senha"}
            <input
              type="password"
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
        )}
        {mode === "criar" && (
          <label className="block text-[15px] text-fog">
            Repita a senha
            <input type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldClass} />
          </label>
        )}
        {error && (
          <p role="alert" className="text-[15px] leading-relaxed text-[#ffb4a8]">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="rounded-field bg-lime/12 px-4 py-3 text-[15px] leading-relaxed text-[#e9ffc0] ring-1 ring-lime-glow/50 ring-inset">
            {sent}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? "Um momento…" : copy.button}
        </button>
        {mode === "criar" && <p className="text-[13px] leading-relaxed text-fog-dim">Você vai receber um e-mail de confirmação. Só depois dele a conta funciona.</p>}
      </form>

      <nav aria-label="Outras opções de acesso" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
        {mode !== "entrar" && <LinkButton onClick={() => go("entrar")}>Já tenho conta</LinkButton>}
        {mode !== "criar" && <LinkButton onClick={() => go("criar")}>Criar minha conta</LinkButton>}
        {mode !== "esqueci" && <LinkButton onClick={() => go("esqueci")}>Esqueci a senha</LinkButton>}
      </nav>
    </Shell>
  );
}

function LinkButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={cn("min-h-11 text-fog underline-offset-4 hover:text-on-ink hover:underline", className)} />;
}

/** Depois do link de "esqueci a senha": a pessoa define a senha nova. */
export function NewPasswordScreen() {
  const { endRecovery } = useData();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("As duas senhas não são iguais. Digite de novo.");
    setBusy(true);
    const { error } = await getSupabase()!.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(explain(error.message));
    toast.success("Senha nova salva");
    endRecovery();
  }

  return (
    <Shell kicker="Acesso da equipe" title="Criar senha nova" lead="Escolha a senha que você vai usar daqui para frente.">
      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-card bg-ink-raised p-5 ring-1 ring-white/10 ring-inset">
        <label className="block text-[15px] text-fog">
          Senha nova
          <input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
        </label>
        <label className="block text-[15px] text-fog">
          Repita a senha
          <input type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldClass} />
        </label>
        {error && (
          <p role="alert" className="text-[15px] text-[#ffb4a8]">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? "Salvando…" : "Salvar senha nova"}
        </button>
      </form>
    </Shell>
  );
}

/** Logado, mas o e-mail não está na lista da equipe. */
export function OutsiderScreen() {
  const { session, signOut } = useData();
  return (
    <Shell
      kicker="Acesso da equipe"
      title="Este e-mail não está na equipe"
      lead={`Você entrou como ${session?.user.email ?? "um e-mail desconhecido"}, que não está na lista da Lumora. Saia e entre com o e-mail que a Lumora cadastrou para você.`}
    >
      <button onClick={signOut} className={cn(primaryClass, "mt-8")}>
        Sair e trocar de e-mail
      </button>
    </Shell>
  );
}
