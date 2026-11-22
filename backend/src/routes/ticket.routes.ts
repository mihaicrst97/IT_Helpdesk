import { Role } from '@prisma/client';
import { Router } from 'express';
import {
  addTicketCommentHandler,
  createTicketHandler,
  getTicketByIdHandler,
  listUserTicketsHandler,
  updateTicketStatusHandler,
} from '../controllers/ticket.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const ticketRouter = Router();

ticketRouter.use(requireAuth);

ticketRouter.post('/', createTicketHandler);
ticketRouter.get('/', listUserTicketsHandler);
ticketRouter.get('/:id', getTicketByIdHandler);
ticketRouter.patch('/:id/status', requireRole(Role.ADMIN), updateTicketStatusHandler);
ticketRouter.post('/:id/comments', addTicketCommentHandler);
