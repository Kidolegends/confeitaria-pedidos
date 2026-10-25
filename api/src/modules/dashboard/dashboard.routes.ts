import { Router } from 'express';
import * as dashboardService from './dashboard.service';

// Montada em /api/admin/dashboard (protegida por requireAdmin)
export const dashboardRoutes = Router();

dashboardRoutes.get('/', async (_req, res) => {
  res.json(await dashboardService.getSummary());
});
