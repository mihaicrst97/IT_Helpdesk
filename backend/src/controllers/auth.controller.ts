import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AppError } from '../types/errors';

const registerSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await authService.registerUser(payload);
    res.status(201).json(result);
  } catch (error: unknown) {
    next(error);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await authService.loginUser(payload);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
}

export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({ user });
  } catch (error: unknown) {
    next(error);
  }
}
