import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, loginAsAdmin, resetDatabase } from './helpers';

describe('Auth', () => {
  beforeEach(resetDatabase);

  it('faz login e devolve token, sem expor a senha', async () => {
    const auth = await loginAsAdmin();
    const res = await request(app).get('/api/auth/me').set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'admin@teste.dev', role: 'admin' });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('recusa senha errada com 401', async () => {
    await loginAsAdmin();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@teste.dev', password: 'errada' });
    expect(res.status).toBe(401);
  });

  it('valida o corpo do login com Zod (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.issues.map((i: { field: string }) => i.field)).toEqual(['email', 'password']);
  });

  it('rotas do painel exigem token válido', async () => {
    expect((await request(app).get('/api/admin/orders')).status).toBe(401);
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', 'Bearer token-falso');
    expect(res.status).toBe(401);
  });
});
