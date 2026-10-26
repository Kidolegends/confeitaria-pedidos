import type { StoreSettings } from '@prisma/client';
import { env } from '../../config/env';
import { demoInfo } from '../../demo/demo';
import { prisma } from '../../lib/prisma';
import { addDays, toLocalDate } from '../../lib/time';
import type { UpdateSettingsInput } from './settings.schemas';

// Valores usados na primeira vez que a API sobe (depois a dona edita no painel)
const DEFAULT_SETTINGS = {
  id: 1,
  storeName: 'Doce Encanto Confeitaria',
  whatsappNumber: env.WHATSAPP_NUMBER,
  address: 'Rua das Flores, 123 - Centro',
  city: 'Uberaba - MG',
};

/** Busca as configurações; se ainda não existirem, cria com os valores padrão. */
export async function getSettings(): Promise<StoreSettings> {
  return prisma.storeSettings.upsert({ where: { id: 1 }, update: {}, create: DEFAULT_SETTINGS });
}

export async function updateSettings(input: UpdateSettingsInput) {
  await getSettings();
  return toSettingsView(await prisma.storeSettings.update({ where: { id: 1 }, data: input }));
}

export function openDaysOf(settings: StoreSettings): number[] {
  return settings.openDays.split(',').map(Number);
}

/** Primeira data aceita para encomendas (hoje + antecedência mínima). */
export function minScheduledDate(settings: StoreSettings): string {
  return addDays(toLocalDate(), settings.minDaysAhead);
}

/** Formato devolvido pela API (dias como lista de números). */
export function toSettingsView(settings: StoreSettings) {
  return { ...settings, openDays: openDaysOf(settings) };
}

/** Dados públicos usados pelo site. */
export async function getPublicStore() {
  const settings = await getSettings();
  return {
    ...toSettingsView(settings),
    minDate: minScheduledDate(settings),
    today: toLocalDate(),
    // Modo demonstração: o site mostra o aviso e o login de teste (null numa loja real)
    demo: demoInfo(),
  };
}
