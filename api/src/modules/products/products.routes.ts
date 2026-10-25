import { Router, type Request } from 'express';
import multer from 'multer';
import { env } from '../../config/env';
import { AppError } from '../../lib/app-error';
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from './products.schemas';
import * as productsService from './products.service';

type IdParams = { id: string };

// Upload em memória (no máximo MAX_UPLOAD_MB). O service confere o conteúdo e grava.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  // Barra cedo o que claramente não é imagem. Alguns clientes mandam "application/octet-stream";
  // nesses casos quem decide é a assinatura do arquivo (detectImageType, no service).
  fileFilter: (_req, file, callback) => {
    if (
      /^image\/(jpeg|png|webp)$/.test(file.mimetype) ||
      file.mimetype === 'application/octet-stream'
    )
      callback(null, true);
    else callback(new AppError(415, 'Formato não suportado. Envie JPG, PNG ou WEBP'));
  },
});

// Rotas públicas: o site mostra o cardápio
export const productsRoutes = Router();

productsRoutes.get('/', async (req, res) => {
  const { category } = listProductsQuerySchema.parse(req.query);
  res.json(await productsService.listActiveProducts(category));
});

// Rotas do painel (montadas em /api/admin/products, já protegidas por requireAdmin)
export const adminProductsRoutes = Router();

adminProductsRoutes.get('/', async (_req, res) => {
  res.json(await productsService.listAllProducts());
});

adminProductsRoutes.get('/:id', async (req: Request<IdParams>, res) => {
  res.json(await productsService.getProduct(req.params.id));
});

adminProductsRoutes.post('/', async (req, res) => {
  const input = createProductSchema.parse(req.body);
  res.status(201).json(await productsService.createProduct(input));
});

adminProductsRoutes.put('/:id', async (req: Request<IdParams>, res) => {
  const input = updateProductSchema.parse(req.body);
  res.json(await productsService.updateProduct(req.params.id, input));
});

adminProductsRoutes.delete('/:id', async (req: Request<IdParams>, res) => {
  await productsService.deleteProduct(req.params.id);
  res.status(204).send();
});

// Foto do produto: multipart/form-data com o campo "image"
adminProductsRoutes.post(
  '/:id/image',
  upload.single('image'),
  async (req: Request<IdParams>, res) => {
    res.json(await productsService.setProductImage(req.params.id, req.file));
  },
);

adminProductsRoutes.delete('/:id/image', async (req: Request<IdParams>, res) => {
  res.json(await productsService.removeProductImage(req.params.id));
});
