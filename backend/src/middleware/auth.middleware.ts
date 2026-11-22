import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../types/errors';

const tokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: z.nativeEnum(Role),
});

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const verified = jwt.verify(token, env.JWT_SECRET);
    const parsed = tokenPayloadSchema.safeParse(verified);
    if (!parsed.success) {
      next(new AppError('Invalid or expired token', 401));
      return;
    }

    req.user = {
      id: parsed.data.sub,
      email: parsed.data.email,
      role: parsed.data.role,
    };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    next();
  };
}
