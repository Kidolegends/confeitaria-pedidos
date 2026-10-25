import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';

// Último middleware: transforma qualquer erro em uma resposta JSON padronizada.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Dados inválidos',
      issues: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Erros do upload de arquivos (multer)
  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      message: tooLarge
        ? `A foto deve ter no máximo ${env.MAX_UPLOAD_MB} MB`
        : 'Envio de arquivo inválido',
    });
    return;
  }

  // JSON mal formado no corpo da requisição
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'JSON inválido no corpo da requisição' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ message: 'Requisição muito grande' });
    return;
  }

  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor' });
};
