import { PrismaClient } from '@prisma/client';

// Uma única instância do Prisma para a aplicação inteira.
export const prisma = new PrismaClient();
