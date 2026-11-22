import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function listCategoriesHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        discordChannelKey: true,
      },
    });
    res.status(200).json({ categories });
  } catch (error: unknown) {
    next(error);
  }
}
