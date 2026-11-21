"use client";

// Gerador de contratos (/dinheiro/contrato): escolhe as informações, gera a minuta pelo modelo de
// `lib/contract-template.ts`, deixa editar na prévia, baixa em PDF (impressão do navegador) e salva o
// texto em `contracts.document`. Abre com ?contrato=<id> (contrato existente) ou ?cliente=<id>.

import { useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { useData, type DB } from "@/lib/store";
import { PEOPLE, PERSON } from "@/lib/people";
import { newId, todayISO } from "@/lib/dates";
import {
  DEFAULT_OPTIONS,
  DOC_CSS,
  OPTION_INFO,
  PAY_METHODS,
  SERVICE_PRESETS,
  buildContract,
  installmentPlan,
  printContract,
  sanitizeDoc,
  type GenFront,
  type GenInput,
  type GenOptions,
} from "@/lib/contract-template";
import type { Client, Contract, PersonId, ValueKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionButton, EmptyState, Field, PageHeader, QuietButton, SecondaryButton, Segmented, inputClass } from "./ui-bits";

type Form = GenInput & { clientId: string; owner: PersonId | ""; register: boolean };

function blankForm(): Form {
  return {
    clientId: "",
    owner: "",
    register: true,
    front: "Software",
    clientName: "",
    clientKind: "pj",
    clientDoc: "",
    clientAddress: "",
    clientRep: "",
    clientRepDoc: "",
    clientEmail: "",
    lumoraName: "Lumora Software",
    lumoraKind: "pf",
    lumoraDoc: "",
    lumoraAddress: "",
    lumoraSigner: "",
    lumoraEmail: "",
    service: "",
    scopeIn: "",
    scopeOut: "",
    revisions: "2",
    approvalDays: "5",
    kind: "unico",
    amount: 0,
    payMethod: "Pix",
    payInfo: "",
    dueDay: "10",
    installments: "1",
    firstDue: "",
    startDate: todayISO(),
    endDate: "",
    deliveryDays: "",
    noticeDays: "30",
    supportDays: "30",
    city: "São Paulo/SP",
    signDate: todayISO(),
    options: { ...DEFAULT_OPTIONS },
  };
}

const genFront = (f: string): GenFront => (f === "Studio" ? "Studio" : "Software");

/** Aplica o cliente escolhido: nome, frente, valor mensal e o que ele recebe. */
function withClient(f: Form, c: Client | undefined): Form {
  if (!c) return { ...f, clientId: "" };
  const front = genFront(c.front);
  return {
    ...f,
    clientId: c.id,
    clientName: c.name,
    front,
    lumoraName: f.lumoraName === "Lumora Software" || f.lumoraName === "Lumora Studio" ? `Lumora ${front}` : f.lumoraName,
    amount: f.amount || c.monthly_value || 0,
    kind: c.monthly_value ? "mensal" : f.kind,
  };
}

function initialForm(db: DB, me: PersonId | null, contract: Contract | undefined, clientId: string | null): Form {
  let f: Form = { ...blankForm(), owner: me ?? "" };
  if (me) f.lumoraSigner = PERSON[me]?.name ?? "";
  const client = db.clients.find((c) => c.id === (contract?.client_id ?? clientId));
  f = withClient(f, client);
  if (contract) {
    f = {
      ...f,
      register: false,
      service: contract.title || f.service,
      kind: contract.kind,
      amount: contract.amount,
      dueDay: String(contract.due_day ?? 10),
      firstDue: contract.due_date ?? "",
      startDate: contract.start_date,
      endDate: contract.end_date ?? "",
      owner: contract.owner ?? f.owner,
    };
  }
  return f;
}

export function ContractGenerator() {
  const { db, ready, me, insert, update } = useData();
  const params = useSearchParams();
  const contractParam = params.get("contrato");
  const clientParam = params.get("cliente");
  const sourceKey = `${contractParam ?? ""}|${clientParam ?? ""}`;

  const [form, setForm] = useState<Form>(blankForm);
  const [initFor, setInitFor] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [doc, setDoc] = useState({ html: "", missing: [] as string[], version: 0 });
  const [edited, setEdited] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  // A prévia é editável à mão: o texto entra no elemento só quando o contrato é gerado/aberto,
  // e o React não mexe mais nele (dangerouslySetInnerHTML apagava as edições a cada render).
  useLayoutEffect(() => {
    if (step === "preview" && paperRef.current) paperRef.current.innerHTML = doc.html;
  }, [step, doc.version, doc.html]);

  // Preenche uma vez por origem, quando os dados chegam (mesmo padrão do ContractDialog: setState no render).
  if (ready && initFor !== sourceKey) {
    const contract = contractParam ? db.contracts.find((c) => c.id === contractParam) : undefined;
    setInitFor(sourceKey);
    setForm(initialForm(db, me, contract, clientParam));
    setLinkedId(contract?.id ?? null);
    if (contract?.document) {
      setDoc((d) => ({ html: sanitizeDoc(contract.document!), missing: [], version: d.version + 1 }));
      setStep("preview");
    }
  }

  const linked = linkedId ? db.contracts.find((c) => c.id === linkedId) : undefined;
  const clients = [...db.clients].sort((a, b) => a.name.localeCompare(b.name));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setOpt = (k: keyof GenOptions, v: boolean) => setForm((f) => ({ ...f, options: { ...f.options, [k]: v } }));
  const mensal = form.kind === "mensal";

  function pickFront(front: GenFront) {
    setForm((f) => ({ ...f, front, lumoraName: f.lumoraName === `Lumora ${f.front}` ? `Lumora ${front}` : f.lumoraName }));
  }

  function pickPreset(p: (typeof SERVICE_PRESETS)[GenFront][number]) {
    setForm((f) => ({
      ...f,
      service: p.label,
      kind: p.kind ?? f.kind,
      amount: f.amount || p.amount || 0,
      scopeIn: f.scopeIn || p.scope || "",
    }));
  }

  function generate(e: React.FormEvent) {
    e.preventDefault();
    const problems: string[] = [];
    if (!form.clientName.trim()) problems.push("o cliente");
    if (!form.service.trim()) problems.push("o serviço");
    if (!form.amount) problems.push("o valor");
    if (!form.startDate) problems.push("a data de início");
    if (!mensal && !form.firstDue) problems.push("a data do primeiro pagamento");
    if (problems.length) {
      toast.error(`Falta informar ${problems.join(", ")}.`);
      return;
    }
    if (edited && !confirm("Gerar de novo apaga as mudanças feitas à mão na prévia. Continuar?")) return;
    const g = buildContract(form);
    setDoc((d) => ({ html: g.html, missing: g.missing, version: d.version + 1 }));
    setEdited(false);
    setStep("preview");
    window.scrollTo({ top: 0 });
  }

  const currentHtml = () => sanitizeDoc(paperRef.current?.innerHTML ?? doc.html);
  const fileTitle = `Contrato ${form.clientName || linked?.title || ""} ${todayISO()}`.replace(/\s+/g, " ").trim();

  function leavePreview() {
    const html = currentHtml();
    setDoc((d) => ({ ...d, html }));
    setStep("form");
    window.scrollTo({ top: 0 });
  }

  function downloadPdf() {
    printContract(currentHtml(), fileTitle);
  }

  function save() {
    const html = currentHtml();
    const now = new Date().toISOString();
    if (linked) {
      update("contracts", linked.id, { document: html, document_at: now, updated_at: now });
      toast.success("Contrato salvo no HUB");
      setEdited(false);
      return;
    }
    if (!form.register) {
      toast.error("Ligue \"Registrar na tela Dinheiro\" nas informações para salvar o contrato no HUB, ou só baixe o PDF.");
      return;
    }
    if (!form.clientId) {
      toast.error("Para registrar, escolha um cliente cadastrado no HUB.");
      return;
    }
    const base = {
      client_id: form.clientId,
      kind: form.kind as ValueKind,
      start_date: form.startDate || todayISO(),
      end_date: mensal ? form.endDate || null : null,
      status: "ativo" as const,
      owner: (form.owner || null) as PersonId | null,
      notes: "",
      created_at: now,
      updated_at: now,
    };
    if (mensal) {
      const id = newId("ct");
      insert("contracts", {
        id,
        ...base,
        title: form.service.trim(),
        amount: Math.round(form.amount),
        due_day: Math.min(31, Math.max(1, Number(form.dueDay) || 10)),
        due_date: null,
        document: html,
        document_at: now,
      });
      setLinkedId(id);
    } else {
      // Valor único parcelado: uma linha por parcela, para cada cobrança aparecer na data certa.
      const plan = installmentPlan(Math.round(form.amount) * 100, Number(form.installments) || 1, form.firstDue);
      const ids = plan.map(() => newId("ct"));
      plan.forEach((p, i) =>
        insert("contracts", {
          id: ids[i],
          ...base,
          title: plan.length > 1 ? `${form.service.trim()}, parcela ${i + 1}/${plan.length}` : form.service.trim(),
          amount: Math.round(p.cents / 100),
          due_day: null,
          due_date: p.date,
          notes: plan.length > 1 ? "Contrato gerado no HUB está na parcela 1." : "",
          document: i === 0 ? html : null,
          document_at: i === 0 ? now : null,
        }),
      );
      setLinkedId(ids[0]);
    }
    setEdited(false);
    toast.success("Contrato salvo e registrado em Dinheiro", { description: "As cobranças já aparecem na tela Dinheiro." });
  }

  if (!ready) return null;

  return (
    <div>
      <style>{DOC_CSS}</style>
      <PageHeader
        kicker="Dinheiro"
        title={step === "form" ? "Gerar contrato" : "Prévia do contrato"}
        description={
          step === "form"
            ? "Escolha as informações e gere a minuta. Depois dá para editar o texto, baixar em PDF e salvar no HUB."
            : "Clique no texto para editar. Os trechos em amarelo faltam preencher."
        }
        action={
          <Link href="/dinheiro" className="inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-[15px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden /> Dinheiro
          </Link>
        }
      />

      <div className="gutter max-w-[960px] pb-16">
        <div className="mb-8 flex gap-3 rounded-card bg-warn/10 p-4 text-[15px] leading-relaxed text-fg ring-1 ring-warn/40 ring-inset" role="note">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
          <p>
            <strong className="font-semibold">Rascunho, não é parecer jurídico.</strong> O modelo foi escrito para ser equilibrado para as duas partes, com base no Código Civil e na LGPD,
            mas precisa ser revisado por um advogado antes de ser usado com clientes.
          </p>
        </div>

        {step === "form" ? (
          clients.length === 0 && !form.clientName ? (
            <EmptyState>Cadastre o cliente primeiro na tela Clientes.</EmptyState>
          ) : (
            <form onSubmit={generate} className="grid gap-10">
              <Block title="Cliente e frente">
                <Field label="Cliente *" className="sm:col-span-2">
                  <select
                    required
                    className={cn(inputClass, "field")}
                    value={form.clientId}
                    onChange={(e) => setForm((f) => withClient(f, db.clients.find((c) => c.id === e.target.value)))}
                  >
                    <option value="">Escolha o cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Choice label="Frente" value={form.front} onChange={pickFront} options={[["Software", "Software"], ["Studio", "Studio"]]} />
                <Choice label="O cliente é" value={form.clientKind} onChange={(v) => set("clientKind", v)} options={[["pj", "Empresa (CNPJ)"], ["pf", "Pessoa (CPF)"]]} />
                <Field label={form.clientKind === "pj" ? "Razão social" : "Nome completo"}>
                  <input className={inputClass} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} />
                </Field>
                <Field label={form.clientKind === "pj" ? "CNPJ" : "CPF"}>
                  <input className={inputClass} inputMode="numeric" value={form.clientDoc} onChange={(e) => set("clientDoc", e.target.value)} />
                </Field>
                <Field label="Endereço" className="sm:col-span-2">
                  <input className={inputClass} value={form.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} />
                </Field>
                {form.clientKind === "pj" && (
                  <>
                    <Field label="Quem assina pelo cliente">
                      <input className={inputClass} value={form.clientRep} onChange={(e) => set("clientRep", e.target.value)} />
                    </Field>
                    <Field label="CPF de quem assina">
                      <input className={inputClass} inputMode="numeric" value={form.clientRepDoc} onChange={(e) => set("clientRepDoc", e.target.value)} />
                    </Field>
                  </>
                )}
                <Field label="E-mail do cliente" className="sm:col-span-2">
                  <input type="email" className={inputClass} value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
                </Field>
              </Block>

              <Block title="Serviço e escopo">
                <div className="sm:col-span-2">
                  <p className="mb-2 text-[15px] text-fg-muted">{form.front === "Studio" ? "Planos (propostos, ainda não finalizados)" : "Serviços da Lumora Software"}</p>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_PRESETS[form.front].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => pickPreset(p)}
                        aria-pressed={form.service === p.label}
                        className={cn(
                          "min-h-11 rounded-pill px-4 text-[15px] font-medium transition-colors md:min-h-10",
                          form.service === p.label ? "bg-lime/12 text-fg ring-2 ring-lime-deep ring-inset" : "text-fg-muted ring-1 ring-line ring-inset hover:text-fg hover:ring-line-strong",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Serviço contratado *" className="sm:col-span-2">
                  <input required className={inputClass} placeholder="Ex.: Site institucional com 5 páginas" value={form.service} onChange={(e) => set("service", e.target.value)} />
                </Field>
                <Field label="O que está incluído (um item por linha)" className="sm:col-span-2">
                  <textarea rows={4} className={cn(inputClass, "resize-y")} value={form.scopeIn} onChange={(e) => set("scopeIn", e.target.value)} />
                </Field>
                <Field label="O que não está incluído (opcional, um por linha)" className="sm:col-span-2">
                  <textarea rows={3} className={cn(inputClass, "resize-y")} value={form.scopeOut} onChange={(e) => set("scopeOut", e.target.value)} />
                </Field>
                <Field label="Rodadas de revisão por entrega">
                  <input inputMode="numeric" className={inputClass} placeholder="Vazio = sem número fixo" value={form.revisions} onChange={(e) => set("revisions", e.target.value.replace(/\D/g, "").slice(0, 2))} />
                </Field>
                <Field label="Dias úteis para o cliente aprovar">
                  <input inputMode="numeric" className={inputClass} value={form.approvalDays} onChange={(e) => set("approvalDays", e.target.value.replace(/\D/g, "").slice(0, 2))} />
                </Field>
              </Block>

              <Block title="Valor e pagamento">
                <Choice label="Tipo" value={form.kind} onChange={(v) => set("kind", v)} options={[["unico", "Valor único"], ["mensal", "Mensalidade"]]} />
                <Field label={mensal ? "Valor por mês (R$) *" : "Valor total (R$) *"}>
                  <input
                    required
                    inputMode="numeric"
                    className={inputClass}
                    value={form.amount ? String(form.amount) : ""}
                    onChange={(e) => set("amount", Number(e.target.value.replace(/\D/g, "")) || 0)}
                  />
                </Field>
                <Field label="Forma de pagamento">
                  <select className={cn(inputClass, "field")} value={form.payMethod} onChange={(e) => set("payMethod", e.target.value)}>
                    {PAY_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m[0].toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Dados para pagamento (opcional)">
                  <input className={inputClass} placeholder="Ex.: chave Pix" value={form.payInfo} onChange={(e) => set("payInfo", e.target.value)} />
                </Field>
                {mensal ? (
                  <Field label="Dia do vencimento">
                    <input inputMode="numeric" className={inputClass} value={form.dueDay} onChange={(e) => set("dueDay", e.target.value.replace(/\D/g, "").slice(0, 2))} />
                  </Field>
                ) : (
                  <>
                    <Field label="Parcelas">
                      <select className={cn(inputClass, "field")} value={form.installments} onChange={(e) => set("installments", e.target.value)}>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                          <option key={n} value={n}>
                            {n === "1" ? "À vista" : `${n}x`}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={form.installments === "1" ? "Vencimento *" : "1º vencimento *"}>
                      <input type="date" required className={inputClass} value={form.firstDue} onChange={(e) => set("firstDue", e.target.value)} />
                    </Field>
                  </>
                )}
              </Block>

              <Block title="Prazo e vigência">
                <Field label="Começa em *">
                  <input type="date" required className={inputClass} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </Field>
                {mensal ? (
                  <>
                    <Field label="Termina em (vazio = sem prazo)">
                      <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                    </Field>
                    <Field label="Aviso prévio para encerrar (dias)">
                      <input inputMode="numeric" className={inputClass} value={form.noticeDays} onChange={(e) => set("noticeDays", e.target.value.replace(/\D/g, "").slice(0, 3))} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Prazo de entrega (dias úteis)">
                      <input inputMode="numeric" className={inputClass} value={form.deliveryDays} onChange={(e) => set("deliveryDays", e.target.value.replace(/\D/g, "").slice(0, 3))} />
                    </Field>
                    {form.options.suporte && (
                      <Field label="Garantia de correção (dias)">
                        <input inputMode="numeric" className={inputClass} value={form.supportDays} onChange={(e) => set("supportDays", e.target.value.replace(/\D/g, "").slice(0, 3))} />
                      </Field>
                    )}
                  </>
                )}
              </Block>

              <Block title="Lumora (contratada)" hint="Sem CNPJ ainda, o contrato pode sair no nome e no CPF de quem assina. Ajuste aqui quando a empresa tiver CNPJ.">
                <Choice label="A Lumora assina como" value={form.lumoraKind} onChange={(v) => set("lumoraKind", v)} options={[["pf", "Pessoa (CPF)"], ["pj", "Empresa (CNPJ)"]]} />
                <Field label="Quem assina pela Lumora">
                  <select className={cn(inputClass, "field")} value={PEOPLE.find((p) => p.name === form.lumoraSigner)?.id ?? ""} onChange={(e) => set("lumoraSigner", PERSON[e.target.value as PersonId]?.name ?? "")}>
                    <option value="">Escolha</option>
                    {PEOPLE.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nome no contrato">
                  <input className={inputClass} value={form.lumoraName} onChange={(e) => set("lumoraName", e.target.value)} />
                </Field>
                <Field label={form.lumoraKind === "pj" ? "CNPJ" : "CPF de quem assina"}>
                  <input className={inputClass} inputMode="numeric" value={form.lumoraDoc} onChange={(e) => set("lumoraDoc", e.target.value)} />
                </Field>
                <Field label="Endereço">
                  <input className={inputClass} value={form.lumoraAddress} onChange={(e) => set("lumoraAddress", e.target.value)} />
                </Field>
                <Field label="E-mail da Lumora">
                  <input type="email" className={inputClass} value={form.lumoraEmail} onChange={(e) => set("lumoraEmail", e.target.value)} />
                </Field>
              </Block>

              <Block title="Cláusulas opcionais">
                <div className="grid gap-1 sm:col-span-2">
                  {OPTION_INFO.filter((o) => !o.only || o.only === form.kind || o.only === form.front).map((o) => (
                    <label key={o.key} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-field px-1 py-2 hover:bg-surface-2">
                      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-lime-deep" checked={form.options[o.key]} onChange={(e) => setOpt(o.key, e.target.checked)} />
                      <span>
                        <span className="block text-base font-medium text-fg">{o.label}</span>
                        <span className="block text-[13px] leading-snug text-fg-muted">{o.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </Block>

              <Block title="Assinatura e registro">
                <Field label="Cidade (local e foro)">
                  <input className={inputClass} value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="Data do contrato">
                  <input type="date" className={inputClass} value={form.signDate} onChange={(e) => set("signDate", e.target.value)} />
                </Field>
                {linked ? (
                  <p className="text-[15px] text-fg-muted sm:col-span-2">
                    Ligado ao contrato <strong className="font-semibold text-fg">{linked.title || "sem título"}</strong> da tela Dinheiro. Ao salvar, o texto fica guardado nele.
                  </p>
                ) : (
                  <>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 px-1 py-2 sm:col-span-2">
                      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-lime-deep" checked={form.register} onChange={(e) => set("register", e.target.checked)} />
                      <span>
                        <span className="block text-base font-medium text-fg">Registrar na tela Dinheiro ao salvar</span>
                        <span className="block text-[13px] leading-snug text-fg-muted">Cria o contrato com valor e vencimentos, e as cobranças passam a aparecer. Parcelado vira uma cobrança por parcela.</span>
                      </span>
                    </label>
                    {form.register && (
                      <Field label="Quem cobra">
                        <select className={cn(inputClass, "field")} value={form.owner} onChange={(e) => set("owner", e.target.value as PersonId | "")}>
                          <option value="">Sem dono</option>
                          {PEOPLE.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.short}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </>
                )}
              </Block>

              <div className="flex flex-wrap justify-end gap-3">
                {doc.html && (
                  <QuietButton type="button" onClick={() => setStep("preview")}>
                    Voltar à prévia
                  </QuietButton>
                )}
                <ActionButton type="submit">{doc.html ? "Gerar de novo" : "Gerar contrato"}</ActionButton>
              </div>
            </form>
          )
        ) : (
          <div className="grid gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <SecondaryButton onClick={leavePreview}>
                <ArrowLeft className="size-4" aria-hidden /> Informações
              </SecondaryButton>
              <span className="flex-1" />
              <SecondaryButton onClick={save}>
                <Save className="size-4" aria-hidden /> {linked ? "Salvar no HUB" : "Salvar e registrar"}
              </SecondaryButton>
              <ActionButton onClick={downloadPdf} icon={<Download className="size-4" strokeWidth={2.4} aria-hidden />}>
                Baixar PDF
              </ActionButton>
            </div>
            {doc.missing.length > 0 && (
              <p className="rounded-card bg-raised p-4 text-[15px] leading-relaxed text-fg-muted ring-1 ring-line ring-inset">
                <strong className="font-semibold text-fg">
                  Faltam {doc.missing.length} {doc.missing.length === 1 ? "dado" : "dados"} para assinar:
                </strong>{" "}
                {doc.missing.join(", ")}. Preencha nas informações ou direto no texto.
              </p>
            )}
            {linked?.document_at && !edited && (
              <p className="text-[13px] text-fg-subtle">Salvo no HUB em {new Date(linked.document_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.</p>
            )}
            <div className="overflow-x-auto rounded-card bg-white shadow-card ring-1 ring-line ring-inset">
              <div
                key={doc.version}
                ref={paperRef}
                className="contract-doc mx-auto max-w-[760px] px-6 py-10 outline-none focus-visible:ring-2 focus-visible:ring-focus sm:px-14"
                contentEditable
                suppressContentEditableWarning
                spellCheck
                role="textbox"
                aria-multiline
                aria-label="Texto do contrato"
                onInput={() => setEdited(true)}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <QuietButton onClick={leavePreview}>Mudar informações</QuietButton>
              <ActionButton onClick={downloadPdf} icon={<Download className="size-4" strokeWidth={2.4} aria-hidden />}>
                Baixar PDF
              </ActionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-5 rounded-panel bg-raised p-5 shadow-card ring-1 ring-line ring-inset sm:grid-cols-2 sm:p-7">
      <div className="sm:col-span-2">
        <h2 id={id} className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
        {hint && <p className="mt-1 text-[15px] text-fg-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[] }) {
  return (
    <div>
      <span className="mb-2 block text-[15px] text-fg-muted">{label}</span>
      <Segmented label={label} value={value} onChange={onChange} options={options} />
    </div>
  );
}

