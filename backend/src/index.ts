import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { closeRabbitMQ, connectRabbitMQ } from './services/rabbitmq.service';

const server = app.listen(env.PORT, () => {
  console.log(`Backend API listening on port ${env.PORT} (${env.NODE_ENV})`);
  void connectRabbitMQ();
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down backend API`);
  server.close(async () => {
    await Promise.allSettled([closeRabbitMQ(), prisma.$disconnect()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
