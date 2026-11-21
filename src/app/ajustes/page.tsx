"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import {
  canPromptInstall,
  currentSubscription,
  disablePush,
  enablePush,
  isIOS,
  isStandalone,
  onInstallChange,
  promptInstall,
  pushSupported,
  sendTestPush,
} from "@/lib/device";
import { cn } from "@/lib/utils";
import { ActionButton, Field, PageHeader, QuietButton, SecondaryButton, inputClass } from "@/components/ui-bits";

function Card({ id, icon: Icon, title, children }: { id: string; icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 rounded-card bg-raised p-6 shadow-card ring-1 ring-line ring-inset md:p-7">
      <h2 id={`${id}-t`} className="flex items-center gap-3 text-[21px] font-semibold tracking-[-0.02em]">
        <span className="module grid size-9 place-items-center bg-lime text-navy">
          <Icon className="size-[18px]" strokeWidth={2.2} aria-hidden />
        </span>
        {title}
      </h2>
      <div className="mt-4 grid gap-4 text-[15px] leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

export default function AjustesPage() {
  const { mode } = useData();
  return (
    <div>
      <PageHeader kicker="Ajustes" title="Este aparelho e você" description="Instalar o HUB, ligar os avisos e conectar sua agenda." />
      <div className="gutter grid max-w-[760px] gap-5">
        <InstallCard />
        {mode === "supabase" ? (
          <>
            <PushCard />
            <CalendarCard />
          </>
        ) : (
          <p className="text-[15px] text-fg-muted">Avisos e agenda funcionam só com o login da equipe (modo Supabase).</p>
        )}
      </div>
    </div>
  );
}

function InstallCard() {
  const [standalone, setStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const sync = () => {
      setStandalone(isStandalone());
      setCanPrompt(canPromptInstall());
      setIos(isIOS());
    };
    sync();
    return onInstallChange(sync);
  }, []);

  return (
    <Card id="app" icon={Smartphone} title="O HUB como app">
      {standalone ? (
        <p>O HUB já está instalado neste aparelho. Ele abre direto, sem a barra do navegador.</p>
      ) : canPrompt ? (
        <>
          <p>Coloque o HUB na tela inicial: ele abre como um app, sem a barra do navegador.</p>
          <ActionButton className="justify-self-start" onClick={() => promptInstall().then((ok) => ok && toast.success("HUB instalado"))}>
            Instalar o HUB
          </ActionButton>
        </>
      ) : ios ? (
        <ol className="list-decimal space-y-1 pl-5">
          <li>Abra o HUB no Safari.</li>
          <li>Toque em Compartilhar (o quadrado com a seta para cima).</li>
          <li>Escolha &quot;Adicionar à Tela de Início&quot; e confirme.</li>
        </ol>
      ) : (
        <ol className="list-decimal space-y-1 pl-5">
          <li>No celular Android, abra o HUB no Chrome.</li>
          <li>Toque no menu (três pontos) e em &quot;Instalar app&quot; ou &quot;Adicionar à tela inicial&quot;.</li>
          <li>No computador, use o ícone de instalar na barra de endereço do Chrome ou do Edge.</li>
        </ol>
      )}
    </Card>
  );
}

function PushCard() {
  const { me } = useData();
  const [state, setState] = useState<"loading" | "on" | "off" | "denied" | "unsupported">("loading");
  const [busy, setBusy] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    setNeedsInstall(isIOS() && !isStandalone());
    if (!pushSupported()) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    currentSubscription().then((s) => setState(s ? "on" : "off"));
  }, []);

  async function turnOn() {
    if (!me) return;
    setBusy(true);
    const r = await enablePush(me);
    setBusy(false);
    if (r === "ok") {
      setState("on");
      toast.success("Avisos ligados neste aparelho");
    } else if (r === "denied") setState("denied");
    else if (r === "unsupported") setState("unsupported");
    else toast.error("Não deu para ligar os avisos. Tente de novo.");
  }

  async function turnOff() {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setState("off");
    toast.success("Avisos desligados neste aparelho");
  }

  return (
    <Card id="avisos" icon={Bell} title="Avisos no celular">
      <p>O HUB te avisa quando alguém te passa uma tarefa e, de segunda a sábado às 7h, manda um resumo com o que vence hoje, o que atrasou e as cobranças.</p>
      {state === "unsupported" && needsInstall && <p className="font-medium text-fg">No iPhone, instale o HUB na tela inicial primeiro (acima) e abra por lá. Depois volte aqui.</p>}
      {state === "unsupported" && !needsInstall && <p className="font-medium text-fg">Este navegador não aceita avisos. Use o Chrome, o Edge ou o HUB instalado.</p>}
      {state === "denied" && (
        <p className="font-medium text-fg">Os avisos estão bloqueados para o HUB. Libere nas configurações do navegador (cadeado ao lado do endereço) e volte aqui.</p>
      )}
      {state === "off" && (
        <ActionButton className="justify-self-start" disabled={busy} onClick={turnOn}>
          Ligar avisos neste aparelho
        </ActionButton>
      )}
      {state === "on" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-lime/12 px-4 font-medium text-fg ring-2 ring-lime-deep ring-inset">Ligados neste aparelho</span>
          <SecondaryButton disabled={busy} onClick={() => sendTestPush().then((ok) => (ok ? toast.success("Aviso de teste enviado") : toast.error("Não deu para enviar o teste.")))}>
            Enviar um teste
          </SecondaryButton>
          <QuietButton disabled={busy} onClick={turnOff}>
            Desligar
          </QuietButton>
        </div>
      )}
      <p className="text-[13px] text-fg-subtle">Cada aparelho liga os avisos separado: celular e computador.</p>
    </Card>
  );
}

