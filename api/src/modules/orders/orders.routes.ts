import { Router, type Request } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { limitPerIp } from '../../middlewares/rate-limit';
import { createOrderSchema, listOrdersQuerySchema, updateStatusSchema } from './orders.schemas';
import * as ordersService from './orders.service';

type IdParams = { id: string };
type TokenParams = { token: string };
const idSchema = z.coerce.number().int().positive('Número do pedido inválido');

// Rotas públicas: o cliente faz a encomenda pelo site (sem login) e acompanha pelo link
export function createOrdersRoutes(orderLimit = env.RATE_LIMIT_ORDERS) {
  const routes = Router();

  // Limite por IP para evitar spam/robôs enchendo o painel de pedidos falsos
  const limiter = limitPerIp(
    orderLimit,
    'Muitos pedidos em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp',
  );

  routes.post('/', limiter, async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    res.status(201).json(await ordersService.createOrder(input));
  });

  routes.get('/:token', async (req: Request<TokenParams>, res) => {
    const token = z.string().min(10).max(64).parse(req.params.token);
    res.json(await ordersService.getPublicOrder(token));
  });

  return routes;
}

// Rotas do painel (montadas em /api/admin/orders, já protegidas por requireAdmin)
export const adminOrdersRoutes = Router();

adminOrdersRoutes.get('/', async (req, res) => {
  const query = listOrdersQuerySchema.parse(req.query);
  res.json(await ordersService.listOrders(query));
});

adminOrdersRoutes.get('/:id', async (req: Request<IdParams>, res) => {
  res.json(await ordersService.getOrder(idSchema.parse(req.params.id)));
});

adminOrdersRoutes.patch('/:id/status', async (req: Request<IdParams>, res) => {
  const { status } = updateStatusSchema.parse(req.body);
  res.json(await ordersService.updateStatus(idSchema.parse(req.params.id), status));
});
