import { Router } from 'express';
import { updateSettingsSchema } from './settings.schemas';
import * as settingsService from './settings.service';

// Pública: o site lê nome, WhatsApp, horários e data mínima de encomenda
export const storeRoutes = Router();

storeRoutes.get('/', async (_req, res) => {
  res.json(await settingsService.getPublicStore());
});

// Painel (montada em /api/admin/settings, protegida por requireAdmin)
export const adminSettingsRoutes = Router();

adminSettingsRoutes.get('/', async (_req, res) => {
  res.json(settingsService.toSettingsView(await settingsService.getSettings()));
});

adminSettingsRoutes.put('/', async (req, res) => {
  const input = updateSettingsSchema.parse(req.body);
  res.json(await settingsService.updateSettings(input));
});
