// Gerador de contratos: modelo de prestação de serviços da Lumora (Software e Studio).
// O texto é uma MINUTA equilibrada para as duas partes (Código Civil arts. 593 a 609, Leis 9.609/98,
// 9.610/98, 13.709/18 e 14.063/20). Não é parecer jurídico: revisar com advogado antes de assinar.
// Campos vazios viram <mark>[a preencher: …]</mark> e entram na lista `missing`.

import type { ValueKind } from "./types";

export type PartyKind = "pf" | "pj";
export type GenFront = "Software" | "Studio";

export type GenOptions = {
  multaAtraso: boolean;
  reajuste: boolean;
  terceiros: boolean;
  confidencialidade: boolean;
  lgpd: boolean;
  suporte: boolean;
  portfolio: boolean;
  testemunhas: boolean;
  assinaturaEletronica: boolean;
};

export type GenInput = {
  front: GenFront;
  // Contratante (cliente)
  clientName: string;
  clientKind: PartyKind;
  clientDoc: string;
  clientAddress: string;
  clientRep: string;
  clientRepDoc: string;
  clientEmail: string;
  // Contratada (Lumora)
  lumoraName: string;
  lumoraKind: PartyKind;
  lumoraDoc: string;
  lumoraAddress: string;
  lumoraSigner: string;
  lumoraEmail: string;
  // Serviço
  service: string;
  scopeIn: string; // um item por linha
  scopeOut: string; // um item por linha
  revisions: string; // rodadas por entrega (vazio = não fixa)
  approvalDays: string; // dias úteis para aprovar
  // Dinheiro
  kind: ValueKind;
  amount: number; // reais
  payMethod: string;
  payInfo: string; // chave Pix, conta…
  dueDay: string; // mensal
  installments: string; // único
  firstDue: string; // único: AAAA-MM-DD
  // Prazos
  startDate: string;
  endDate: string; // mensal: vazio = prazo indeterminado
  deliveryDays: string; // único: dias úteis
  noticeDays: string;
  supportDays: string;
  city: string;
  signDate: string;
  options: GenOptions;
};

export const DEFAULT_OPTIONS: GenOptions = {
  multaAtraso: true,
  reajuste: true,
  terceiros: true,
  confidencialidade: true,
  lgpd: true,
  suporte: true,
  portfolio: false,
  testemunhas: false,
  assinaturaEletronica: true,
};

/** Rótulo e explicação de cada cláusula opcional, na ordem do formulário. */
export const OPTION_INFO: { key: keyof GenOptions; label: string; hint: string; only?: "mensal" | "unico" | GenFront }[] = [
  { key: "multaAtraso", label: "Multa e juros por atraso", hint: "2% de multa, 1% ao mês de juros e IPCA; após 15 dias, serviço pode ser pausado com aviso." },
  { key: "reajuste", label: "Reajuste anual pelo IPCA", hint: "Só em mensalidade. Outro aumento depende de acordo.", only: "mensal" },
  { key: "terceiros", label: "Custos de terceiros à parte", hint: "Domínio, hospedagem, licenças, mídia paga: pagos pelo cliente, com aprovação antes." },
  { key: "confidencialidade", label: "Confidencialidade", hint: "As duas partes guardam sigilo, durante o contrato e por 2 anos depois." },
  { key: "lgpd", label: "Proteção de dados (LGPD)", hint: "Lumora como operadora dos dados do cliente; incidentes avisados em 2 dias úteis." },
  { key: "suporte", label: "Garantia de correção após a entrega", hint: "Corrige erros sem custo por um período. Só em valor único.", only: "unico" },
  { key: "portfolio", label: "Pode entrar no portfólio", hint: "Cliente autoriza mostrar o trabalho (sem valores nem dados). Pode revogar. Desligado = só com autorização por escrito." },
  { key: "testemunhas", label: "Linhas para 2 testemunhas", hint: "Dá ao contrato força de título executivo (cobrança mais rápida)." },
  { key: "assinaturaEletronica", label: "Assinatura eletrônica", hint: "Vale assinar por plataforma ou gov.br." },
];

