import { rateLimit } from 'express-rate-limit';

/** Limita quantas requisições o mesmo IP faz numa janela de 15 minutos. */
export function limitPerIp(limit: number, message: string) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
  });
}
