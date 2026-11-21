-- Gerador de contratos (2026-11-19): o texto do contrato gerado no HUB fica no próprio contrato.
-- HTML limpo por sanitizeDoc (src/lib/contract-template.ts). A RLS da tabela já cobre as colunas.
alter table public.contracts
  add column if not exists document text,
  add column if not exists document_at timestamptz;
