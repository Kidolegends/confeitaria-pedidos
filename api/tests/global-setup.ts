import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

// Roda uma vez antes de todos os testes: cria as tabelas do banco de teste
// (cada teste limpa os dados com resetDatabase).
// Padrão: SQLite em prisma/test.db. Com TEST_DATABASE_URL=postgresql://... os testes
// rodam num PostgreSQL de verdade (veja "npm run test:postgres").
// O banco de desenvolvimento (dev.db) nunca é tocado.
export default function setup() {
  rmSync(join(__dirname, '.uploads'), { recursive: true, force: true });
  const url = process.env.TEST_DATABASE_URL ?? 'file:./test.db';
  if (!url.startsWith('postgres'))
    rmSync(join(__dirname, '..', 'prisma', 'test.db'), { force: true });

  execSync('node scripts/prisma.mjs db push --skip-generate', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url, DB_PROVIDER: '' },
    stdio: 'ignore',
  });
}
