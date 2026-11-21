import type { Client, Contract, Decision, Lead, Note, Payment, Post, Project, Task } from "./types.ts";

// Dados de exemplo FICTÍCIOS para o modo local (sem banco). Nenhum nome abaixo é cliente real.
const T0 = "2026-11-16T12:00:00.000Z";

export const seedLeads: Lead[] = [
  { id: "lead-padaria", name: "Padaria Pão da Vila", front: "Studio", stage: "diagnostico", source: "Indicação",
    summary: "Padaria de bairro que quer divulgar as encomendas de bolos e o café da manhã no Instagram.",
    value_estimate: 900, value_kind: "mensal", updated_at: "2026-11-10T12:00:00.000Z" },
  { id: "lead-oficina", name: "Oficina Rota Certa", front: "Software", stage: "proposta", source: "Site",
    summary: "Oficina mecânica que quer um sistema simples de agendamento e acompanhamento dos serviços.",
    value_estimate: 6500, value_kind: "unico", updated_at: "2026-11-12T12:00:00.000Z" },
  { id: "lead-pilates", name: "Estúdio Movimento", front: "Studio", stage: "contato", source: "Instagram",
    summary: "Estúdio de pilates pediu informações sobre conteúdo mensal.",
    value_estimate: null, value_kind: "mensal", updated_at: "2026-11-15T12:00:00.000Z" },
  { id: "lead-loja", name: "Loja Verde Casa", front: "Software", stage: "perdido", source: "WhatsApp",
    summary: "Loja de plantas que queria uma loja virtual; preferiu uma plataforma pronta.",
    value_estimate: 4000, value_kind: "unico", lost_reason: "Escolheu outra opção", updated_at: "2026-11-08T12:00:00.000Z" },
];

export const seedClients: Client[] = [
  { id: "client-salao", name: "Salão Bela Forma", front: "Studio", status: "ativo",
    delivery: "Identidade visual e 12 posts por mês", monthly_value: 1200, can_publicize: false,
    summary: "Salão de beleza. Conteúdo mensal com foco em agendamentos pelo WhatsApp.", updated_at: "2026-11-01T12:00:00.000Z" },
  { id: "client-contabil", name: "Contabilidade Alfa", front: "Software", status: "ativo",
    delivery: "Site institucional com formulário de contato", monthly_value: 350, can_publicize: true,
    summary: "Escritório de contabilidade. Site entregue; mensalidade de hospedagem e manutenção.", updated_at: "2026-10-20T12:00:00.000Z" },
];

export const seedProjects: Project[] = [
  { id: "project-site-alfa", name: "Site da Contabilidade Alfa", kind: "cliente", status: "em andamento", client_id: "client-contabil",
    summary: "Ajustes finais do site e página de serviços.", updated_at: T0 },
  { id: "project-demo", name: "Demonstração integrada", kind: "interno", status: "ideia", client_id: null,
    summary: "Projeto conceitual com dados fictícios: conteúdo, landing page e formulário funcional.", updated_at: T0 },
  { id: "project-hub", name: "Lumora HUB", kind: "interno", status: "em andamento", client_id: null,
    summary: "Este app: a operação da equipe em um só lugar.", updated_at: T0 },
];

export const seedDecisions: Decision[] = [
  { id: "dec-precos", title: "Definir as faixas de preço dos planos mensais", state: "aberta", area: "Oferta", decided_at: null, context: "Comparar com o mercado e com o tempo gasto por cliente." },
  { id: "dec-contrato", title: "Modelo padrão de contrato", state: "aberta", area: "Oferta", decided_at: null, context: "Prazos, revisões e forma de pagamento." },
  { id: "dec-ritmo", title: "6 posts por semana: Software seg a qua, Studio qui a sáb", state: "decidida", area: "Conteúdo", decided_at: "2026-11-10", context: "Domingo é para revisão e planejamento." },
  { id: "dec-hub", title: "A operação do dia a dia vive no HUB", state: "decidida", area: "Operação", decided_at: "2026-11-16", context: "Tarefas, leads, clientes, projetos e calendário ficam no HUB." },
];

