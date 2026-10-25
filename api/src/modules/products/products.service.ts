import { randomUUID } from 'node:crypto';
import type { Product } from '@prisma/client';
import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import { detectImageType, storage } from '../../lib/storage';
import type { CreateProductInput, UpdateProductInput } from './products.schemas';

const orderBy = [{ category: 'asc' as const }, { name: 'asc' as const }];

/** Acrescenta a URL pública da foto (o banco guarda só a "chave" do arquivo). */
export function toProductView(product: Product) {
  return { ...product, imageUrl: product.imageKey ? storage.publicUrl(product.imageKey) : null };
}

/** Cardápio público: só produtos ativos. */
export async function listActiveProducts(category?: string) {
  const products = await prisma.product.findMany({ where: { active: true, category }, orderBy });
  return products.map(toProductView);
}

/** Lista do painel: inclui inativos. */
export async function listAllProducts() {
  return (await prisma.product.findMany({ orderBy })).map(toProductView);
}

async function findOrFail(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, 'Produto não encontrado');
  return product;
}

export async function getProduct(id: string) {
  return toProductView(await findOrFail(id));
}

export async function createProduct(input: CreateProductInput) {
  return toProductView(await prisma.product.create({ data: input }));
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await findOrFail(id);
  return toProductView(await prisma.product.update({ where: { id }, data: input }));
}

/**
 * Exclui o produto e a foto. Pedidos antigos não quebram: cada item do pedido guarda
 * o nome e o preço da época (e o productId vira null).
 */
export async function deleteProduct(id: string) {
  const product = await findOrFail(id);
  await prisma.product.delete({ where: { id } });
  if (product.imageKey) await storage.remove(product.imageKey).catch(() => undefined);
}

/** Salva (ou troca) a foto do produto, validando o tipo real do arquivo. */
export async function setProductImage(id: string, file?: Express.Multer.File) {
  if (!file) throw new AppError(400, 'Envie a foto no campo "image"');
  const product = await findOrFail(id);

  const type = detectImageType(file.buffer);
  if (!type) throw new AppError(415, 'Formato não suportado. Envie JPG, PNG ou WEBP');

  // Nome aleatório: evita cache de foto antiga e não expõe o nome do arquivo original
  const key = `products/${product.id}-${randomUUID()}.${type.ext}`;
  await storage.save(key, file.buffer, type.type);

  const updated = await prisma.product.update({ where: { id }, data: { imageKey: key } });
  if (product.imageKey) await storage.remove(product.imageKey).catch(() => undefined);
  return toProductView(updated);
}

export async function removeProductImage(id: string) {
  const product = await findOrFail(id);
  if (product.imageKey) await storage.remove(product.imageKey).catch(() => undefined);
  return toProductView(await prisma.product.update({ where: { id }, data: { imageKey: null } }));
}
