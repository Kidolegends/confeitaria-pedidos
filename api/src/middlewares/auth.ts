import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';

export interface AuthUser {
  id: string;
  role: string;
}

// Adiciona o campo `user` no tipo Request do Express
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: string;
}

/**
 * Protege as rotas do painel: exige "Authorization: Bearer <token>" de um usuário admin.
 * Todas as rotas em /api/admin passam por aqui.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Faça login para acessar o painel');
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
  } catch {
    throw new AppError(401, 'Sessão inválida ou expirada. Faça login novamente');
  }

  if (payload.role !== 'admin') {
    throw new AppError(403, 'Você não tem permissão para acessar o painel');
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}

/** Retorna o usuário logado (só chame em rotas protegidas por `requireAdmin`). */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError(401, 'Não autenticado');
  return req.user;
}