export const SERVICE_PRESETS: Record<GenFront, { label: string; scope?: string; amount?: number; kind?: ValueKind }[]> = {
  Software: [
    { label: "Site institucional", kind: "unico" },
    { label: "Landing page", kind: "unico" },
    { label: "Sistema sob medida", kind: "unico" },
    { label: "Integração", kind: "unico" },
    { label: "Automação", kind: "unico" },
  ],
  Studio: [
    { label: "Plano de conteúdo mensal", scope: "Planejamento, criação e publicação de conteúdo", kind: "mensal" },
    { label: "Identidade visual", kind: "unico" },
  ],
};

export const PAY_METHODS = ["Pix", "boleto bancário", "transferência bancária", "cartão de crédito"];

// ---------- Valores e datas por extenso ----------

const UN = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEN = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function upTo999(n: number) {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CEN[c]);
  if (r) parts.push(r < 20 ? UN[r] : r % 10 ? `${DEZ[Math.floor(r / 10)]} e ${UN[r % 10]}` : DEZ[r / 10]);
  return parts.join(" e ");
}

/** Inteiro por extenso (até 999 milhões). */
export function intWords(n: number): string {
  if (n === 0) return "zero";
  const groups: [number, string, string][] = [
    [Math.floor(n / 1e6) % 1000, "milhão", "milhões"],
    [Math.floor(n / 1000) % 1000, "mil", "mil"],
    [n % 1000, "", ""],
  ];
  // "mil e quinhentos", "dois mil trezentos e dez", "um milhão e duzentos mil": "e" antes de grupo < 100 ou centena redonda.
  return groups
    .filter(([v]) => v > 0)
    .map(([v, one, many]) => ({ v, text: many === "mil" && v === 1 ? "mil" : many ? `${upTo999(v)} ${v === 1 ? one : many}` : upTo999(v) }))
    .reduce((acc, g, i) => (i === 0 ? g.text : `${acc}${g.v < 100 || g.v % 100 === 0 ? " e " : " "}${g.text}`), "");
}

/** Por extenso no feminino ("duas rodadas", "vinte e uma parcelas"). */
export function intWordsFem(n: number) {
  return intWords(n).replace(/\bum\b(?! milhão)/g, "uma").replace(/\bdois\b(?! milhões)/g, "duas").replace(/entos\b/g, "entas");
}

/** "mil e quinhentos reais", "mil duzentos e trinta reais e cinquenta centavos". */
export function moneyWords(cents: number) {
  const reais = Math.floor(cents / 100);
  const c = cents % 100;
  const parts: string[] = [];
  if (reais > 0) parts.push(`${intWords(reais)}${reais % 1e6 === 0 ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  if (c > 0) parts.push(`${intWords(c)} ${c === 1 ? "centavo" : "centavos"}`);
  return parts.join(" e ") || "zero reais";
}

export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function dateWords(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d === 1 ? "1º" : d} de ${MONTHS[m - 1]} de ${y}`;
}

function clampDay(y: number, m: number, day: number) {
  return Math.min(day, new Date(y, m, 0).getDate());
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Primeiro vencimento mensal a partir do início: no mesmo mês se o dia ainda não passou, senão no seguinte. */
export function firstMonthlyDue(start: string, dueDay: number) {
  const [y, m, d] = start.split("-").map(Number);
  if (d <= clampDay(y, m, dueDay)) return iso(y, m, clampDay(y, m, dueDay));
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return iso(ny, nm, clampDay(ny, nm, dueDay));
}

/** Datas e valores das parcelas (centavos). Total em reais inteiros divide em reais inteiros; a última absorve a sobra. */
export function installmentPlan(totalCents: number, n: number, first: string) {
  const count = Math.max(1, Math.min(24, n));
  const unit = totalCents % 100 === 0 ? 100 : 1;
  const base = Math.floor(totalCents / unit / count) * unit;
  const [y, m, d] = first.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const mm = ((m - 1 + i) % 12) + 1;
    const yy = y + Math.floor((m - 1 + i) / 12);
    return { date: iso(yy, mm, clampDay(yy, mm, d)), cents: i === count - 1 ? totalCents - base * (count - 1) : base };
  });
}

