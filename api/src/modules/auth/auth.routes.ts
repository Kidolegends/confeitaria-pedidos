import { Router } from 'express';
import { env } from '../../config/env';
import { assertNotDemo } from '../../demo/demo';
import { currentUser, requireAdmin } from '../../middlewares/auth';
import { limitPerIp } from '../../middlewares/rate-limit';
import { changePasswordSchema, loginSchema } from './auth.schemas';
import * as authService from './auth.service';

export function createAuthRoutes(loginLimit = env.RATE_LIMIT_LOGIN) {
  const routes = Router();

  // Limite contra tentativa de adivinhar a senha (força bruta)
  const limiter = limitPerIp(loginLimit, 'Muitas tentativas de login. Tente de novo em 15 minutos');

  routes.post('/login', limiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    res.json(await authService.login(input));
  });

  routes.get('/me', requireAdmin, async (req, res) => {
    res.json(await authService.getProfile(currentUser(req).id));
  });

  routes.patch('/password', requireAdmin, async (req, res) => {
    assertNotDemo('trocar a senha nem o e-mail do painel');
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(currentUser(req).id, input);
    res.status(204).send();
  });

  return routes;
}
