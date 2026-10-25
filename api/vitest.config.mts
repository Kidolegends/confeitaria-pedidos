import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Prepara um banco SQLite separado só para os testes
    globalSetup: './tests/global-setup.ts',
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'file:./test.db',
      JWT_SECRET: 'segredo-de-teste',
      BUSINESS_UTC_OFFSET: '-03:00',
      WHATSAPP_NUMBER: '5534900000000',
      PUBLIC_URL: 'https://doceencanto.test',
      UPLOAD_DIR: './tests/.uploads',
      MAX_UPLOAD_MB: '1',
      RATE_LIMIT_ORDERS: '1000',
      RATE_LIMIT_LOGIN: '1000',
      NOTIFY_PROVIDER: 'none',
    },
    // Os testes de integração usam o mesmo banco, então rodam um arquivo por vez
    fileParallelism: false,
  },
});
