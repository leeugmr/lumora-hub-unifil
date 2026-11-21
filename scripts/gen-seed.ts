// Gera supabase/seed.sql a partir de src/lib/seed.ts.
// Uso: node --experimental-strip-types scripts/gen-seed.ts
import { writeFileSync } from "node:fs";
import { seedClients, seedDecisions, seedLeads, seedNotes, seedPosts, seedProjects, seedTasks } from "../src/lib/seed.ts";

const tables: [string, unknown[]][] = [
  ["clients", seedClients],
  ["leads", seedLeads],
  ["projects", seedProjects],
  ["tasks", seedTasks],
  ["posts", seedPosts],
  ["decisions", seedDecisions],
  ["notes", seedNotes],
];

const lines = [
  "-- Lumora HUB: dados iniciais (gerado por scripts/gen-seed.ts com dados de exemplo fictícios).",
  "-- Rode depois de schema.sql. Linhas que já existem são mantidas.",
  "",
];

for (const [table, rows] of tables) {
  const json = JSON.stringify(rows).replaceAll("'", "''");
  lines.push(
    `insert into ${table} select * from jsonb_populate_recordset(null::${table}, '${json}'::jsonb) on conflict (id) do nothing;`,
    "",
  );
}

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n"));
console.log("supabase/seed.sql gerado");