// ---------- Montagem ----------

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function lines(s: string) {
  return s
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export type Generated = { html: string; missing: string[] };

export function buildContract(input: GenInput): Generated {
  const missing: string[] = [];
  /** Valor do usuário (escapado) ou marcador "a preencher". */
  const v = (value: string, label: string) => {
    const t = value.trim();
    if (t) return esc(t);
    if (!missing.includes(label)) missing.push(label);
    return `<mark>[a preencher: ${esc(label)}]</mark>`;
  };
  const o = input.options;
  const mensal = input.kind === "mensal";
  const software = input.front === "Software";
  const cents = Math.round(input.amount * 100);

  // Partes
  const clientQual =
    input.clientKind === "pj"
      ? `pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${v(input.clientDoc, "CNPJ do contratante")}, com sede em ${v(input.clientAddress, "endereço do contratante")}, neste ato representada por ${v(input.clientRep, "representante do contratante")}, inscrito(a) no CPF sob o nº ${v(input.clientRepDoc, "CPF do representante do contratante")}`
      : `pessoa física, inscrita no CPF sob o nº ${v(input.clientDoc, "CPF do contratante")}, residente em ${v(input.clientAddress, "endereço do contratante")}`;
  // Sem CNPJ, a parte é a pessoa que assina, atuando sob a marca.
  const lumoraPf = input.lumoraKind === "pf";
  const lumoraParty = lumoraPf ? v(input.lumoraSigner, "quem assina pela Lumora") : v(input.lumoraName, "razão social da Lumora");
  const lumoraQual = lumoraPf
    ? `pessoa física, inscrita no CPF sob o nº ${v(input.lumoraDoc, "CPF de quem assina pela Lumora")}, com endereço em ${v(input.lumoraAddress, "endereço da Lumora")}, que presta os serviços sob o nome ${v(input.lumoraName, "nome da Lumora")}`
    : `pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${v(input.lumoraDoc, "CNPJ da Lumora")}, com sede em ${v(input.lumoraAddress, "endereço da Lumora")}, neste ato representada por ${v(input.lumoraSigner, "quem assina pela Lumora")}`;

  const sections: { title: string; items: string[] }[] = [];
  const add = (title: string, items: (string | false | null | undefined)[]) => sections.push({ title, items: items.filter(Boolean) as string[] });

  // 1. Objeto
  const scopeIn = lines(input.scopeIn);
  const scopeOut = lines(input.scopeOut);
  add("Objeto e escopo", [
    `O objeto deste contrato é a prestação, pela CONTRATADA, do seguinte serviço da Lumora ${esc(input.front)}: <strong>${v(input.service, "serviço contratado")}</strong>, conforme o escopo abaixo.`,
    scopeIn.length
      ? `Estão incluídos no escopo:<ul>${scopeIn.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
      : `Estão incluídos no escopo: ${v("", "itens do escopo")}.`,
    scopeOut.length
      ? `Não estão incluídos no escopo:<ul>${scopeOut.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>Também não está incluído o que não constar no item anterior.`
      : "Não está incluído no escopo o que não constar no item anterior.",
    "Pedidos fora do escopo serão orçados à parte e só serão executados depois de aprovados por escrito pelas duas partes (vale e-mail ou mensagem).",
  ]);

  // 2. Prazo e vigência
  if (mensal) {
    add("Prazo e vigência", [
      `Este contrato vigora a partir de ${input.startDate ? dateWords(input.startDate) : v("", "data de início")}${input.endDate ? ` até ${dateWords(input.endDate)}, podendo ser renovado por escrito` : ", por prazo indeterminado"}.`,
      `Qualquer das partes pode encerrar este contrato a qualquer momento, sem multa, avisando a outra por escrito com ${esc(input.noticeDays || "30")} (${intWords(Number(input.noticeDays) || 30)}) dias de antecedência. Durante o aviso, os serviços e os pagamentos continuam normalmente.`,
    ]);
  } else {
    add("Prazo de execução", [
      `Os serviços começam em ${input.startDate ? dateWords(input.startDate) : v("", "data de início")}, e a entrega está prevista para até ${v(input.deliveryDays, "prazo de entrega em dias úteis")} dias úteis, contados do recebimento dos materiais, informações e acessos necessários e do pagamento da primeira parcela, o que ocorrer por último.`,
      "O prazo fica suspenso enquanto a CONTRATADA aguarda materiais, informações, acessos ou aprovações do CONTRATANTE, e volta a correr quando eles forem entregues.",
      "Se houver risco de atraso por motivo da CONTRATADA, ela avisará o CONTRATANTE com antecedência e proporá nova data. Atraso superior a 30 (trinta) dias, sem justificativa aceita pelo CONTRATANTE, permite a rescisão prevista na cláusula de encerramento, com devolução dos valores pagos por etapas não entregues.",
    ]);
  }

  // 3. Preço e pagamento
  const pay = esc(input.payMethod || "Pix");
  const payTo = input.payInfo.trim() ? `, para ${esc(input.payInfo.trim())}` : "";
  const priceItems: (string | false)[] = [];
  if (mensal) {
    const day = Math.min(31, Math.max(1, Number(input.dueDay) || 10));
    priceItems.push(
      `Pelos serviços, o CONTRATANTE pagará à CONTRATADA <strong>${brl(cents)}</strong> (${moneyWords(cents)}) por mês, com vencimento todo dia ${day}, por ${pay}${payTo}.`,
      input.startDate ? `A primeira mensalidade vence em ${dateWords(firstMonthlyDue(input.startDate, day))}.` : false,
    );
  } else {
    const n = Math.max(1, Number(input.installments) || 1);
    const plan = input.firstDue ? installmentPlan(cents, n, input.firstDue) : [];
    const head = `Pelos serviços, o CONTRATANTE pagará à CONTRATADA o valor total de <strong>${brl(cents)}</strong> (${moneyWords(cents)}), por ${pay}${payTo}`;
    if (!input.firstDue) priceItems.push(`${head}, ${n === 1 ? "à vista" : `em ${n} parcelas`}, com primeiro vencimento em ${v("", "data do primeiro pagamento")}.`);
    else if (n === 1) priceItems.push(`${head}, à vista, com vencimento em ${dateWords(input.firstDue)}.`);
    else
      priceItems.push(
        `${head}, em ${n} (${intWordsFem(n)}) parcelas mensais:<ul>${plan.map((p, i) => `<li>${i + 1}ª parcela: ${brl(p.cents)}, vencimento em ${dateWords(p.date)}</li>`).join("")}</ul>`,
      );
  }
  priceItems.push("A CONTRATADA enviará recibo ou documento fiscal, quando aplicável, de cada pagamento recebido.");
  if (o.terceiros)
    priceItems.push(
      `Custos de terceiros necessários ao serviço, como ${software ? "registro de domínio, hospedagem, licenças de software e serviços ou APIs pagos" : "verba de impulsionamento ou mídia paga, bancos de imagens, músicas licenciadas e captação terceirizada"}, não estão incluídos no valor. Eles serão informados antes, só serão contratados com aprovação do CONTRATANTE e serão pagos diretamente por ele.`,
    );
  if (o.multaAtraso)
    priceItems.push(
      "Em caso de atraso no pagamento, incidirão multa de 2% (dois por cento) sobre o valor em atraso, juros de mora de 1% (um por cento) ao mês, calculados dia a dia, e correção monetária pelo IPCA/IBGE. Depois de 15 (quinze) dias de atraso, a CONTRATADA poderá suspender os serviços mediante aviso por escrito, até a regularização, e os prazos ficam prorrogados pelo mesmo período.",
    );
  if (o.reajuste && mensal)
    priceItems.push(
      "O valor mensal será reajustado a cada 12 (doze) meses pela variação acumulada do IPCA/IBGE, ou pelo índice oficial que o substituir. Qualquer outro aumento depende de acordo por escrito entre as partes.",
    );
  add("Preço e pagamento", priceItems);

  // 4. Obrigações da contratada
  add("Obrigações da CONTRATADA", [
    "Executar os serviços com qualidade técnica, boa-fé e dentro dos prazos combinados.",
    "Manter o CONTRATANTE informado sobre o andamento e avisar com antecedência qualquer impedimento.",
    software
      ? "Corrigir, sem custo, falhas de sua responsabilidade identificadas nos entregáveis em relação ao escopo aprovado."
      : "Seguir a identidade visual, o tom de voz e as orientações aprovadas pelo CONTRATANTE, e não publicar nenhum conteúdo sem a aprovação dele.",
    !software &&
      "Comprometer-se com a execução do escopo contratado, e não com resultados de alcance, seguidores, vendas ou desempenho em plataformas, que dependem de fatores fora do controle das partes.",
    "Poder contar com parceiros na execução, continuando responsável perante o CONTRATANTE pelo resultado e pelo sigilo.",
  ]);

  // 5. Obrigações do contratante
  const approval = input.approvalDays.trim() || "5";
  add("Obrigações do CONTRATANTE", [
    "Fornecer, em tempo, as informações, materiais, acessos e aprovações necessários à execução dos serviços.",
    "Indicar uma pessoa responsável pelas aprovações e pela comunicação com a CONTRATADA.",
    "Garantir que possui os direitos de uso sobre textos, imagens, marcas e demais materiais que enviar, respondendo por eles perante terceiros.",
    "Efetuar os pagamentos nas datas combinadas.",
  ]);

  // 6. Aprovações e revisões
  add("Aprovações e revisões", [
    `Cada entrega será enviada ao CONTRATANTE, que terá ${esc(approval)} (${intWords(Number(approval) || 5)}) dias úteis para aprovar ou pedir ajustes. Se não houver resposta nesse prazo, depois de ao menos um lembrete por escrito da CONTRATADA, a entrega será considerada aprovada${software ? "" : ", exceto para publicação, que sempre depende de aprovação expressa"}.`,
    input.revisions.trim()
      ? `Estão incluídas ${esc(input.revisions.trim())} (${intWordsFem(Number(input.revisions) || 0)}) rodadas de revisão por entrega. Rodadas extras ou mudanças de escopo serão orçadas à parte.`
      : "Ajustes que mudem o escopo aprovado serão orçados à parte.",
  ]);

  // 7. Propriedade intelectual
  add(
    "Propriedade intelectual",
    software
      ? [
          "Com o pagamento integral, o CONTRATANTE passa a ser titular dos direitos patrimoniais sobre o código-fonte, os layouts e os demais entregáveis feitos especificamente para ele, nos termos das Leis nº 9.609/1998 e nº 9.610/1998. Até lá, o CONTRATANTE tem licença de uso dos entregáveis.",
          "Bibliotecas, frameworks e componentes de código aberto ou de terceiros seguem suas próprias licenças. Ferramentas, métodos e trechos genéricos de código que a CONTRATADA já possuía ou usa em outros projetos continuam dela, e o CONTRATANTE recebe licença de uso gratuita e permanente sobre eles, dentro do projeto entregue.",
          "Ao final, a CONTRATADA entregará os acessos e arquivos necessários para que o CONTRATANTE possa manter o projeto com quem quiser.",
        ]
      : [
          "As peças aprovadas, depois de pagas, podem ser usadas livremente pelo CONTRATANTE em seus canais, sem limite de prazo. Arquivos editáveis e materiais não aprovados permanecem com a CONTRATADA, salvo acordo por escrito.",
          "Fontes, imagens de bancos, músicas e outros elementos licenciados seguem as licenças de seus titulares.",
          "A CONTRATADA mantém os direitos morais de autoria, nos termos do art. 24 da Lei nº 9.610/1998.",
        ],
  );

  // 8. Garantia (único)
  if (o.suporte && !mensal)
    add("Garantia de correção", [
      `Por ${v(input.supportDays, "dias de garantia")} dias após a entrega, a CONTRATADA corrigirá, sem custo, erros dos entregáveis em relação ao escopo aprovado.`,
      "Não estão cobertos: novas funcionalidades ou mudanças de escopo, problemas causados por alterações feitas pelo CONTRATANTE ou por terceiros, e falhas de serviços de terceiros, como hospedagem e APIs. Depois desse período, manutenção e suporte podem ser contratados à parte.",
    ]);

  // 9. Divulgação e confidencialidade
  const privacy: string[] = [];
  if (o.confidencialidade)
    privacy.push(
      "As partes manterão sigilo sobre as informações confidenciais que receberem uma da outra, como dados do negócio, valores, estratégias, acessos e dados de clientes, durante a vigência deste contrato e por 2 (dois) anos após o seu fim. Não são confidenciais as informações que já eram públicas ou que devam ser reveladas por ordem legal ou judicial.",
    );
  privacy.push(
    o.portfolio
      ? "O CONTRATANTE autoriza a CONTRATADA a citar o projeto e mostrar os entregáveis já públicos em seu portfólio e redes, sem divulgar valores ou informações confidenciais. A autorização pode ser revogada por escrito a qualquer tempo, para usos futuros."
      : "A CONTRATADA só divulgará o nome do CONTRATANTE como cliente, ou o trabalho realizado, com autorização prévia e por escrito dele.",
  );
  add(o.confidencialidade ? "Confidencialidade e divulgação" : "Divulgação", privacy);

  // 10. LGPD
  if (o.lgpd)
    add("Proteção de dados pessoais", [
      "As partes cumprirão a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Quando a CONTRATADA tratar dados pessoais em nome do CONTRATANTE, ela atuará como operadora, seguindo as instruções do CONTRATANTE, que é o controlador, e adotará medidas de segurança adequadas.",
      "A CONTRATADA comunicará ao CONTRATANTE qualquer incidente de segurança envolvendo esses dados em até 2 (dois) dias úteis da ciência. Ao fim do contrato, os dados serão devolvidos ou eliminados, salvo obrigação legal de guarda.",
    ]);

  // 11. Encerramento
  add("Encerramento", [
    "Qualquer das partes pode rescindir este contrato se a outra descumprir alguma obrigação e não corrigir a falha em 10 (dez) dias depois de notificada por escrito.",
    mensal
      ? "No encerramento, são devidos apenas os valores do período já trabalhado, sem multa, e a CONTRATADA entregará o que já foi produzido e pago."
      : "Se o CONTRATANTE desistir sem culpa da CONTRATADA, pagará pelos serviços já executados até a data do aviso, na proporção do escopo, e receberá o que foi produzido. Se a CONTRATADA desistir sem culpa do CONTRATANTE, devolverá os valores recebidos por serviços ainda não executados e entregará o que já foi produzido.",
    "O encerramento não afasta os pagamentos já vencidos nem as obrigações de sigilo e de proteção de dados.",
  ]);

  // 12. Disposições gerais
  add("Disposições gerais", [
    "Este contrato não cria vínculo empregatício, societário ou de exclusividade entre as partes.",
    `As comunicações entre as partes valem por escrito, inclusive por e-mail${input.clientEmail.trim() || input.lumoraEmail.trim() ? " para os endereços informados neste contrato" : ""} ou mensagem.`,
    "Alterações a este contrato só valem se feitas por escrito e aceitas pelas duas partes. A tolerância de uma parte com o descumprimento da outra não altera o que foi combinado.",
    "Nenhuma das partes responde por atrasos ou falhas causados por caso fortuito ou força maior (art. 393 do Código Civil), desde que avise a outra assim que possível.",
    "Se alguma cláusula for considerada inválida, as demais continuam valendo.",
    o.assinaturaEletronica &&
      "As partes concordam que este contrato pode ser assinado eletronicamente, por plataforma de assinatura ou pelo gov.br, com a mesma validade da assinatura em papel, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020.",
  ]);

  // 13. Foro
  add("Foro", [
    `As partes tentarão resolver qualquer divergência por conversa direta. Não havendo acordo, fica eleito o foro da comarca de ${v(input.city, "cidade do foro")}.`,
  ]);

  // ---------- HTML ----------
  const title = `Contrato de prestação de serviços${software ? " de tecnologia" : " de marketing e conteúdo"}`;
  const clientEmail = input.clientEmail.trim() ? `, e-mail ${esc(input.clientEmail.trim())}` : "";
  const lumoraEmail = input.lumoraEmail.trim() ? `, e-mail ${esc(input.lumoraEmail.trim())}` : "";
  const body: string[] = [];
  body.push(
    `<p class="draft-note">MINUTA gerada pelo Lumora HUB. Revise com um advogado antes de assinar e apague este aviso.</p>`,
    `<h1>${title}</h1>`,
    `<p><strong>CONTRATANTE:</strong> ${v(input.clientName, "nome do contratante")}, ${clientQual}${clientEmail}.</p>`,
    `<p><strong>CONTRATADA:</strong> ${lumoraParty}, ${lumoraQual}${lumoraEmail}.</p>`,
    "<p>As partes acima têm entre si justo e acertado este contrato de prestação de serviços, que se rege pelas cláusulas a seguir e pelos artigos 593 a 609 do Código Civil (Lei nº 10.406/2002).</p>",
  );
  sections.forEach((s, i) => {
    const n = i + 1;
    body.push(`<h2>Cláusula ${n}. ${esc(s.title)}</h2>`);
    s.items.forEach((t, j) => body.push(`<p><strong>${n}.${j + 1}.</strong> ${t}</p>`));
  });
  body.push(
    `<p>E, por estarem de acordo, as partes assinam este contrato${o.assinaturaEletronica ? "" : " em 2 (duas) vias de igual teor"}.</p>`,
    `<p class="sign-date">${v(input.city, "cidade do foro")}, ${input.signDate ? dateWords(input.signDate) : v("", "data da assinatura")}.</p>`,
    `<div class="signatures"><div class="sign"><span class="sign-line"></span><p><strong>CONTRATANTE</strong><br>${esc(input.clientName.trim() || "")}${input.clientKind === "pj" && input.clientRep.trim() ? `<br>${esc(input.clientRep.trim())}` : ""}</p></div><div class="sign"><span class="sign-line"></span><p><strong>CONTRATADA</strong><br>${esc((lumoraPf ? input.lumoraSigner : input.lumoraName).trim())}<br>${esc((lumoraPf ? input.lumoraName : input.lumoraSigner).trim())}</p></div></div>`,
  );
  if (o.testemunhas)
    body.push(
      `<div class="signatures"><div class="sign"><span class="sign-line"></span><p><strong>Testemunha 1</strong><br>Nome:<br>CPF:</p></div><div class="sign"><span class="sign-line"></span><p><strong>Testemunha 2</strong><br>Nome:<br>CPF:</p></div></div>`,
    );
  return { html: body.join("\n"), missing };
}

// ---------- Documento salvo: limpeza e impressão ----------

const ALLOWED = new Set(["H1", "H2", "H3", "P", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "BR", "DIV", "SPAN", "MARK"]);
const ALLOWED_CLASS = new Set(["draft-note", "sign-date", "signatures", "sign", "sign-line"]);

/** Mantém só as tags do modelo (o texto vem de edição livre na prévia e é salvo no banco). */
export function sanitizeDoc(html: string) {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement;
  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      if (!ALLOWED.has(child.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE"].includes(child.tagName)) child.remove();
        else {
          walk(child);
          child.replaceWith(...child.childNodes);
        }
        continue;
      }
      const cls = [...child.classList].filter((c) => ALLOWED_CLASS.has(c));
      for (const a of [...child.attributes]) child.removeAttribute(a.name);
      if (cls.length) child.className = cls.join(" ");
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}

/** CSS do documento: o mesmo na prévia (escopado em .contract-doc) e no PDF. */
export const DOC_CSS = `
.contract-doc { font-family: Georgia, "Times New Roman", serif; font-size: 11.5pt; line-height: 1.55; color: #111; }
.contract-doc :where(h1, h2, h3, p, li, strong, span) { color: #111; }
.contract-doc h1 { font-weight: 700; font-size: 15pt; text-align: center; text-transform: uppercase; letter-spacing: 0.02em; margin: 0 0 18pt; }
.contract-doc h2 { font-weight: 700; font-size: 11.5pt; text-transform: uppercase; margin: 16pt 0 6pt; break-after: avoid; }
.contract-doc p { margin: 0 0 7pt; text-align: justify; }
.contract-doc ul { margin: 4pt 0 4pt 18pt; padding: 0; }
.contract-doc li { margin: 0 0 2pt; }
.contract-doc mark { background: #fff3a8; color: #111; padding: 0 2px; }
.contract-doc .draft-note { border: 1px dashed #b45309; color: #92400e; padding: 6pt 8pt; text-align: center; font-family: system-ui, sans-serif; font-size: 9.5pt; }
.contract-doc .sign-date { margin-top: 16pt; }
.contract-doc .signatures { display: flex; gap: 32pt; margin-top: 36pt; break-inside: avoid; }
.contract-doc .sign { flex: 1; text-align: center; }
.contract-doc .sign-line { display: block; border-top: 1px solid #111; margin-bottom: 4pt; }
.contract-doc .sign p { text-align: center; font-size: 10pt; }
`;

/** Abre a impressão do navegador só com o contrato ("Salvar como PDF"). */
export function printContract(html: string, fileTitle: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const w = frame.contentWindow!;
  w.document.open();
  w.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(fileTitle)}</title><style>@page { size: A4; margin: 2.2cm 2cm; } body { margin: 0; } mark { background: none !important; } ${DOC_CSS}</style></head><body><div class="contract-doc">${sanitizeDoc(html)}</div></body></html>`,
  );
  w.document.close();
  const done = () => setTimeout(() => frame.remove(), 1000);
  w.addEventListener("afterprint", done);
  setTimeout(() => {
    w.focus();
    w.print();
    // Alguns navegadores não disparam afterprint; limpa de qualquer jeito.
    setTimeout(done, 60_000);
  }, 50);
}