function task(id: string, title: string, owners: Task["owners"], area: Task["area"], ref_type: Task["ref_type"] = null, ref_id: string | null = null, due: string | null = null): Task {
  return { id, title, owners, due, done: false, done_at: null, area, ref_type, ref_id, created_at: T0 };
}

export const seedTasks: Task[] = [
  task("t-padaria-reuniao", "Agendar a reunião de diagnóstico com a padaria", ["fran"], "comercial", "lead", "lead-padaria", "2026-11-24"),
  task("t-oficina-proposta", "Revisar a proposta da oficina", ["leo", "fran"], "comercial", "lead", "lead-oficina", "2026-11-25"),
  task("t-pilates-retorno", "Responder o estúdio de pilates", ["fran"], "comercial", "lead", "lead-pilates"),
  task("t-salao-pauta", "Montar a pauta de dezembro do salão", ["bea"], "clientes", "client", "client-salao", "2026-11-28"),
  task("t-alfa-servicos", "Publicar a página de serviços", ["leo", "fab"], "projetos", "project", "project-site-alfa", "2026-11-27"),
  task("t-demo", "Construir a demonstração integrada", ["leo", "fab"], "projetos", "project", "project-demo"),
  task("t-posts-s1", "Produzir os posts do Studio da semana 1", ["bea"], "conteudo"),
  task("t-backup", "Conferir o backup do banco", ["leo"], "operacao"),
];

export const seedNotes: Note[] = [
  { id: "n-padaria-1", ref_type: "lead", ref_id: "lead-padaria", author: "fran", created_at: "2026-11-10T12:00:00.000Z",
    body: "Primeiro contato por indicação. Perguntar quais produtos vendem mais e qual horário tem mais movimento." },
  { id: "n-salao-1", ref_type: "client", ref_id: "client-salao", author: "bea", created_at: "2026-11-01T12:00:00.000Z",
    body: "Cliente prefere aprovar os posts às sextas." },
];

export const seedContracts: Contract[] = [
  { id: "ct-salao", client_id: "client-salao", title: "Conteúdo mensal", kind: "mensal", amount: 1200, due_day: 10, due_date: null,
    start_date: "2026-09-01", end_date: null, status: "ativo", owner: "fran", notes: "", created_at: "2026-09-01T12:00:00.000Z", updated_at: "2026-09-01T12:00:00.000Z" },
  { id: "ct-alfa", client_id: "client-contabil", title: "Hospedagem e manutenção do site", kind: "mensal", amount: 350, due_day: 5, due_date: null,
    start_date: "2026-10-01", end_date: null, status: "ativo", owner: "leo", notes: "", created_at: "2026-10-01T12:00:00.000Z", updated_at: "2026-10-01T12:00:00.000Z" },
  { id: "ct-alfa-site", client_id: "client-contabil", title: "Desenvolvimento do site (parcela final)", kind: "unico", amount: 2500, due_day: null, due_date: "2026-11-30",
    start_date: "2026-10-01", end_date: null, status: "ativo", owner: "leo", notes: "", created_at: "2026-10-01T12:00:00.000Z", updated_at: "2026-10-01T12:00:00.000Z" },
];

export const seedPayments: Payment[] = [
  { id: "pay-salao-09", contract_id: "ct-salao", period: "2026-09", amount: 1200, paid_at: "2026-09-10", created_at: "2026-09-10T12:00:00.000Z" },
  { id: "pay-salao-10", contract_id: "ct-salao", period: "2026-10", amount: 1200, paid_at: "2026-10-09", created_at: "2026-10-09T12:00:00.000Z" },
  { id: "pay-alfa-10", contract_id: "ct-alfa", period: "2026-10", amount: 350, paid_at: "2026-10-05", created_at: "2026-10-05T12:00:00.000Z" },
];

type P = Omit<Post, "id" | "cycle" | "status" | "owner" | "link" | "blocked_by"> & { status?: Post["status"]; blocked_by?: string };

