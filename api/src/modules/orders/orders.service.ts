import { randomBytes } from 'node:crypto';
import type { Order, OrderItem } from '@prisma/client';
import { env, isPostgres } from '../../config/env';
import { AppError } from '../../lib/app-error';
import { formatBRL } from '../../lib/money';
import { notifyNewOrder } from '../../lib/notifier';
import { prisma } from '../../lib/prisma';
import { weekdayOf } from '../../lib/time';
import { getSettings, minScheduledDate, openDaysOf } from '../settings/settings.service';
import {
  FINAL_STATUSES,
  type CreateOrderInput,
  type ListOrdersQuery,
  type OrderStatus,
} from './orders.schemas';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  formatDateBR,
  formatPhone,
  orderCode,
} from './whatsapp';

const include = { items: true } as const;
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

type OrderWithItems = Order & { items: OrderItem[] };

/** Link da página de acompanhamento que o cliente recebe. */
export function trackingLink(order: Pick<Order, 'publicToken'>) {
  return `${env.PUBLIC_URL.replace(/\/$/, '')}/pedido/${order.publicToken}`;
}

/**
 * Cria a encomenda feita pelo site.
 * O preço vem SEMPRE do banco: o front-end só manda o id e a quantidade,
 * assim ninguém consegue mudar o valor pelo navegador.
 */
export async function createOrder(input: CreateOrderInput) {
  const settings = await getSettings();

  // Regras que dependem das configurações da loja (editáveis no painel)
  const minDate = minScheduledDate(settings);
  if (input.scheduledDate < minDate) {
    throw new AppError(
      422,
      `Encomendas precisam de ${settings.minDaysAhead} dia(s) de antecedência. Escolha a partir de ${formatDateBR(minDate)}`,
    );
  }
  if (!openDaysOf(settings).includes(weekdayOf(input.scheduledDate))) {
    throw new AppError(
      422,
      `Não abrimos na ${WEEKDAYS[weekdayOf(input.scheduledDate)]}. Escolha outro dia`,
    );
  }
  if (input.scheduledTime < settings.openingTime || input.scheduledTime > settings.closingTime) {
    throw new AppError(422, `Atendemos das ${settings.openingTime} às ${settings.closingTime}`);
  }
  if (input.fulfillment === 'entrega' && !settings.deliveryEnabled) {
    throw new AppError(422, 'No momento não estamos fazendo entregas, só retirada');
  }
  if (input.fulfillment === 'retirada' && !settings.pickupEnabled) {
    throw new AppError(422, 'No momento não estamos fazendo retirada, só entrega');
  }

  // Junta itens repetidos (ex.: o mesmo produto enviado duas vezes)
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...quantities.keys()] }, active: true },
  });
  if (products.length !== quantities.size) {
    throw new AppError(422, 'Algum produto do pedido não existe ou não está mais disponível');
  }

  const items = products.map((product) => {
    const quantity = quantities.get(product.id)!;
    return {
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity,
      subtotalCents: product.priceCents * quantity,
    };
  });
  const deliveryFeeCents = input.fulfillment === 'entrega' ? settings.deliveryFeeCents : 0;
  const totalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0) + deliveryFeeCents;

  const order = await prisma.order.create({
    data: {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      fulfillment: input.fulfillment,
      address: input.fulfillment === 'entrega' ? input.address : null,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      notes: input.notes || null,
      deliveryFeeCents,
      totalCents,
      // Token aleatório e difícil de adivinhar: só quem tem o link vê o pedido
      publicToken: randomBytes(18).toString('base64url'),
      items: { create: items },
    },
    include,
  });

  const link = trackingLink(order);
  const whatsappMessage = buildWhatsAppMessage(order, settings.storeName, link);

  // Aviso automático para a loja (não espera terminar e não derruba o pedido se falhar)
  void notifyNewOrder({
    to: settings.whatsappNumber,
    code: orderCode(order.id),
    customerName: order.customerName,
    when: `${formatDateBR(order.scheduledDate)} às ${order.scheduledTime}`,
    total: formatBRL(order.totalCents),
    link,
    fullText: whatsappMessage,
  });

  return {
    ...order,
    trackingUrl: link,
    whatsappMessage,
    whatsappUrl: buildWhatsAppUrl(settings.whatsappNumber, whatsappMessage),
  };
}

/** Visão pública do pedido (página de acompanhamento do cliente): sem telefone completo. */
export async function getPublicOrder(token: string) {
  const order = await prisma.order.findUnique({ where: { publicToken: token }, include });
  if (!order) throw new AppError(404, 'Pedido não encontrado');
  const settings = await getSettings();
  const message = buildWhatsAppMessage(order, settings.storeName, trackingLink(order));

  return {
    code: orderCode(order.id),
    status: order.status,
    customerName: order.customerName.split(' ')[0],
    phoneEnding: order.customerPhone.slice(-4),
    fulfillment: order.fulfillment,
    address: order.address,
    scheduledDate: order.scheduledDate,
    scheduledTime: order.scheduledTime,
    notes: order.notes,
    items: order.items.map(({ productName, quantity, unitPriceCents, subtotalCents }) => ({
      productName,
      quantity,
      unitPriceCents,
      subtotalCents,
    })),
    deliveryFeeCents: order.deliveryFeeCents,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    store: { name: settings.storeName, address: settings.address, city: settings.city },
    whatsappUrl: buildWhatsAppUrl(settings.whatsappNumber, message),
  };
}

export async function listOrders(query: ListOrdersQuery) {
  const digits = query.search?.replace(/\D/g, '');
  // No Postgres "contains" diferencia maiúsculas; no SQLite não. Ajustamos para os dois.
  const nameFilter = isPostgres
    ? { contains: query.search, mode: 'insensitive' as const }
    : { contains: query.search };

  const orders = await prisma.order.findMany({
    where: {
      status: query.status,
      scheduledDate: { gte: query.from, lte: query.to },
      ...(query.search && {
        OR: [
          { customerName: nameFilter },
          ...(digits ? [{ customerPhone: { contains: digits } }] : []),
        ],
      }),
    },
    include,
    orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    take: 500,
  });
  return orders.map(withLinks);
}

/** Acrescenta links úteis para o painel (página do cliente e WhatsApp do cliente). */
export function withLinks(order: OrderWithItems) {
  return {
    ...order,
    code: orderCode(order.id),
    phoneFormatted: formatPhone(order.customerPhone),
    trackingUrl: trackingLink(order),
    customerWhatsappUrl: `https://wa.me/55${order.customerPhone}`,
  };
}

async function findOrFail(id: number) {
  const order = await prisma.order.findUnique({ where: { id }, include });
  if (!order) throw new AppError(404, 'Pedido não encontrado');
  return order;
}

export async function getOrder(id: number) {
  return withLinks(await findOrFail(id));
}

export async function updateStatus(id: number, status: OrderStatus) {
  const order = await findOrFail(id);
  if (order.status !== status && FINAL_STATUSES.includes(order.status as OrderStatus)) {
    throw new AppError(422, `Pedido já está "${order.status}" e não pode mais mudar de status`);
  }
  return withLinks(await prisma.order.update({ where: { id }, data: { status }, include }));
}
