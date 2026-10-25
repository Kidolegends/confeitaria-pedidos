import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import type { ChangePasswordInput, LoginInput } from './auth.schemas';

const SALT_ROUNDS = 10;

// Nunca devolvemos o hash da senha para quem chamou a API
type PublicUser = { id: string; name: string; email: string; role: string };

function toPublicUser(user: PublicUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function signToken(userId: string, role: string): string {
  const options = { subject: userId, expiresIn: env.JWT_EXPIRES_IN } as SignOptions;
  return jwt.sign({ role }, env.JWT_SECRET, options);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Mesma mensagem para e-mail ou senha errados: não revelamos quais e-mails existem
  const passwordOk = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !passwordOk) throw new AppError(401, 'E-mail ou senha incorretos');

  return { user: toPublicUser(user), token: signToken(user.id, user.role) };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Usuário não encontrado');
  return toPublicUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Usuário não encontrado');
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new AppError(422, 'Senha atual incorreta');
  }
  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/**
 * Primeiro deploy: se o banco não tem nenhum usuário e ADMIN_EMAIL/ADMIN_PASSWORD
 * estão no ambiente, cria o admin. Assim não é preciso rodar o seed em produção.
 */
export async function ensureAdminUser() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  if ((await prisma.user.count()) > 0) return;
  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, SALT_ROUNDS),
      role: 'admin',
    },
  });
  console.log(`Usuário admin criado: ${env.ADMIN_EMAIL}. Troque a senha no painel.`);
}
