import { z } from 'zod';

export const PRODUCT_CATEGORIES = ['bolos', 'tortas', 'doces', 'salgados', 'kits'] as const;

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(80),
  description: z.string().trim().min(5, 'Descreva o produto').max(300),
  category: z.enum(PRODUCT_CATEGORIES, {
    error: `Categoria deve ser: ${PRODUCT_CATEGORIES.join(', ')}`,
  }),
  priceCents: z.number().int().min(1, 'Preço deve ser maior que zero'),
  unit: z.string().trim().min(1).max(30).default('unidade'),
  emoji: z.string().trim().min(1).max(8).default('🧁'),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});

// Na edição, todos os campos são opcionais (sem os valores padrão)
export const updateProductSchema = z.object({
  name: createProductSchema.shape.name.optional(),
  description: createProductSchema.shape.description.optional(),
  category: createProductSchema.shape.category.optional(),
  priceCents: createProductSchema.shape.priceCents.optional(),
  unit: z.string().trim().min(1).max(30).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
