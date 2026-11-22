import amqp from 'amqplib';
import { env } from '../config/env';

export interface TicketCreatedEvent {
  ticketId: string;
  title: string;
  priority: string;
  category: string;
  authorEmail: string;
  createdAt: string;
}

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection | null = null;
let channel: amqp.Channel | null = null;
let connectingPromise: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetHandles(): void {
  channel = null;
  connection = null;
}

export async function connectRabbitMQ(maxRetries = 10, retryDelayMs = 2000): Promise<void> {
  if (channel) {
    return;
  }
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const conn = await amqp.connect(env.RABBITMQ_URL);
        conn.on('error', (error: unknown) => {
          console.error('RabbitMQ connection error:', error);
          resetHandles();
        });
        conn.on('close', () => {
          resetHandles();
        });

        const ch = await conn.createChannel();
        ch.on('error', (error: unknown) => {
          console.error('RabbitMQ channel error:', error);
          channel = null;
        });
        ch.on('close', () => {
          channel = null;
        });

        await ch.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', { durable: true });
        connection = conn;
        channel = ch;
        console.log(`Connected to RabbitMQ exchange ${env.RABBITMQ_EXCHANGE}`);
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown connection error';
        console.warn(`RabbitMQ connection attempt ${attempt}/${maxRetries} failed: ${message}`);
        if (attempt < maxRetries) {
          await sleep(retryDelayMs);
        }
      }
    }

    console.error('Exhausted RabbitMQ connection retries; events will be skipped until reconnect');
  })();

  try {
    await connectingPromise;
  } finally {
    connectingPromise = null;
  }
}

export function publishTicketCreated(event: TicketCreatedEvent): void {
  const routingKey = `ticket.created.${event.category.toLowerCase()}`;
  if (!channel) {
    console.warn(
      `RabbitMQ channel unavailable; skipping event publish for ticket ${event.ticketId}`,
    );
    void connectRabbitMQ(3, 2000);
    return;
  }

  try {
    const payload = Buffer.from(JSON.stringify(event));
    channel.publish(env.RABBITMQ_EXCHANGE, routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
    });
  } catch (error: unknown) {
    console.error(`Failed to publish RabbitMQ event ${routingKey}:`, error);
  }
}

export async function closeRabbitMQ(): Promise<void> {
  const activeChannel = channel;
  const activeConnection = connection;
  resetHandles();

  try {
    if (activeChannel) {
      await activeChannel.close();
    }
  } catch (error: unknown) {
    console.error('Error closing RabbitMQ channel:', error);
  }

  try {
    if (activeConnection) {
      await activeConnection.close();
    }
  } catch (error: unknown) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}
