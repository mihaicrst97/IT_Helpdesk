import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Health check failed:', error);
    res.status(503).json({
      error: 'Database unavailable',
    });
  }
}
