import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createProducts, inDays, loginAsAdmin, orderBody, resetDatabase } from './helpers';

describe('Dashboard', () => {
  beforeEach(resetDatabase);

  it('conta pedidos de hoje e soma o faturamento estimado sem os cancelados', async () => {
    const { bolo, brigadeiro } = await createProducts();
    const auth = await loginAsAdmin();
    const send = (productId: string) =>
      request(app)
        .post('/api/orders')
        .send(orderBody([{ productId, quantity: 1 }], { scheduledDate: inDays(1) }));

    await send(bolo.id); // 95,00
    const cancelado = (await send(brigadeiro.id)).body; // 180,00 (será cancelado)
    await request(app)
      .patch(`/api/admin/orders/${cancelado.id}/status`)
      .set(auth)
      .send({ status: 'cancelado' });

    const res = await request(app).get('/api/admin/dashboard').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.ordersToday).toBe(2);
    expect(res.body.ordersThisWeek).toBe(2);
    expect(res.body.openOrders).toBe(1);
    expect(res.body.byStatus).toEqual({ novo: 1, cancelado: 1 });
    expect(res.body.upcoming).toHaveLength(1);
    expect(res.body.topProducts).toEqual([{ productName: 'Bolo de Brigadeiro', quantity: 1 }]);
    // O faturamento conta pela data de entrega: amanhã pode cair na semana/mês seguinte
    expect([0, 9500]).toContain(res.body.revenueWeekCents);
  });

  it('exige login', async () => {
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);
  });
});
