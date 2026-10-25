import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createProducts, loginAsAdmin, resetDatabase } from './helpers';

describe('Produtos', () => {
  beforeEach(resetDatabase);

  it('cardápio público mostra só produtos ativos', async () => {
    await createProducts();
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual([
      'Bolo de Brigadeiro',
      'Brigadeiro',
    ]);
  });

  it('filtra o cardápio por categoria', async () => {
    await createProducts();
    const res = await request(app).get('/api/products?category=doces');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Brigadeiro');
  });

  it('painel lista também os inativos', async () => {
    await createProducts();
    const auth = await loginAsAdmin();
    const res = await request(app).get('/api/admin/products').set(auth);
    expect(res.body).toHaveLength(3);
  });

  it('admin cria, edita e exclui produto', async () => {
    const auth = await loginAsAdmin();

    const created = await request(app).post('/api/admin/products').set(auth).send({
      name: 'Torta de Limão',
      description: 'Creme de limão e merengue',
      category: 'tortas',
      priceCents: 7800,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ unit: 'unidade', active: true, featured: false });

    const updated = await request(app)
      .put(`/api/admin/products/${created.body.id}`)
      .set(auth)
      .send({ priceCents: 8200, featured: true });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      name: 'Torta de Limão',
      priceCents: 8200,
      featured: true,
    });

    const removed = await request(app).delete(`/api/admin/products/${created.body.id}`).set(auth);
    expect(removed.status).toBe(204);
    const missing = await request(app).get(`/api/admin/products/${created.body.id}`).set(auth);
    expect(missing.status).toBe(404);
  });

  it('valida categoria e preço', async () => {
    const auth = await loginAsAdmin();
    const res = await request(app).post('/api/admin/products').set(auth).send({
      name: 'Pizza',
      description: 'Não vendemos pizza',
      category: 'pizzas',
      priceCents: 0,
    });
    expect(res.status).toBe(400);
    expect(res.body.issues.map((i: { field: string }) => i.field)).toEqual([
      'category',
      'priceCents',
    ]);
  });

  it('cadastro de produto exige login', async () => {
    const res = await request(app).post('/api/admin/products').send({});
    expect(res.status).toBe(401);
  });
});