function CalendarCard() {
  const { me } = useData();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    getSupabase()
      ?.from("personal_settings")
      .select("calendar_ics")
      .maybeSingle()
      .then(({ data }) => {
        setSaved(data?.calendar_ics ?? "");
        setValue(data?.calendar_ics ?? "");
      });
  }, []);

  async function save(next: string | null) {
    if (!me) return;
    const clean = next?.trim() || null;
    if (clean && !/^(https|webcal):\/\//i.test(clean)) {
      toast.error("Cole o endereço completo, começando com https:// ou webcal://");
      return;
    }
    const { error } = await getSupabase()!.from("personal_settings").upsert({ person: me, calendar_ics: clean, updated_at: new Date().toISOString() });
    if (error) {
      toast.error("Não deu para salvar. Tente de novo.");
      return;
    }
    setSaved(clean ?? "");
    setValue(clean ?? "");
    toast.success(clean ? "Agenda conectada. Ela aparece na tela Hoje." : "Agenda desconectada");
  }

  const connected = Boolean(saved);

  return (
    <Card id="agenda" icon={CalendarDays} title="Sua agenda">
      <p>As reuniões de hoje aparecem na tela Hoje, com o botão Anotar: a ata fica salva e os próximos passos viram tarefas.</p>
      <details className="rounded-field bg-surface-2 px-4 py-3" open={!connected}>
        <summary className="min-h-9 cursor-pointer font-medium text-fg">Como pegar o link no Google Agenda</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>No computador, abra calendar.google.com.</li>
          <li>Na lista &quot;Minhas agendas&quot;, passe o mouse na sua agenda, clique nos três pontos e em &quot;Configurações e compartilhamento&quot;.</li>
          <li>Desça até &quot;Integrar agenda&quot; e copie o &quot;Endereço secreto no formato iCal&quot;.</li>
          <li>Cole aqui embaixo e salve.</li>
        </ol>
        <p className="mt-2 text-[13px]">No Outlook: Configurações, Calendário, Calendários compartilhados, Publicar um calendário, link ICS.</p>
      </details>
      <Field label="Endereço secreto iCal">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className={cn(inputClass, "font-mono text-[14px]")}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <p className="text-[13px] text-fg-subtle">Esse link é só seu: ninguém da equipe consegue ver. Quem tiver o link vê sua agenda, então não compartilhe.</p>
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton disabled={saved === null || value.trim() === (saved ?? "")} onClick={() => save(value)}>
          {connected ? "Salvar novo link" : "Conectar agenda"}
        </ActionButton>
        {connected && <QuietButton onClick={() => save(null)}>Desconectar</QuietButton>}
      </div>
    </Card>
  );
}
