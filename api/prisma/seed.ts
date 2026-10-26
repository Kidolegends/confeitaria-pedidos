import { PrismaClient } from '@prisma/client';
import { DEMO_ADMIN, seedDatabase } from '../src/demo/seed-data';

// npm run seed: apaga tudo e recria a loja de exemplo (dados em src/demo/seed-data.ts)
const prisma = new PrismaClient();

async function main() {
  // O seed APAGA os dados. Em produção só roda se for liberado de propósito.
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error(
      'Seed bloqueado em produção (apagaria pedidos reais). Use ADMIN_EMAIL/ADMIN_PASSWORD.',
    );
  }

  const count = await seedDatabase(prisma);
  console.log(
    `Seed concluído: 1 admin, ${count.products} produtos, ${count.orders} pedidos e ${count.testimonials} depoimentos.`,
  );
  console.log(`Login do painel: ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
