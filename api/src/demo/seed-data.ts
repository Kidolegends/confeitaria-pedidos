import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { BUNDLED_IMAGE_PREFIX, SEED_IMAGES_DIR, storage } from '../lib/storage';
import { addDays, startOfLocalDay, toLocalDate, weekdayOf } from '../lib/time';

/**
 * Dados de exemplo da Doce Encanto (cardápio, fotos, depoimentos e pedidos da semana).
 * Usado pelo "npm run seed" (desenvolvimento) e pelo modo demonstração (DEMO_MODE=true).
 */

/** Login do painel criado pelo seed (só para desenvolvimento e para a demonstração). */
export const DEMO_ADMIN = { email: 'admin@confeitaria.dev', password: 'admin123' };

export interface SeedOptions {
  /**
   * true: as fotos são servidas direto da pasta seed-images (que vem junto com o código), sem
   * copiar para o storage. Usado na demonstração, onde a pasta de uploads é apagada a cada start.
   */
  bundledImages?: boolean;
}

const products = [
  {
    name: 'Bolo de Brigadeiro',
    category: 'bolos',
    priceCents: 9500,
    unit: 'kg',
    emoji: '🎂',
    featured: true,
    description:
      'Massa de chocolate fofinha, recheio cremoso de brigadeiro e cobertura de granulado belga.',
  },
  {
    name: 'Bolo Red Velvet',
    category: 'bolos',
    priceCents: 11000,
    unit: 'kg',
    emoji: '🍰',
    featured: true,
    description:
      'Massa aveludada com recheio e cobertura de cream cheese. Perfeito para aniversários.',
  },
  {
    name: 'Bolo de Cenoura com Chocolate',
    category: 'bolos',
    priceCents: 4500,
    unit: 'unidade (forma 22 cm)',
    emoji: '🥕',
    description: 'O clássico da vovó, com calda de chocolate generosa por cima.',
  },
  {
    name: 'Bolo de Pote Ninho com Morango',
    category: 'bolos',
    priceCents: 1400,
    unit: 'unidade',
    emoji: '🍓',
    description: 'Pote de 250 ml com massa branca, creme de leite Ninho e morangos frescos.',
  },
  {
    name: 'Torta de Limão',
    category: 'tortas',
    priceCents: 7800,
    unit: 'unidade (20 cm)',
    emoji: '🍋',
    featured: true,
    description: 'Massa amanteigada, creme de limão siciliano e merengue maçaricado.',
  },
  {
    name: 'Torta Holandesa',
    category: 'tortas',
    priceCents: 8900,
    unit: 'unidade (20 cm)',
    emoji: '🥧',
    description: 'Creme holandês, base de biscoito e cobertura de chocolate meio amargo.',
  },
  {
    name: 'Brigadeiro Gourmet',
    category: 'doces',
    priceCents: 18000,
    unit: 'cento',
    emoji: '🍫',
    featured: true,
    description: 'Chocolate belga 50% cacau, enrolado à mão. Ideal para festas.',
  },
  {
    name: 'Beijinho',
    category: 'doces',
    priceCents: 16000,
    unit: 'cento',
    emoji: '🥥',
    description: 'Coco fresco ralado e leite condensado, finalizado com cravo.',
  },
  {
    name: 'Brownie Recheado',
    category: 'doces',
    priceCents: 900,
    unit: 'unidade',
    emoji: '🟫',
    description: 'Brownie de chocolate meio amargo recheado com doce de leite.',
  },
  {
    name: 'Pão de Mel',
    category: 'doces',
    priceCents: 700,
    unit: 'unidade',
    emoji: '🍯',
    description: 'Massa de especiarias com recheio de doce de leite e banho de chocolate.',
  },
  {
    name: 'Coxinha de Frango',
    category: 'salgados',
    priceCents: 12000,
    unit: 'cento (festa)',
    emoji: '🍗',
    description: 'Massa de batata e recheio de frango com catupiry. Tamanho festa.',
  },
  {
    name: 'Empadinha de Palmito',
    category: 'salgados',
    priceCents: 13000,
    unit: 'cento (festa)',
    emoji: '🥟',
    description: 'Massa que desmancha na boca com recheio cremoso de palmito.',
  },
  {
    name: 'Kit Festa 20 pessoas',
    category: 'kits',
    priceCents: 39000,
    unit: 'kit',
    emoji: '🎉',
    featured: true,
    description: 'Bolo de 2 kg, 100 docinhos e 100 salgados. Escolha os sabores nas observações.',
  },
  {
    name: 'Cesta Café da Manhã',
    category: 'kits',
    priceCents: 15900,
    unit: 'cesta',
    emoji: '🧺',
    description: 'Bolo, pães, frutas, suco, geleia e um cartão com sua mensagem.',
  },
  {
    name: 'Bolo de Milho Cremoso',
    category: 'bolos',
    priceCents: 3800,
    unit: 'unidade',
    emoji: '🌽',
    active: false,
    description: 'Sabor da época de festa junina (fora de temporada).',
  },
];

