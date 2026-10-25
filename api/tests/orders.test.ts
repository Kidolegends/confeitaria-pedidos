import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { app, createProducts, inDays, loginAsAdmin, orderBody, resetDatabase } from './helpers';

describe('Pedidos pelo site', () => {
  beforeEach(resetDatabase);

  it('cria o pedido calculando o total com os preços do banco', async () => {
    const { bolo, brigadeiro } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(
        orderBody([
          { productId: bolo.id, quantity: 2 },
          { productId: brigadeiro.id, quantity: 1 },
        ]),
      );

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('novo');
    expect(res.body.customerPhone).toBe('34999998888'); // guarda só os dígitos
    expect(res.body.totalCents).toBe(2 * 9500 + 18000);
    expect(res.body.items).toHaveLength(2);
  });

  it('devolve o link do WhatsApp com o pedido formatado', async () => {
    const { bolo } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(orderBody([{ productId: bolo.id, quantity: 1 }]));

    expect(res.body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/5534900000000\?text=/);
    const text = decodeURIComponent(res.body.whatsappUrl.split('?text=')[1]);
    expect(text).toContain('1x Bolo de Brigadeiro');
    expect(text).toContain('R$ 95,00');
    expect(text).toContain('(34) 99999-8888');
  });

  it('ignora preço enviado pelo navegador', async () => {
    const { bolo } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(orderBody([{ productId: bolo.id, quantity: 1, priceCents: 1 } as never]));
    expect(res.body.totalCents).toBe(9500);
  });

  it('junta itens repetidos do mesmo produto', async () => {
    const { bolo } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(
        orderBody([
          { productId: bolo.id, quantity: 1 },
          { productId: bolo.id, quantity: 2 },
        ]),
      );
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
  });

  it('recusa produto inativo ou inexistente (422)', async () => {
    const { inativo } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(orderBody([{ productId: inativo.id, quantity: 1 }]));
    expect(res.status).toBe(422);
  });

  it('exige antecedência mínima de 1 dia (422)', async () => {
    const { bolo } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(orderBody([{ productId: bolo.id, quantity: 1 }], { scheduledDate: inDays(0) }));
    expect(res.status).toBe(422);
    expect(res.body.message).toContain('antecedência');
  });

  it('soma a taxa de entrega das configurações', async () => {
    const { bolo } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(
        orderBody([{ productId: bolo.id, quantity: 1 }], {
          fulfillment: 'entrega',
          address: 'Rua Artur Machado, 150 - Centro',
        }),
      );
    expect(res.status).toBe(201);
    expect(res.body.deliveryFeeCents).toBe(1000);
    expect(res.body.totalCents).toBe(9500 + 1000);
  });

  it('respeita dias, horário e opções de entrega das configurações (422)', async () => {
    const { bolo } = await createProducts();
    const date = inDays(2);
    await prisma.storeSettings.update({
      where: { id: 1 },
      data: {
        openDays: [0, 1, 2, 3, 4, 5, 6]
          .filter((d) => d !== new Date(`${date}T00:00:00Z`).getUTCDay())
          .join(','),
        deliveryEnabled: false,
      },
    });
    const items = [{ productId: bolo.id, quantity: 1 }];

    const closedDay = await request(app)
      .post('/api/orders')
      .send(orderBody(items, { scheduledDate: date }));
    expect(closedDay.status).toBe(422);
    expect(closedDay.body.message).toContain('Não abrimos');

    const lateHour = await request(app)
      .post('/api/orders')
      .send(orderBody(items, { scheduledDate: inDays(3), scheduledTime: '21:00' }));
    expect(lateHour.status).toBe(422);

    const delivery = await request(app)
      .post('/api/orders')
      .send(
        orderBody(items, {
          scheduledDate: inDays(3),
          fulfillment: 'entrega',
          address: 'Rua A, 100 - Centro',
        }),
      );
    expect(delivery.status).toBe(422);
    expect(delivery.body.message).toContain('entregas');
  });

  it('cliente acompanha o pedido pelo link público, sem dados sensíveis', async () => {
    const { bolo } = await createProducts();
    const created = await request(app)
      .post('/api/orders')
      .send(orderBody([{ productId: bolo.id, quantity: 2 }]));
    expect(created.body.trackingUrl).toBe(
      `https://doceencanto.test/pedido/${created.body.publicToken}`,
    );

    const res = await request(app).get(`/api/orders/${created.body.publicToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'novo', customerName: 'Maria', phoneEnding: '8888' });
    expect(res.body.customerPhone).toBeUndefined();
    expect(res.body.items[0].productId).toBeUndefined();

    expect((await request(app).get('/api/orders/token-que-nao-existe')).status).toBe(404);
  });

  it('exige endereço quando é entrega', async () => {
    const { bolo } = await createProducts();
    const res = await request(app)
      .post('/api/orders')
      .send(orderBody([{ productId: bolo.id, quantity: 1 }], { fulfillment: 'entrega' }));
    expect(res.status).toBe(400);
    expect(res.body.issues[0].field).toBe('address');
  });

  it('valida telefone, formato do horário e itens', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(orderBody([], { customerPhone: '123', scheduledTime: '25:00' }));
    expect(res.status).toBe(400);
    expect(res.body.issues.map((i: { field: string }) => i.field)).toEqual([
      'customerPhone',
      'scheduledTime',
      'items',
    ]);
  });
});

describe('Pedidos no painel', () => {
  beforeEach(resetDatabase);

  async function seedOrders() {
    const { bolo } = await createProducts();
    const make = (name: string, date: string) =>
      request(app)
        .post('/api/orders')
        .send(
          orderBody([{ productId: bolo.id, quantity: 1 }], {
            customerName: name,
            scheduledDate: date,
          }),
        );
    const a = (await make('Ana', inDays(2))).body;
    const b = (await make('Bruno', inDays(5))).body;
    return { a, b };
  }

  it('lista pedidos e filtra por status, data e busca', async () => {
    const { a } = await seedOrders();
    const auth = await loginAsAdmin();
    await request(app)
      .patch(`/api/admin/orders/${a.id}/status`)
      .set(auth)
      .send({ status: 'confirmado' });

    const all = await request(app).get('/api/admin/orders').set(auth);
    expect(all.body.map((o: { customerName: string }) => o.customerName)).toEqual(['Ana', 'Bruno']);

    const novos = await request(app).get('/api/admin/orders?status=novo').set(auth);
    expect(novos.body.map((o: { customerName: string }) => o.customerName)).toEqual(['Bruno']);

    const ate3dias = await request(app)
      .get(`/api/admin/orders?to=${inDays(3)}`)
      .set(auth);
    expect(ate3dias.body).toHaveLength(1);

    const busca = await request(app).get('/api/admin/orders?search=brun').set(auth);
    expect(busca.body).toHaveLength(1);

    const porTelefone = await request(app).get('/api/admin/orders?search=99999-88').set(auth);
    expect(porTelefone.body).toHaveLength(2);
  });

  it('muda o status do pedido', async () => {
    const { a } = await seedOrders();
    const auth = await loginAsAdmin();
    const res = await request(app)
      .patch(`/api/admin/orders/${a.id}/status`)
      .set(auth)
      .send({ status: 'em_producao' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('em_producao');
  });

  it('pedido entregue ou cancelado não muda mais (422)', async () => {
    const { a } = await seedOrders();
    const auth = await loginAsAdmin();
    await request(app)
      .patch(`/api/admin/orders/${a.id}/status`)
      .set(auth)
      .send({ status: 'cancelado' });
    const res = await request(app)
      .patch(`/api/admin/orders/${a.id}/status`)
      .set(auth)
      .send({ status: 'confirmado' });
    expect(res.status).toBe(422);
  });

  it('recusa status inválido (400) e pedido inexistente (404)', async () => {
    const { a } = await seedOrders();
    const auth = await loginAsAdmin();
    const invalid = await request(app)
      .patch(`/api/admin/orders/${a.id}/status`)
      .set(auth)
      .send({ status: 'perdido' });
    expect(invalid.status).toBe(400);
    expect((await request(app).get('/api/admin/orders/9999').set(auth)).status).toBe(404);
  });

  it('pedido antigo continua com nome e preço mesmo se o produto for excluído', async () => {
    const { a } = await seedOrders();
    const auth = await loginAsAdmin();
    const productId = a.items[0].productId;
    await request(app).delete(`/api/admin/products/${productId}`).set(auth);

    const res = await request(app).get(`/api/admin/orders/${a.id}`).set(auth);
    expect(res.body.items[0]).toMatchObject({ productId: null, productName: 'Bolo de Brigadeiro' });
    expect(await prisma.orderItem.count()).toBe(2);
  });
});

describe('Proteção contra spam', () => {
  beforeEach(resetDatabase);

  it('limita pedidos por IP (429)', async () => {
    const limitedApp = createApp({ orderRateLimit: 2 });
    const send = () => request(limitedApp).post('/api/orders').send({});
    expect((await send()).status).toBe(400);
    expect((await send()).status).toBe(400);
    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toContain('Muitos pedidos');
  });
});
