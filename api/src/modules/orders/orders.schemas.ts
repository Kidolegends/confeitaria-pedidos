import { z } from 'zod';
import { isValidDate } from '../../lib/time';

export const ORDER_STATUSES = [
  'novo',
  'confirmado',
  'em_producao',
  'pronto',
  'entregue',
  'cancelado',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Depois de entregue ou cancelado, o pedido não muda mais de status. */
export const FINAL_STATUSES: OrderStatus[] = ['entregue', 'cancelado'];

const dateSchema = z.string().refine(isValidDate, 'Data inválida (use AAAA-MM-DD)');

export const createOrderSchema = z
  .object({
    customerName: z.string().trim().min(2, 'Informe seu nome').max(80),
    // Aceita "(34) 99999-8888" e guarda só os dígitos
    customerPhone: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .refine((digits) => digits.length === 10 || digits.length === 11, {
        message: 'Telefone inválido. Use DDD + número',
      }),
    fulfillment: z.enum(['retirada', 'entrega'], {
      error: 'Escolha retirada ou entrega',
    }),
    address: z.string().trim().max(200).optional(),
    scheduledDate: dateSchema,
    // Horário de funcionamento e dias abertos são conferidos no service (vêm das configurações)
    scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:MM)'),
    notes: z.string().trim().max(500).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().min(1, 'Quantidade mínima é 1').max(500),
        }),
      )
      .min(1, 'Escolha pelo menos um produto')
      .max(30),
  })
  .refine((order) => order.fulfillment !== 'entrega' || (order.address?.length ?? 0) >= 8, {
    message: 'Informe o endereço de entrega',
    path: ['address'],
  });

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  from: dateSchema.optional(), // data de entrega/retirada inicial
  to: dateSchema.optional(), // data de entrega/retirada final
  search: z.string().trim().max(80).optional(), // nome ou telefone do cliente
});

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, {
    error: `Status deve ser: ${ORDER_STATUSES.join(', ')}`,
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
