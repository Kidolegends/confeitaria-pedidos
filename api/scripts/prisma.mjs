// Roda o Prisma com o schema certo para o banco configurado.
//   SQLite (padrão, desenvolvimento): prisma/schema.prisma
//   PostgreSQL (produção):            prisma/postgres/schema.prisma
// O banco é escolhido por DB_PROVIDER (sqlite | postgresql) ou, se não houver,
// pelo começo da DATABASE_URL ("postgres..." = PostgreSQL).
//
// Uso: node scripts/prisma.mjs <comando do prisma>   ex.: node scripts/prisma.mjs migrate deploy
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import 'dotenv/config';

const SQLITE_SCHEMA = 'prisma/schema.prisma';
const POSTGRES_SCHEMA = 'prisma/postgres/schema.prisma';

const url = process.env.DATABASE_URL ?? '';
const provider = process.env.DB_PROVIDER || (url.startsWith('postgres') ? 'postgresql' : 'sqlite');
const args = process.argv.slice(2);

if (args[0] === 'sync-postgres') {
  // Gera o schema do Postgres a partir do schema principal (só muda o provider)
  const source = readFileSync(SQLITE_SCHEMA, 'utf8');
  const header = '// ARQUIVO GERADO por "npm run db:sync-postgres". Edite prisma/schema.prisma.\n';
  const pg = source.replace('provider = "sqlite"', 'provider = "postgresql"');
  writeFileSync(POSTGRES_SCHEMA, header + pg);
  console.log(`${POSTGRES_SCHEMA} atualizado.`);
  process.exit(0);
}

const schema = provider === 'postgresql' ? POSTGRES_SCHEMA : SQLITE_SCHEMA;
console.log(`[prisma] banco: ${provider} (schema ${schema})`);
// Chama o CLI instalado direto (sem npx): o start fica bem mais rápido em servidores pequenos
const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
execFileSync(process.execPath, [prismaCli, ...args, '--schema', schema], { stdio: 'inherit' });
