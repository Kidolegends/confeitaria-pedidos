import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega o arquivo .env (se existir). Variáveis já definidas não são sobrescritas.
dotenv.config({ quiet: true });

// Mensagens de validação padrão do Zod em português
z.config(z.locales.pt());
z.config({
  customError: (issue) => (issue.input === undefined ? 'Campo obrigatório' : undefined),
});

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');
const optionalString = z
  .string()
  .optional()
  .transform((value) => value || undefined);

// Validamos as variáveis de ambiente na inicialização: se faltar algo, a API nem sobe.
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3333),
    // Endereço público do site (usado nos links enviados pelo WhatsApp)
    PUBLIC_URL: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1),

    JWT_SECRET: z.string().min(8, 'JWT_SECRET precisa ter pelo menos 8 caracteres'),
    JWT_EXPIRES_IN: z.string().default('8h'),

    // Segurança HTTP
    CORS_ORIGIN: optionalString, // ex.: https://meusite.com.br (vazio = só o próprio domínio)
    TRUST_PROXY: z.coerce.number().int().min(0).default(0), // 1 atrás do proxy do Render/Railway
    RATE_LIMIT_ORDERS: z.coerce.number().int().min(1).default(10), // pedidos por IP a cada 15 min
    RATE_LIMIT_LOGIN: z.coerce.number().int().min(1).default(10), // tentativas de login a cada 15 min

    BUSINESS_UTC_OFFSET: z
      .string()
      .regex(/^[+-]\d{2}:\d{2}$/, 'Use o formato +HH:MM ou -HH:MM')
      .default('-03:00'),

    // Fotos dos produtos
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_UPLOAD_MB: z.coerce.number().positive().max(20).default(3),
    S3_BUCKET: optionalString,
    S3_REGION: z.string().default('auto'),
    S3_ENDPOINT: optionalString, // Cloudflare R2: https://<conta>.r2.cloudflarestorage.com
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_PUBLIC_URL: optionalString, // URL pública do bucket, ex.: https://fotos.meusite.com.br

    // Aviso automático de novo pedido para o WhatsApp da dona (desligado por padrão)
    NOTIFY_PROVIDER: z.enum(['none', 'log', 'whatsapp_cloud']).default('none'),
    WHATSAPP_CLOUD_TOKEN: optionalString,
    WHATSAPP_CLOUD_PHONE_NUMBER_ID: optionalString,
    WHATSAPP_CLOUD_API_VERSION: z.string().default('v21.0'),
    WHATSAPP_CLOUD_TEMPLATE: optionalString, // modelo aprovado na Meta (recomendado)
    WHATSAPP_CLOUD_TEMPLATE_LANG: z.string().default('pt_BR'),

    // Primeiro acesso: cria o admin automaticamente se o banco não tiver nenhum usuário
    ADMIN_EMAIL: optionalString,
    ADMIN_PASSWORD: optionalString,

    // Valores iniciais das configurações da loja (depois são editadas no painel)
    WHATSAPP_NUMBER: z
      .string()
      .regex(/^\d{12,13}$/, 'Use só dígitos com DDI e DDD, ex.: 5534999998888')
      .default('5534900000000'),
    SEED_ALLOW_PRODUCTION: bool.default(false),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    // Em produção, não aceitamos o segredo de exemplo nem um segredo curto
    if (env.JWT_SECRET.length < 32 || env.JWT_SECRET.startsWith('troque')) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'Em produção use um JWT_SECRET aleatório com 32+ caracteres',
      });
    }
    if (env.STORAGE_DRIVER === 's3' && !(env.S3_BUCKET && env.S3_PUBLIC_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_BUCKET'],
        message: 'STORAGE_DRIVER=s3 exige S3_BUCKET e S3_PUBLIC_URL',
      });
    }
    if (
      env.NOTIFY_PROVIDER === 'whatsapp_cloud' &&
      !(env.WHATSAPP_CLOUD_TOKEN && env.WHATSAPP_CLOUD_PHONE_NUMBER_ID)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['NOTIFY_PROVIDER'],
        message: 'whatsapp_cloud exige WHATSAPP_CLOUD_TOKEN e WHATSAPP_CLOUD_PHONE_NUMBER_ID',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues)
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const isPostgres = env.DATABASE_URL.startsWith('postgres');
