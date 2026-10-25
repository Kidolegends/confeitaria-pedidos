import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { app, createProducts, loginAsAdmin, resetDatabase } from './helpers';

// Menor PNG válido (1x1 pixel)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const uploadedFiles = () => {
  try {
    return readdirSync(join(__dirname, '.uploads', 'products'));
  } catch {
    return [];
  }
};

describe('Fotos dos produtos', () => {
  beforeEach(resetDatabase);

  it('envia, troca e remove a foto (arquivo antigo é apagado)', async () => {
    const { bolo } = await createProducts();
    const auth = await loginAsAdmin();
    const before = uploadedFiles().length;

    const first = await request(app)
      .post(`/api/admin/products/${bolo.id}/image`)
      .set(auth)
      .attach('image', PNG, { filename: 'bolo.png', contentType: 'image/png' });
    expect(first.status).toBe(200);
    expect(first.body.imageUrl).toMatch(/^\/uploads\/products\/.+\.png$/);

    // A foto fica acessível publicamente
    const file = await request(app).get(first.body.imageUrl);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');

    const second = await request(app)
      .post(`/api/admin/products/${bolo.id}/image`)
      .set(auth)
      .attach('image', PNG, { filename: 'bolo2.png', contentType: 'image/png' });
    expect(second.body.imageUrl).not.toBe(first.body.imageUrl);
    expect(uploadedFiles().length).toBe(before + 1);

    const removed = await request(app).delete(`/api/admin/products/${bolo.id}/image`).set(auth);
    expect(removed.body.imageUrl).toBeNull();
    expect(uploadedFiles().length).toBe(before);
  });

  it('recusa arquivo que não é imagem de verdade, mesmo com nome .png (415)', async () => {
    const { bolo } = await createProducts();
    const auth = await loginAsAdmin();
    const res = await request(app)
      .post(`/api/admin/products/${bolo.id}/image`)
      .set(auth)
      .attach('image', Buffer.from('<script>alert(1)</script>'), {
        filename: 'foto.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(415);
  });

  it('recusa tipo não permitido (415) e arquivo grande demais (413)', async () => {
    const { bolo } = await createProducts();
    const auth = await loginAsAdmin();

    const gif = await request(app)
      .post(`/api/admin/products/${bolo.id}/image`)
      .set(auth)
      .attach('image', Buffer.from('GIF89a'), { filename: 'a.gif', contentType: 'image/gif' });
    expect(gif.status).toBe(415);

    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024 + 10)]); // MAX_UPLOAD_MB=1 nos testes
    const tooLarge = await request(app)
      .post(`/api/admin/products/${bolo.id}/image`)
      .set(auth)
      .attach('image', big, { filename: 'grande.png', contentType: 'image/png' });
    expect(tooLarge.status).toBe(413);
  });

  it('aceita imagem real enviada como application/octet-stream (confere pela assinatura)', async () => {
    const { bolo } = await createProducts();
    const auth = await loginAsAdmin();
    const res = await request(app)
      .post(`/api/admin/products/${bolo.id}/image`)
      .set(auth)
      .attach('image', PNG, { filename: 'foto', contentType: 'application/octet-stream' });
    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toMatch(/\.png$/);
  });

  it('upload exige login', async () => {
    const { bolo } = await createProducts();
    const res = await request(app).post(`/api/admin/products/${bolo.id}/image`);
    expect(res.status).toBe(401);
  });
});