type SeedOrder = {
  customerName: string;
  customerPhone: string;
  fulfillment: 'retirada' | 'entrega';
  address?: string;
  daysFromToday: number; // data de entrega/retirada relativa a hoje
  createdDaysAgo: number;
  scheduledTime: string;
  status: string;
  notes?: string;
  items: [string, number][];
};

// As datas são relativas a "hoje": o painel sempre tem dados recentes para mostrar.
const orders: SeedOrder[] = [
  {
    customerName: 'Mariana Alves',
    customerPhone: '34991234567',
    fulfillment: 'retirada',
    daysFromToday: -6,
    createdDaysAgo: 9,
    scheduledTime: '10:00',
    status: 'entregue',
    items: [
      ['Bolo de Brigadeiro', 2],
      ['Brigadeiro Gourmet', 1],
    ],
  },
  {
    customerName: 'Carlos Henrique',
    customerPhone: '34998765432',
    fulfillment: 'entrega',
    address: 'Rua Artur Machado, 150 - Centro',
    daysFromToday: -3,
    createdDaysAgo: 6,
    scheduledTime: '15:00',
    status: 'entregue',
    items: [['Kit Festa 20 pessoas', 1]],
    notes: 'Bolo de brigadeiro, docinhos sortidos.',
  },
  {
    customerName: 'Fernanda Rocha',
    customerPhone: '34999112233',
    fulfillment: 'retirada',
    daysFromToday: -1,
    createdDaysAgo: 4,
    scheduledTime: '09:30',
    status: 'cancelado',
    items: [['Torta Holandesa', 1]],
    notes: 'Cliente desmarcou por telefone.',
  },
  {
    customerName: 'Juliana Martins',
    customerPhone: '34988776655',
    fulfillment: 'retirada',
    daysFromToday: 0,
    createdDaysAgo: 3,
    scheduledTime: '11:00',
    status: 'pronto',
    items: [
      ['Torta de Limão', 1],
      ['Pão de Mel', 6],
    ],
  },
  {
    customerName: 'Roberto Silva',
    customerPhone: '34997654321',
    fulfillment: 'entrega',
    address: 'Av. Leopoldino de Oliveira, 2200 - Abadia',
    daysFromToday: 0,
    createdDaysAgo: 2,
    scheduledTime: '16:30',
    status: 'em_producao',
    items: [
      ['Bolo Red Velvet', 2],
      ['Beijinho', 1],
    ],
    notes: 'Escrever "Parabéns, Lu!" no bolo.',
  },
  {
    customerName: 'Patrícia Gomes',
    customerPhone: '34991827364',
    fulfillment: 'retirada',
    daysFromToday: 1,
    createdDaysAgo: 1,
    scheduledTime: '14:00',
    status: 'confirmado',
    items: [
      ['Bolo de Cenoura com Chocolate', 1],
      ['Brownie Recheado', 4],
    ],
  },
  {
    customerName: 'Lucas Ferreira',
    customerPhone: '34996543210',
    fulfillment: 'entrega',
    address: 'Rua Segismundo Mendes, 45 - Fabrício',
    daysFromToday: 2,
    createdDaysAgo: 0,
    scheduledTime: '10:00',
    status: 'novo',
    items: [['Cesta Café da Manhã', 1]],
    notes: 'É surpresa! Entregar para a Ana. Cartão: "Te amo, feliz aniversário!"',
  },
  {
    customerName: 'Aline Costa',
    customerPhone: '34992233445',
    fulfillment: 'retirada',
    daysFromToday: 3,
    createdDaysAgo: 0,
    scheduledTime: '17:00',
    status: 'novo',
    items: [
      ['Coxinha de Frango', 1],
      ['Empadinha de Palmito', 1],
      ['Brigadeiro Gourmet', 2],
    ],
  },
  {
    customerName: 'Gustavo Lima',
    customerPhone: '34993344556',
    fulfillment: 'retirada',
    daysFromToday: 5,
    createdDaysAgo: 0,
    scheduledTime: '09:00',
    status: 'novo',
    items: [['Bolo de Pote Ninho com Morango', 10]],
  },
  {
    customerName: 'Renata Souza',
    customerPhone: '34994455667',
    fulfillment: 'entrega',
    address: 'Rua Tristão de Castro, 310 - Estados Unidos',
    daysFromToday: 4,
    createdDaysAgo: 1,
    scheduledTime: '15:30',
    status: 'confirmado',
    items: [
      ['Bolo de Brigadeiro', 3],
      ['Beijinho', 1],
    ],
    notes: 'Chá revelação: topo com "Menino ou menina?"',
  },
  {
    customerName: 'Eduardo Prado',
    customerPhone: '34995566778',
    fulfillment: 'retirada',
    daysFromToday: 6,
    createdDaysAgo: 0,
    scheduledTime: '11:30',
    status: 'novo',
    items: [['Torta Holandesa', 1]],
  },
  {
    customerName: 'Beatriz Nunes',
    customerPhone: '34996677889',
    fulfillment: 'entrega',
    address: 'Rua Major Eustáquio, 88 - Mercês',
    daysFromToday: 9,
    createdDaysAgo: 0,
    scheduledTime: '10:00',
    status: 'novo',
    items: [['Kit Festa 20 pessoas', 2]],
    notes: 'Festa de 15 anos, tema lilás.',
  },
];

