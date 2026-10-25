import { formatBRL } from '../../lib/money';

// Funções puras (sem banco): fáceis de testar.

export interface WhatsAppOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  fulfillment: string;
  address: string | null;
  scheduledDate: string;
  scheduledTime: string;
  notes: string | null;
  deliveryFeeCents: number;
  totalCents: number;
  items: { productName: string; quantity: number; unitPriceCents: number; subtotalCents: number }[];
}

/** 34999998888 → "(34) 99999-8888" */
export function formatPhone(digits: string): string {
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  const split = number.length - 4;
  return `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`;
}

/** "2026-10-28" → "28/10/2026" */
export function formatDateBR(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function orderCode(id: number): string {
  return `#${id.toString().padStart(4, '0')}`;
}

/** Texto do pedido, já formatado para o WhatsApp (*negrito* funciona lá). */
export function buildWhatsAppMessage(
  order: WhatsAppOrder,
  storeName: string,
  link?: string,
): string {
  const lines = [
    `*Pedido ${orderCode(order.id)} - ${storeName}*`,
    '',
    `*Cliente:* ${order.customerName}`,
    `*Telefone:* ${formatPhone(order.customerPhone)}`,
    '',
    '*Itens:*',
    ...order.items.map(
      (item) =>
        `• ${item.quantity}x ${item.productName} (${formatBRL(item.unitPriceCents)}) = ${formatBRL(item.subtotalCents)}`,
    ),
  ];
  if (order.deliveryFeeCents > 0)
    lines.push(`• Taxa de entrega = ${formatBRL(order.deliveryFeeCents)}`);
  lines.push(
    '',
    `*Total:* ${formatBRL(order.totalCents)}`,
    `*${order.fulfillment === 'entrega' ? 'Entrega' : 'Retirada'}:* ${formatDateBR(order.scheduledDate)} às ${order.scheduledTime}`,
  );
  if (order.fulfillment === 'entrega' && order.address) lines.push(`*Endereço:* ${order.address}`);
  if (order.notes) lines.push(`*Observações:* ${order.notes}`);
  if (link) lines.push('', `Acompanhe o pedido: ${link}`);
  return lines.join('\n');
}

/** Link wa.me que abre a conversa com a mensagem pronta. */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}
