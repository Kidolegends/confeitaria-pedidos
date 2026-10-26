import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openApiDocument } from './docs/openapi';
import { AppError } from './lib/app-error';
import { BUNDLED_IMAGE_PREFIX, SEED_IMAGES_DIR, uploadDir } from './lib/storage';
import { requireAdmin } from './middlewares/auth';
import { errorHandler } from './middlewares/error-handler';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { adminOrdersRoutes, createOrdersRoutes } from './modules/orders/orders.routes';
import { adminProductsRoutes, productsRoutes } from './modules/products/products.routes';
import { adminSettingsRoutes, storeRoutes } from './modules/settings/settings.routes';
import { adminTestimonialsRoutes, testimonialsRoutes } from './modules/testimonials/testimonials';

// Pasta do front-end compilado (npm run build). Em produção a API também serve o site.
const WEB_DIST = join(__dirname, '..', '..', 'web', 'dist');

export interface AppOptions {
  orderRateLimit?: number;
  loginRateLimit?: number;
}

// Monta o app sem chamar listen(): assim os testes usam o app direto, sem subir servidor.
export function createApp(options: AppOptions = {}) {
  const app = express();

  // Atrás do proxy do Render/Railway: necessário para o rate limit ver o IP real do cliente
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  // Cabeçalhos de segurança (CSP, anti-clickjacking, etc.)
  const imageSources = ["'self'", 'data:', 'blob:'];
  if (env.S3_PUBLIC_URL) imageSources.push(env.S3_PUBLIC_URL);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': imageSources,
          // Em localhost (http) não forçamos https
          'upgrade-insecure-requests': env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // CORS só é necessário se o site ficar num domínio diferente da API
  if (env.CORS_ORIGIN) {
    app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }));
  }

  app.use(express.json({ limit: '100kb' }));

  const api = Router();

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Rotas públicas (site)
  api.use('/store', storeRoutes);
  api.use('/products', productsRoutes);
  api.use('/testimonials', testimonialsRoutes);
  api.use('/orders', createOrdersRoutes(options.orderRateLimit));
  api.use('/auth', createAuthRoutes(options.loginRateLimit));

  // Rotas do painel: tudo em /api/admin exige login de admin
  const admin = Router();
  admin.use(requireAdmin);
  admin.use('/dashboard', dashboardRoutes);
  admin.use('/orders', adminOrdersRoutes);
  admin.use('/products', adminProductsRoutes);
  admin.use('/testimonials', adminTestimonialsRoutes);
  admin.use('/settings', adminSettingsRoutes);
  api.use('/admin', admin);

  // Nenhuma rota da API respondeu: 404 em JSON
  api.use(() => {
    throw new AppError(404, 'Rota não encontrada');
  });

  app.get('/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use('/api', api);

  // Fotos de exemplo que vêm junto com o código (modo demonstração): /uploads/seed/...
  app.use(`/uploads/${BUNDLED_IMAGE_PREFIX}`, express.static(SEED_IMAGES_DIR, { maxAge: '1d' }));

  // Fotos dos produtos guardadas no disco (STORAGE_DRIVER=local)
  if (env.STORAGE_DRIVER === 'local') {
    app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));
  }

  // Produção: entrega o site React. Qualquer outra rota (ex.: /admin/pedidos) devolve o
  // index.html e o React Router decide a tela.
  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/uploads/')) return next();
      res.sendFile(join(WEB_DIST, 'index.html'));
    });
  }

  app.use(() => {
    throw new AppError(404, 'Rota não encontrada');
  });

  app.use(errorHandler);
  return app;
}
