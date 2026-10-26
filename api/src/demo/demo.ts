import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';
import { prisma } from '../lib/prisma';
import { uploadDir } from '../lib/storage';
import { DEMO_ADMIN, seedDatabase } from './seed-data';

/** Informações da demonstração que o site mostra (null fora do modo demonstração). */
export function demoInfo() {
  if (!env.DEMO_MODE) return null;
  return {
    adminEmail: DEMO_ADMIN.email,
    adminPassword: DEMO_ADMIN.password,
    resetHours: env.DEMO_RESET_HOURS,
  };
}

/** Bloqueia ações que atrapalhariam os outros visitantes (ex.: trocar a senha do admin). */
export function assertNotDemo(action: string) {
  if (!env.DEMO_MODE) return;
  throw new AppError(
    403,
    `Esta é uma demonstração: não é possível ${action}, para que todos os visitantes consigam entrar. Na loja de verdade isso funciona normalmente.`,
  );
}

/** Volta a demonstração ao estado original: dados de exemplo e nenhuma foto enviada. */
export async function resetDemoData() {
  // Fotos enviadas pelos visitantes (as de exemplo ficam em seed-images e não são apagadas)
  await rm(join(uploadDir, 'products'), { recursive: true, force: true });
  const count = await seedDatabase(prisma, { bundledImages: true });
  console.log(
    `Modo demonstração: dados recriados (${count.products} produtos, ${count.orders} pedidos). ` +
      `Login: ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`,
  );
}

/** Recria os dados de tempos em tempos (DEMO_RESET_HOURS). Devolve o timer, ou null. */
export function scheduleDemoResets() {
  if (!env.DEMO_MODE || env.DEMO_RESET_HOURS <= 0) return null;
  const timer = setInterval(
    () => {
      resetDemoData().catch((error) => console.error('Falha ao recriar a demonstração:', error));
    },
    env.DEMO_RESET_HOURS * 60 * 60 * 1000,
  );
  timer.unref();
  return timer;
}
