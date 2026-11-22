import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
  RABBITMQ_EXCHANGE: z.string().min(1).default('helpdesk_topic_exchange'),
  RABBITMQ_QUEUE: z.string().min(1).default('notifications_queue'),
  DISCORD_WEBHOOK_HW: z.string().default(''),
  DISCORD_WEBHOOK_SW: z.string().default(''),
  DISCORD_WEBHOOK_LIC: z.string().default(''),
  DISCORD_WEBHOOK_NET: z.string().default(''),
  RETRY_DELAY_MS: z.coerce.number().int().min(500).default(5000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid worker environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
