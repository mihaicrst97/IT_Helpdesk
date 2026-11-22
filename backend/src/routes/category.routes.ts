import { Router } from 'express';
import { listCategoriesHandler } from '../controllers/category.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const categoryRouter = Router();

categoryRouter.get('/', requireAuth, listCategoriesHandler);