const testimonials = [
  {
    customerName: 'Camila R.',
    rating: 5,
    text: 'O bolo Red Velvet do aniversário da minha filha estava perfeito! Todo mundo pediu o contato de vocês.',
  },
  {
    customerName: 'Rafael M.',
    rating: 5,
    text: 'Encomendei o Kit Festa pelo site, chegou no horário certinho e os salgados estavam quentinhos.',
  },
  {
    customerName: 'Dona Lúcia',
    rating: 5,
    text: 'Torta de limão igual à da minha mãe. Já virei cliente fiel da Doce Encanto.',
  },
  {
    customerName: 'Thiago S.',
    rating: 4,
    text: 'Brigadeiros maravilhosos e atendimento pelo WhatsApp super rápido.',
  },
];

/** "Bolo de Limão" → "bolo-de-limao" */
function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Leva a data para um dia em que a loja abre (terça a sábado). */
function openDay(date: string, forward: boolean): string {
  let day = date;
  while ([0, 1].includes(weekdayOf(day))) day = addDays(day, forward ? 1 : -1);
  return day;
}

/** Apaga todos os dados e recria a loja de exemplo. */
export async function seedDatabase(prisma: PrismaClient, options: SeedOptions = {}) {
  // Apaga tudo e recria (a ordem importa por causa das chaves estrangeiras)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.storeSettings.deleteMany();
  await prisma.user.deleteMany();
  // Reinicia a numeração dos pedidos (#0001)
  await prisma
    .$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = 'Order'`)
    .catch(() => {});

  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: DEMO_ADMIN.email,
      passwordHash: await bcrypt.hash(DEMO_ADMIN.password, 10),
      role: 'admin',
    },
  });

  await prisma.storeSettings.create({
    data: {
      id: 1,
      storeName: 'Doce Encanto Confeitaria',
      whatsappNumber: process.env.WHATSAPP_NUMBER || '5534900000000', // número fictício
      phoneDisplay: '(34) 90000-0000',
      email: 'contato@doceencanto.com.br',
      instagram: '@doceencanto.uberaba',
      address: 'Rua das Flores, 123 - Centro',
      city: 'Uberaba - MG',
      openDays: '2,3,4,5,6',
      openingTime: '08:00',
      closingTime: '18:00',
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryFeeCents: 1000,
      deliveryArea: 'Entregamos em toda a área urbana de Uberaba',
      minDaysAhead: 1,
      aboutText:
        'A Doce Encanto nasceu na cozinha de casa, em 2018, com as receitas de família da Dona Helena. ' +
        'Hoje fazemos bolos, tortas, docinhos e salgados para festas e para o dia a dia, sempre com ' +
        'ingredientes frescos e muito carinho.',
    },
  });

  await prisma.testimonial.createMany({ data: testimonials });

  const created = new Map<string, { id: string; name: string; priceCents: number }>();
  for (const product of products) {
    const row = await prisma.product.create({ data: product });
    created.set(row.name, row);

    const slug = slugify(row.name);
    const file = join(SEED_IMAGES_DIR, `${slug}.webp`);
    if (existsSync(file)) {
      let key = `${BUNDLED_IMAGE_PREFIX}${slug}.webp`;
      if (!options.bundledImages) {
        // Copia a foto para o storage configurado (disco ou S3), como se a dona tivesse enviado
        key = `products/seed-${slug}.webp`;
        await storage.save(key, readFileSync(file), 'image/webp');
      }
      await prisma.product.update({ where: { id: row.id }, data: { imageKey: key } });
    }
  }

  const today = toLocalDate();
  for (const order of orders) {
    const items = order.items.map(([name, quantity]) => {
      const product = created.get(name)!;
      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity,
        subtotalCents: product.priceCents * quantity,
      };
    });
    // Horário de criação: 10h da manhã do dia em que o cliente fez o pedido
    const createdDay = addDays(today, -order.createdDaysAgo);
    const createdAt = new Date(
      Math.min(startOfLocalDay(createdDay).getTime() + 10 * 60 * 60_000, Date.now() - 5 * 60_000),
    );

    await prisma.order.create({
      data: {
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        fulfillment: order.fulfillment,
        address: order.address ?? null,
        scheduledDate: openDay(addDays(today, order.daysFromToday), order.daysFromToday >= 0),
        scheduledTime: order.scheduledTime,
        status: order.status,
        notes: order.notes ?? null,
        deliveryFeeCents: order.fulfillment === 'entrega' ? 1000 : 0,
        totalCents:
          items.reduce((sum, item) => sum + item.subtotalCents, 0) +
          (order.fulfillment === 'entrega' ? 1000 : 0),
        publicToken: randomBytes(18).toString('base64url'),
        createdAt,
        items: { create: items },
      },
    });
  }

  return { products: products.length, orders: orders.length, testimonials: testimonials.length };
}