describe('Depoimentos', () => {
  beforeEach(resetDatabase);

  it('admin gerencia e o site mostra só os ativos', async () => {
    const auth = await loginAsAdmin();
    const created = await request(app)
      .post('/api/admin/testimonials')
      .set(auth)
      .send({ customerName: 'Camila', text: 'Bolo maravilhoso, recomendo demais!', rating: 5 });
    expect(created.status).toBe(201);

    expect((await request(app).get('/api/testimonials')).body).toHaveLength(1);

    await request(app)
      .put(`/api/admin/testimonials/${created.body.id}`)
      .set(auth)
      .send({ active: false });
    expect((await request(app).get('/api/testimonials')).body).toHaveLength(0);
    expect((await request(app).get('/api/admin/testimonials').set(auth)).body).toHaveLength(1);

    const removed = await request(app)
      .delete(`/api/admin/testimonials/${created.body.id}`)
      .set(auth);
    expect(removed.status).toBe(204);
  });

  it('valida nota de 1 a 5', async () => {
    const auth = await loginAsAdmin();
    const res = await request(app)
      .post('/api/admin/testimonials')
      .set(auth)
      .send({ customerName: 'Camila', text: 'Texto do depoimento aqui', rating: 7 });
    expect(res.status).toBe(400);
  });
});

describe('Configurações da loja', () => {
  beforeEach(resetDatabase);

  const validSettings = {
    storeName: 'Doce Encanto',
    whatsappNumber: '+55 (34) 99999-0000',
    address: 'Rua Nova, 50 - Centro',
    city: 'Uberaba - MG',
    openDays: [2, 3, 4, 5, 6],
    openingTime: '09:00',
    closingTime: '19:00',
    pickupEnabled: true,
    deliveryEnabled: false,
    deliveryFeeCents: 0,
    minDaysAhead: 2,
  };

  it('admin edita e o site já recebe os novos dados', async () => {
    const auth = await loginAsAdmin();
    const res = await request(app).put('/api/admin/settings').set(auth).send(validSettings);
    expect(res.status).toBe(200);
    expect(res.body.whatsappNumber).toBe('5534999990000');

    const store = await request(app).get('/api/store');
    expect(store.body).toMatchObject({
      storeName: 'Doce Encanto',
      openDays: [2, 3, 4, 5, 6],
      deliveryEnabled: false,
      minDaysAhead: 2,
    });
    expect(store.body.minDate).toBeTypeOf('string');
  });

  it('valida horário e opções de atendimento', async () => {
    const auth = await loginAsAdmin();
    const res = await request(app)
      .put('/api/admin/settings')
      .set(auth)
      .send({ ...validSettings, openingTime: '20:00', pickupEnabled: false });
    expect(res.status).toBe(400);
    expect(res.body.issues.map((i: { field: string }) => i.field)).toEqual([
      'closingTime',
      'pickupEnabled',
    ]);
  });

  it('exige login para editar', async () => {
    expect((await request(app).put('/api/admin/settings').send(validSettings)).status).toBe(401);
  });
});

describe('Senha do admin', () => {
  beforeEach(resetDatabase);

  it('troca a senha e o login passa a usar a nova', async () => {
    const auth = await loginAsAdmin();
    const wrong = await request(app)
      .patch('/api/auth/password')
      .set(auth)
      .send({ currentPassword: 'errada', newPassword: 'novaSenha123' });
    expect(wrong.status).toBe(422);

    const weak = await request(app)
      .patch('/api/auth/password')
      .set(auth)
      .send({ currentPassword: 'senha123', newPassword: 'curta' });
    expect(weak.status).toBe(400);

    const ok = await request(app)
      .patch('/api/auth/password')
      .set(auth)
      .send({ currentPassword: 'senha123', newPassword: 'novaSenha123' });
    expect(ok.status).toBe(204);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@teste.dev', password: 'novaSenha123' });
    expect(login.status).toBe(200);
  });

  it('limita tentativas de login (429)', async () => {
    const limitedApp = createApp({ loginRateLimit: 2 });
    const tryLogin = () =>
      request(limitedApp).post('/api/auth/login').send({ email: 'a@a.com', password: 'x' });
    await tryLogin();
    await tryLogin();
    expect((await tryLogin()).status).toBe(429);
  });
});

describe('Segurança HTTP', () => {
  it('envia cabeçalhos de segurança (helmet) e esconde o Express', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('não libera CORS para outros domínios por padrão', async () => {
    const res = await request(app).get('/api/products').set('Origin', 'https://site-malicioso.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
