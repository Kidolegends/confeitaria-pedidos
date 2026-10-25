import type { Category, OrderStatus } from './types';

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "2026-10-28" → "28/10/2026" */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/** "2026-10-28" → "qua, 28/10" */
export function formatShortDate(date: string): string {
  const weekday = WEEKDAYS_SHORT[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const [, month, day] = date.split('-');
  return `${weekday}, ${day}/${month}`;
}

/** Soma dias numa data "AAAA-MM-DD" */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Segunda-feira da semana da data */
export function startOfWeek(date: string): string {
  const weekday = weekdayOf(date);
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

/** Formata enquanto digita: 34999998888 → (34) 99999-8888 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const CATEGORY_LABELS: Record<Category, string> = {
  bolos: 'Bolos',
  tortas: 'Tortas',
  doces: 'Doces',
  salgados: 'Salgados',
  kits: 'Kits e cestas',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  novo: 'bg-sky-100 text-sky-800 ring-sky-200',
  confirmado: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  em_producao: 'bg-amber-100 text-amber-800 ring-amber-200',
  pronto: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  entregue: 'bg-stone-200 text-stone-700 ring-stone-300',
  cancelado: 'bg-red-100 text-red-700 ring-red-200',
};

export const ORDER_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

/** Abre o pedido com a mensagem de status para o cliente no WhatsApp */
export function customerStatusMessage(
  code: string,
  status: OrderStatus,
  storeName: string,
): string {
  const messages: Record<OrderStatus, string> = {
    novo: `recebemos seu pedido ${code}! Em breve confirmamos com você.`,
    confirmado: `seu pedido ${code} está confirmado! 🎉`,
    em_producao: `seu pedido ${code} já está em produção! 👩‍🍳`,
    pronto: `seu pedido ${code} está pronto! 🧁`,
    entregue: `seu pedido ${code} foi entregue. Obrigado pela preferência! 💕`,
    cancelado: `seu pedido ${code} foi cancelado. Qualquer dúvida, é só chamar.`,
  };
  return `Olá! Aqui é da ${storeName}: ${messages[status]}`;
}
