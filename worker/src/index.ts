import amqp from 'amqplib';
import { env } from './config/env';
import {
  dispatchTicketNotification,
  ticketCreatedEventSchema,
} from './services/webhook.service';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

let connection: AmqpConnection | null = null;
let channel: amqp.Channel | null = null;
let shuttingDown = false;
let reconnectTimer: NodeJS.Timeout | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scheduleReconnect(): void {
  if (shuttingDown || reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void startConsumer();
  }, 3000);
}

async function handleMessage(activeChannel: amqp.Channel, msg: amqp.ConsumeMessage | null): Promise<void> {
  if (!msg) {
    return;
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(msg.content.toString('utf8'));
  } catch {
    console.error('Received malformed JSON payload; discarding message');
    activeChannel.nack(msg, false, false);
    return;
  }

  const parsed = ticketCreatedEventSchema.safeParse(rawPayload);
  if (!parsed.success) {
    console.error('Received invalid ticket event schema; discarding message');
    activeChannel.nack(msg, false, false);
    return;
  }

  try {
    const outcome = await dispatchTicketNotification(parsed.data);
    activeChannel.ack(msg);
    console.log(
      `Processed event ${msg.fields.routingKey} for ticket ${parsed.data.ticketId} (${outcome})`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown delivery error';
    console.error(
      `Failed to dispatch notification for ticket ${parsed.data.ticketId}; requeuing in ${env.RETRY_DELAY_MS}ms: ${message}`,
    );
    await sleep(env.RETRY_DELAY_MS);
    if (!shuttingDown && channel === activeChannel) {
      try {
        activeChannel.nack(msg, false, true);
      } catch (nackError: unknown) {
        console.error('Failed to nack message during retry:', nackError);
      }
    }
  }
}

async function startConsumer(maxRetries = 15, retryDelayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    if (shuttingDown) {
      return;
    }

    try {
      const conn = await amqp.connect(env.RABBITMQ_URL);
      conn.on('error', (error: unknown) => {
        console.error('Worker RabbitMQ connection error:', error);
      });
      conn.on('close', () => {
        channel = null;
        connection = null;
        if (!shuttingDown) {
          console.warn('Worker RabbitMQ connection closed; scheduling reconnect');
          scheduleReconnect();
        }
      });

      const ch = await conn.createChannel();
      ch.on('error', (error: unknown) => {
        console.error('Worker RabbitMQ channel error:', error);
      });

      await ch.prefetch(1);
      await ch.assertExchange(env.RABBITMQ_EXCHANGE, 'topic', { durable: true });
      await ch.assertQueue(env.RABBITMQ_QUEUE, { durable: true });
      await ch.bindQueue(env.RABBITMQ_QUEUE, env.RABBITMQ_EXCHANGE, 'ticket.created.*');

      connection = conn;
      channel = ch;

      await ch.consume(
        env.RABBITMQ_QUEUE,
        (msg) => {
          void handleMessage(ch, msg);
        },
        { noAck: false },
      );

      console.log(
        `Notification worker consuming ${env.RABBITMQ_QUEUE} bound to ${env.RABBITMQ_EXCHANGE} (ticket.created.*)`,
      );
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Worker RabbitMQ connection attempt ${attempt}/${maxRetries} failed: ${message}`);
      if (attempt < maxRetries) {
        await sleep(retryDelayMs);
      }
    }
  }

  if (!shuttingDown) {
    console.error('Worker failed to connect after maximum retries; scheduling retry');
    scheduleReconnect();
  }
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down notification worker`);

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (channel) {
      await channel.close();
    }
  } catch (error: unknown) {
    console.error('Error closing worker channel:', error);
  }

  try {
    if (connection) {
      await connection.close();
    }
  } catch (error: unknown) {
    console.error('Error closing worker connection:', error);
  }

  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void startConsumer();
