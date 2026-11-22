import { Role } from '@prisma/client';
import { Router } from 'express';
import {
  getAdminAnalyticsHandler,
  listAdminTicketsHandler,
} from '../controllers/ticket.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(Role.ADMIN));

adminRouter.get('/tickets', listAdminTicketsHandler);
adminRouter.get('/analytics', getAdminAnalyticsHandler);
