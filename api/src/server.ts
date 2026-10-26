import { createApp } from './app';
import { env } from './config/env';
import { resetDemoData, scheduleDemoResets } from './demo/demo';
import { prisma } from './lib/prisma';
import { ensureAdminUser } from './modules/auth/auth.service';
import { getSettings } from './modules/settings/settings.service';

async function main() {
  // Modo demonstração: começa sempre com a loja de exemplo (banco limpo + dados de exemplo)
  if (env.DEMO_MODE) await resetDemoData();

  // Primeiro deploy: cria as configurações padrão e (se configurado) o usuário admin
  await getSettings();
  await ensureAdminUser();

  const app = createApp();
  scheduleDemoResets();
  const server = app.listen(env.PORT, () => {
    console.log(`Servidor rodando em http://localhost:${env.PORT} (${env.NODE_ENV})`);
    console.log(`Documentação da API em http://localhost:${env.PORT}/docs`);
  });

  // Desligamento limpo (Render/Railway mandam SIGTERM a cada deploy)
  const shutdown = () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Falha ao iniciar:', error);
  process.exit(1);
});
