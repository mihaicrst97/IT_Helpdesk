import { NextFunction, Request, Response } from 'express';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { z } from 'zod';
import * as ticketService from '../services/ticket.service';
import { AppError } from '../types/errors';

function emptyToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value;
}

const ticketIdParamSchema = z.object({
  id: z.string().uuid('Ticket ID must be a valid UUID'),
});

const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title must be at most 150 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  priority: z.nativeEnum(TicketPriority),
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
});

const listTicketsQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, z.nativeEnum(TicketStatus).optional()),
  priority: z.preprocess(emptyToUndefined, z.nativeEnum(TicketPriority).optional()),
  categoryId: z.preprocess(
    emptyToUndefined,
    z.string().uuid('Category ID must be a valid UUID').optional(),
  ),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment content cannot be empty')
    .max(2000, 'Comment must be at most 2000 characters'),
});

export async function createTicketHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const payload = createTicketSchema.parse(req.body);
    const ticket = await ticketService.createTicket(req.user.id, payload);
    res.status(201).json({ ticket });
  } catch (error: unknown) {
    next(error);
  }
}

export async function listUserTicketsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const query = listTicketsQuerySchema.parse(req.query);
    const result = await ticketService.listUserTickets(req.user.id, query);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
}

export async function listAdminTicketsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const query = listTicketsQuerySchema.parse(req.query);
    const result = await ticketService.listAdminTickets(req.user.id, query);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
}

export async function getTicketByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = ticketIdParamSchema.parse(req.params);
    const ticket = await ticketService.getTicketById(id, req.user);
    res.status(200).json({ ticket });
  } catch (error: unknown) {
    next(error);
  }
}

export async function updateTicketStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = ticketIdParamSchema.parse(req.params);
    const { status } = updateStatusSchema.parse(req.body);
    const ticket = await ticketService.updateTicketStatus(id, req.user.id, status);
    res.status(200).json({ ticket });
  } catch (error: unknown) {
    next(error);
  }
}

export async function addTicketCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { id } = ticketIdParamSchema.parse(req.params);
    const { content } = createCommentSchema.parse(req.body);
    const comment = await ticketService.addTicketComment(id, req.user, content);
    res.status(201).json({ comment });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getAdminAnalyticsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const analytics = await ticketService.getAdminAnalytics(req.user.id);
    res.status(200).json(analytics);
  } catch (error: unknown) {
    next(error);
  }
}
