import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { addDays, toLocalDate } from '../src/lib/time';

export const app = createApp();

export async function resetDatabase() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.user.deleteMany();
  // Nos testes a loja abre todos os dias, para as datas relativas sempre funcionarem
  await prisma.storeSettings.deleteMany();
  await prisma.storeSettings.create({
    data: {
      id: 1,
      storeName: 'Doce Encanto Confeitaria',
      whatsappNumber: '5534900000000',
      address: 'Rua das Flores, 123',
      city: 'Uberaba - MG',
      openDays: '0,1,2,3,4,5,6',
      deliveryFeeCents: 1000,
    },
  });
}

/** Cria o admin direto no banco e devolve o header de autorização. */
export async function loginAsAdmin() {
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@teste.dev',
      passwordHash: await bcrypt.hash('senha123', 4),
      role: 'admin',
    },
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@teste.dev', password: 'senha123' });
  return { Authorization: `Bearer ${res.body.token as string}` };
}

/** Dois produtos ativos e um inativo. */
export async function createProducts() {
  const bolo = await prisma.product.create({
    data: {
      name: 'Bolo de Brigadeiro',
      description: 'Bolo de chocolate',
      category: 'bolos',
      priceCents: 9500,
      unit: 'kg',
    },
  });
  const brigadeiro = await prisma.product.create({
    data: {
      name: 'Brigadeiro',
      description: 'Cento de brigadeiro',
      category: 'doces',
      priceCents: 18000,
      unit: 'cento',
    },
  });
  const inativo = await prisma.product.create({
    data: {
      name: 'Bolo de Milho',
      description: 'Fora de temporada',
      category: 'bolos',
      priceCents: 3800,
      active: false,
    },
  });
  return { bolo, brigadeiro, inativo };
}

/** Data "AAAA-MM-DD" daqui a N dias (no fuso da confeitaria). */
export const inDays = (days: number) => addDays(toLocalDate(), days);

/** Corpo válido de pedido; sobrescreva o que quiser. */
export function orderBody(items: { productId: string; quantity: number }[], extra = {}) {
  return {
    customerName: 'Maria Souza',
    customerPhone: '(34) 99999-8888',
    fulfillment: 'retirada',
    scheduledDate: inDays(2),
    scheduledTime: '15:00',
    items,
    ...extra,
  };
}
