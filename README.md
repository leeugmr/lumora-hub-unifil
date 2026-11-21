# Lumora HUB

Sistema web interno da Lumora, empresa de quatro sócios que atua com desenvolvimento de software (Lumora Software) e design e conteúdo (Lumora Studio). O HUB reúne a operação do dia a dia: tarefas de cada sócio, funil de vendas, clientes e projetos, contratos e cobranças, calendário editorial, decisões e notas.

**Trabalho da disciplina Desenvolvimento de Projetos II, Centro Universitário Filadélfia (UniFil).**

| | |
|---|---|
| Autor | Leonardo Gabriel Capucho de Moura |
| Curso | Engenharia de Software |
| Documentação | [`docs/Documentacao-Lumora-HUB.pdf`](docs/Documentacao-Lumora-HUB.pdf) (requisitos, casos de uso, DER, classes, atividade e sequência) |

> Este repositório é uma cópia do sistema preparada para a avaliação. O código é o mesmo que a equipe usa em produção, mas **todos os dados de exemplo são fictícios** e o histórico de commits começa do zero. O repositório de produção da empresa é privado.

## Tecnologias

- Next.js 15 (App Router), React 19 e TypeScript
- Tailwind CSS 4 e shadcn/ui sobre Base UI
- Supabase: PostgreSQL 17, autenticação, Row Level Security, tempo real, Edge Function e Web Push
- Hospedagem na Vercel

## Rodar no computador

Precisa do Node.js 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem as variáveis do Supabase, o HUB roda em **modo local**: não pede login (basta escolher um dos sócios na tela "Quem está usando agora?"), e os dados ficam só no navegador, começando com os dados de exemplo. Dá para criar, editar e excluir tarefas, leads, clientes, projetos, contratos e pagamentos. No menu, em "Você está como", troca-se o sócio. Para voltar aos dados iniciais, limpe os dados do site no navegador.

## Ligar a um banco Supabase (opcional)

1. Crie um projeto no Supabase e rode no SQL Editor, nesta ordem: `supabase/schema.sql`, `supabase/seed.sql`, `supabase/team.sql`, `supabase/notes.sql`, `supabase/dinheiro-avisos-agenda.sql`, `supabase/lead-events.sql` e `supabase/contratos-documento.sql`.
2. Cadastre os e-mails da equipe na tabela `team_members` (só esses e-mails conseguem criar conta).
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave `anon` do projeto.

Os avisos no celular (Edge Function `supabase/functions/notify`) precisam também das chaves VAPID e de um segredo guardados no Vault do Supabase, e do endereço do seu projeto em `supabase/dinheiro-avisos-agenda.sql`. Sem eles, o resto do sistema funciona normalmente.

## Onde fica cada coisa

| Pasta | O quê |
|---|---|
| `src/app` | Telas: Hoje, Pipeline, Clientes, Dinheiro, Conteúdo, Decisões, Notas, Mapa, Briefing e Ajustes |
| `src/components` | Componentes: tarefas, fichas, contratos, agenda, funil |
| `src/lib/store.tsx` | Camada de dados: CRUD, tempo real e sessão (Supabase ou modo local) |
| `src/lib/types.ts` | Tipos de todas as tabelas |
| `src/lib/seed.ts` | Dados de exemplo fictícios do modo local |
| `supabase/` | Esquema do banco, políticas de segurança, gatilhos e Edge Function |
| `docs/` | Documentação do trabalho e diagramas (projeto do Astah UML em `docs/astah`) |
