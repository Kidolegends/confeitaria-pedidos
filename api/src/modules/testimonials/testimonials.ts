import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';

// Módulo pequeno: schema, regras e rotas no mesmo arquivo.

const testimonialSchema = z.object({
  customerName: z.string().trim().min(2, 'Informe o nome').max(60),
  text: z.string().trim().min(10, 'Depoimento muito curto').max(400),
  rating: z.number().int().min(1).max(5).default(5),
  active: z.boolean().default(true),
});
const updateTestimonialSchema = z.object({
  customerName: testimonialSchema.shape.customerName.optional(),
  text: testimonialSchema.shape.text.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  active: z.boolean().optional(),
});

type IdParams = { id: string };

async function findOrFail(id: string) {
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) throw new AppError(404, 'Depoimento não encontrado');
  return testimonial;
}

// Pública: só os ativos aparecem no site
export const testimonialsRoutes = Router();

testimonialsRoutes.get('/', async (_req, res) => {
  res.json(
    await prisma.testimonial.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
  );
});

// Painel (montada em /api/admin/testimonials)
export const adminTestimonialsRoutes = Router();

adminTestimonialsRoutes.get('/', async (_req, res) => {
  res.json(await prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } }));
});

adminTestimonialsRoutes.post('/', async (req, res) => {
  const data = testimonialSchema.parse(req.body);
  res.status(201).json(await prisma.testimonial.create({ data }));
});

adminTestimonialsRoutes.put('/:id', async (req: Request<IdParams>, res) => {
  const data = updateTestimonialSchema.parse(req.body);
  await findOrFail(req.params.id);
  res.json(await prisma.testimonial.update({ where: { id: req.params.id }, data }));
});

adminTestimonialsRoutes.delete('/:id', async (req: Request<IdParams>, res) => {
  await findOrFail(req.params.id);
  await prisma.testimonial.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