const posts: P[] = [
  { week: 1, weekday: "seg", front: "Software", title: "Tem coisa que pode ser mais simples.", format: "Arte única", channel: "Instagram e LinkedIn", status: "pronto",
    brief: "Apresentar a visão da Lumora a partir de situações familiares: informação espalhada, tarefas repetidas e processos difíceis de acompanhar. Introduzir a marca como quem quer entender e resolver esses desafios.",
    visual: "Azul profundo, frase grande e módulos se encaixando, na linguagem da primeira arte." },
  { week: 1, weekday: "ter", front: "Software", title: "Antes de abrir o código, a gente abre a conversa.", format: "Carrossel de 4 telas", channel: "Instagram e LinkedIn", status: "pronto",
    brief: "Mostrar o jeito de pensar da equipe: entender a rotina, ouvir quem usa, identificar o problema e então desenhar a solução. Apresentar as pessoas por trás da Lumora de forma natural.",
    visual: "Fundo claro, cartões sobrepostos e uma foto real da equipe ou do trabalho." },
  { week: 1, weekday: "qua", front: "Software", title: "O que a Lumora pode construir com você?", format: "Carrossel de 4 telas", channel: "Instagram e LinkedIn", status: "em producao",
    brief: "Revisar a peça para o foco atual: sites, landing pages, sistemas, integrações e automações para pequenos negócios. Exemplos: apresentar serviços, organizar solicitações e reduzir retrabalho. CTA: conte qual necessidade digital vem primeiro no seu negócio.",
    visual: "Azul e branco, interfaces ilustrativas e pequenos destaques em lima." },
  { week: 1, weekday: "qui", front: "Studio", title: "Conheça a Lumora Studio: comunicação para negócios locais", format: "Carrossel de 4 telas", channel: "Instagram",
    brief: "1. Quem é o Studio. 2. Dificuldade: divulgar enquanto cuida da operação. 3. Planejamento, conteúdo, design e audiovisual. 4. Como entrar em contato. Falar com donos de salões e negócios de estética de São Paulo. CTA: conte qual serviço você quer apresentar melhor.",
    visual: "Assinatura do Studio, marinho, lima e branco. Uma ideia por tela e exemplos visuais de serviços locais." },
  { week: 1, weekday: "sex", front: "Studio", title: "Seu cliente entende o que você oferece?", format: "Arte única + legenda", channel: "Instagram",
    brief: "Mostrar uma apresentação de serviço com nome, para quem serve, diferencial e caminho até o agendamento. Exemplo autoral de salão, sem inventar resultado. CTA: salve para revisar a apresentação do seu serviço.",
    visual: "Hierarquia tipográfica forte, uma oferta ilustrativa e pequenos apontamentos. Nome fictício identificado como exemplo." },
  { week: 1, weekday: "sab", front: "Studio", title: "Um serviço, três formas de apresentar", format: "Reel de até 30 segundos", channel: "Instagram",
    brief: "Mostrar uma mesma pauta autoral em arte, carrossel e Reel, explicando a decisão de formato para cada objetivo. Gravar tela e detalhes do processo de criação; não é case de cliente. CTA: acompanhe os bastidores do Studio.",
    visual: "Gravação de tela com transições discretas, legendas legíveis e selo 'projeto conceitual'." },
  { week: 2, weekday: "seg", front: "Software", title: "Quantas vezes sua equipe digita a mesma informação?", format: "Carrossel de 4 telas", channel: "Instagram e LinkedIn",
    brief: "1. Um pedido chega por formulário. 2. O dado é copiado para planilha e mensagem. 3. Antes de automatizar, mapear responsáveis e erros. 4. Mostrar uma possibilidade de integração sem prometer economia não medida. CTA: qual tarefa você repete toda semana?",
    visual: "Fluxo visual com formulário, planilha e atendimento. Cenário identificado como ilustrativo." },
  { week: 2, weekday: "ter", front: "Software", title: "Veja um formulário virar uma solicitação organizada", format: "Reel de até 30 segundos", channel: "Instagram e LinkedIn", blocked_by: "Precisa de um protótipo funcional real",
    brief: "Demonstração funcional com dados fictícios: envio do formulário, registro e acompanhamento do status. Mostrar só o que foi realmente implementado. CTA: que etapa você gostaria de acompanhar melhor?",
    visual: "Captura de tela real do protótipo com zoom nos passos. Aviso 'demonstração com dados fictícios'." },
  { week: 2, weekday: "qua", front: "Software", title: "Uma tela bonita é só o começo.", format: "Arte única + legenda", channel: "Instagram e LinkedIn",
    brief: "Interface autoral explicando três critérios: encontrar informação, entender o próximo passo e concluir a tarefa. CTA: salve estes pontos para avaliar seu site ou sistema.",
    visual: "Interface conceitual com três apontamentos legíveis, marinho e lima." },
  { week: 2, weekday: "qui", front: "Studio", title: "O conteúdo que ajuda seu cliente a decidir", format: "Carrossel de 4 telas", channel: "Instagram",
    brief: "Para um salão: como funciona o serviço, dúvidas antes de agendar e cuidados com a experiência. Fechar com chamada de contato clara, sem prometer agenda cheia. CTA: escolha uma dúvida frequente para transformar em post.",
    visual: "Exemplos autorais aplicados à mesma marca fictícia: pergunta, explicação e próximo passo." },
  { week: 2, weekday: "sex", front: "Studio", title: "Do briefing à pauta: o que perguntamos primeiro", format: "Arte única + legenda", channel: "Instagram",
    brief: "Perguntas sobre serviço prioritário, público, diferenciais e objeções, e como as respostas orientam o calendário. Citar Bea e Fran no processo. CTA: qual pergunta você gostaria de responder sobre sua comunicação?",
    visual: "Foto real do trabalho ou composição editorial com anotações. Sem simular reunião com cliente inexistente." },
  { week: 2, weekday: "sab", front: "Studio", title: "A mesma mensagem, duas escolhas de design", format: "Reel de até 30 segundos", channel: "Instagram",
    brief: "Comparar duas composições da própria Lumora para uma oferta fictícia: como contraste e hierarquia alteram a leitura, sem falar em conversão. CTA: observe qual informação você percebe primeiro.",
    visual: "Comparação lado a lado e explicação curta do Leo. Identificar como estudo autoral." },
  { week: 3, weekday: "seg", front: "Software", title: "O que acontece entre uma ideia e um software?", format: "Carrossel de 5 telas", channel: "Instagram e LinkedIn",
    brief: "Entendimento da rotina, desenho do fluxo, construção, testes e entrega, com bastidores reais em demonstração interna. Explicar a participação do cliente em cada etapa. CTA: qual etapa você quer conhecer melhor?",
    visual: "Rascunhos e registros reais de Leo e Fab, módulos numerados e indicação de projeto interno." },
  { week: 3, weekday: "ter", front: "Software", title: "O que testamos antes de entregar um site", format: "Reel de até 30 segundos", channel: "Instagram e LinkedIn",
    brief: "Leo ou Fab mostra a versão de celular, um formulário e a resposta para um campo obrigatório, em site demonstrativo próprio. CTA: teste também o contato do seu site.",
    visual: "Gravação real em celular e tela, legendas e destaques discretos. Sem dados privados." },
  { week: 3, weekday: "qua", front: "Software", title: "Qual processo do seu negócio você simplificaria primeiro?", format: "Arte única + legenda", channel: "Instagram e LinkedIn",
    brief: "Exemplos: orçamento sem acompanhamento, informação espalhada e tarefa manual repetitiva. Convidar o dono a explicar o problema antes de escolher a solução. CTA: envie no direct um exemplo da sua rotina.",
    visual: "Pergunta dominante e três exemplos em módulos, sem prometer solução sem diagnóstico." },
  { week: 3, weekday: "qui", front: "Studio", title: "Qual plano de conteúdo combina com o seu negócio?", format: "Carrossel de 4 telas", channel: "Instagram", blocked_by: "Depende de fechar a oferta dos planos",
    brief: "Apresentar as diferenças entre os planos mensais de conteúdo, sem ranking. CTA: envie sua necessidade para avaliarmos o escopo.",
    visual: "Três blocos com a mesma qualidade visual e diferenças de entrega claras." },
  { week: 3, weekday: "sex", front: "Studio", title: "Tenho alguém postando. Onde o Studio pode ajudar?", format: "Arte única + legenda", channel: "Instagram",
    brief: "Reconhecer quem já cuida das redes e explicar apoio em planejamento, direção visual, conteúdo e análise, sem depreciar o profissional interno. CTA: conte qual parte hoje toma mais tempo.",
    visual: "Título legível e quadro simples com responsabilidades complementares." },
  { week: 3, weekday: "sab", front: "Studio", title: "Como gravar material útil para os seus próximos posts", format: "Reel de até 30 segundos", channel: "Instagram",
    brief: "Bea ou Fran demonstra três registros simples no ambiente da Lumora: espaço, etapa do trabalho e detalhe da entrega. Enquadramento, luz e autorização de quem aparece. CTA: salve este guia para a próxima gravação.",
    visual: "Vídeo real com legendas e exemplos práticos. Sem anunciar captação terceirizada." },
  { week: 4, weekday: "seg", front: "Software", title: "Landing page ou site: por onde começar?", format: "Carrossel de 4 telas", channel: "Instagram e LinkedIn",
    brief: "Comparar uma página focada em uma oferta com um site para vários serviços, usando o mesmo negócio fictício. CTA: você quer destacar uma oferta ou apresentar o negócio completo?",
    visual: "Duas estruturas desenhadas pela Lumora, vistas no celular, com selo 'exemplo conceitual'." },
  { week: 4, weekday: "ter", front: "Software", title: "Da apresentação do serviço ao pedido de contato", format: "Reel de até 30 segundos", channel: "Instagram e LinkedIn", blocked_by: "Depende da demonstração integrada",
    brief: "Jornada criada pela Lumora: conteúdo do Studio, landing page e formulário funcional da Software, como projeto conceitual com dados fictícios. CTA: qual trecho dessa jornada precisa de atenção no seu negócio?",
    visual: "Capturas reais do projeto integrado, mesmo padrão visual entre conteúdo, página e formulário." },
  { week: 4, weekday: "qua", front: "Software", title: "Antes do orçamento, vamos entender a sua rotina", format: "Arte única + legenda", channel: "Instagram e LinkedIn",
    brief: "Quatro informações úteis para a conversa: problema, quem usa, ferramentas atuais e prioridade. Diagnóstico e desenvolvimento têm escopos próprios. CTA: envie 'SOFTWARE' e conte qual problema quer organizar.",
    visual: "Composição editorial simples, pergunta de abertura e um exemplo de rotina." },
  { week: 4, weekday: "qui", front: "Studio", title: "O que olhamos depois que o conteúdo é publicado", format: "Carrossel de 4 telas", channel: "Instagram",
    brief: "Entregas, dúvidas recebidas, visitas ao perfil e contatos informados pelo negócio, e como a análise orienta o próximo calendário. Relatório demonstrativo, sem números de clientes. CTA: qual informação ajudaria sua próxima decisão?",
    visual: "Modelo de relatório com campos ilustrativos e destaque 'exemplo demonstrativo'." },
  { week: 4, weekday: "sex", front: "Studio", title: "O que precisamos de você para começar", format: "Arte única + legenda", channel: "Instagram",
    brief: "Informações do negócio, prioridades, materiais e participação na aprovação. Processo de entrada e papel de Bea e Fran. CTA: envie 'STUDIO' para conversar sobre sua comunicação. Sem prometer resultado nem prazo.",
    visual: "Checklist curto com boa hierarquia e próximo passo claro. Imagem real da equipe quando houver." },
  { week: 4, weekday: "sab", front: "Studio", title: "O mesmo projeto visto pelo Studio e pela Software", format: "Reel de até 30 segundos", channel: "Instagram", blocked_by: "Depende da demonstração integrada",
    brief: "Leo e Bea explicam, sobre a demonstração integrada, como conteúdo e site atendem necessidades diferentes, sem tratar como case real. CTA: conte se precisa de comunicação, tecnologia ou das duas.",
    visual: "Vídeo curto da equipe com aplicações reais do projeto autoral e identificação 'projeto conceitual'." },
];

export const seedPosts: Post[] = posts.map((p) => ({
  ...p,
  id: `post-1-${p.week}-${p.weekday}`,
  cycle: 1,
  status: p.status ?? "nao iniciado",
  owner: p.format.startsWith("Reel") ? "leo" : "bea",
  link: null,
  blocked_by: p.blocked_by ?? null,
}));
