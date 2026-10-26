import { existsSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env, parseEnv } from '../src/config/env';
import { resetDemoData } from '../src/demo/demo';
import { DEMO_ADMIN } from '../src/demo/seed-data';
import { prisma } from '../src/lib/prisma';
import { SEED_IMAGES_DIR } from '../src/lib/storage';
import { app, loginAsAdmin, resetDatabase } from './helpers';

const base = { DATABASE_URL: 'file:./x.db', NODE_ENV: 'production' };
const strongSecret = 'a'.repeat(40);

describe('Variáveis de ambiente (modo demonstração)', () => {
  it('fora da demonstração, produção continua recusando JWT_SECRET ausente ou fraco', () => {
    expect(parseEnv({ ...base }).result.success).toBe(false);
    expect(parseEnv({ ...base, JWT_SECRET: 'curto123' }).result.success).toBe(false);
    expect(parseEnv({ ...base, DEMO_MODE: 'false' }).result.success).toBe(false);
    expect(parseEnv({ ...base, JWT_SECRET: strongSecret }).result.success).toBe(true);
  });

  it('na demonstração gera um JWT_SECRET forte se nenhum for informado', () => {
    const { result, generatedJwtSecret } = parseEnv({ ...base, DEMO_MODE: 'true' });
    expect(result.success).toBe(true);
    expect(generatedJwtSecret).toBe(true);
    expect(result.data?.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(result.data?.DEMO_MODE).toBe(true);
  });

  it('demonstração exige fotos locais e usa o endereço do Render se não houver PUBLIC_URL', () => {
    const s3 = parseEnv({ ...base, DEMO_MODE: 'true', STORAGE_DRIVER: 's3' });
    expect(s3.result.success).toBe(false);

    const render = parseEnv({
      ...base,
      JWT_SECRET: strongSecret,
      RENDER_EXTERNAL_URL: 'https://doce-encanto.onrender.com',
    });
    expect(render.result.data?.PUBLIC_URL).toBe('https://doce-encanto.onrender.com');
  });
});

describe('Modo demonstração', () => {
  beforeEach(async () => {
    await resetDatabase();
    env.DEMO_MODE = true;
  });
  afterEach(() => {
    env.DEMO_MODE = false;
  });

  it('bloqueia a troca de senha do admin com mensagem amigável (403)', async () => {
    const auth = await loginAsAdmin();
    const res = await request(app)
      .patch('/api/auth/password')
      .set(auth)
      .send({ currentPassword: 'senha123', newPassword: 'outraSenha9' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/demonstração/);

    // A senha original continua valendo
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@teste.dev', password: 'senha123' });
    expect(login.status).toBe(200);
  });

  it('informa o login de teste no /api/store (e nada fora da demonstração)', async () => {
    const res = await request(app).get('/api/store');
    expect(res.body.demo).toMatchObject({
      adminEmail: DEMO_ADMIN.email,
      adminPassword: DEMO_ADMIN.password,
    });

    env.DEMO_MODE = false;
    expect((await request(app).get('/api/store')).body.demo).toBeNull();
  });

  it('recria a loja de exemplo com fotos servidas do código, sem apagá-las', async () => {
    await resetDemoData();

    const login = await request(app).post('/api/auth/login').send(DEMO_ADMIN);
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.token as string}` };

    expect(await prisma.order.count()).toBeGreaterThan(5);
    const products = (await request(app).get('/api/products')).body as {
      id: string;
      imageUrl: string | null;
    }[];
    const withPhoto = products.find((product) => product.imageUrl)!;
    expect(withPhoto.imageUrl).toMatch(/^\/uploads\/seed\/.+\.webp$/);

    const photo = await request(app).get(withPhoto.imageUrl!);
    expect(photo.status).toBe(200);
    expect(photo.headers['content-type']).toBe('image/webp');

    // Remover a foto do produto não apaga o arquivo de exemplo (outras sessões usam)
    const removed = await request(app)
      .delete(`/api/admin/products/${withPhoto.id}/image`)
      .set(auth);
    expect(removed.status).toBe(200);
    const file = join(SEED_IMAGES_DIR, withPhoto.imageUrl!.split('/').pop()!);
    expect(existsSync(file)).toBe(true);
  });
});
