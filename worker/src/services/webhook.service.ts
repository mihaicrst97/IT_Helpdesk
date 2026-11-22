import axios from 'axios';
import { z } from 'zod';
import { env } from '../config/env';

export const ticketCreatedEventSchema = z.object({
  ticketId: z.string().min(1),
  title: z.string().min(1),
  priority: z.string().min(1),
  category: z.string().min(1),
  authorEmail: z.string().email(),
  createdAt: z.string().optional(),
});

export type TicketCreatedEvent = z.infer<typeof ticketCreatedEventSchema>;

interface WebhookTarget {
  envKey: string;
  url: string;
  channelName: string;
}

function getWebhookTarget(category: string): WebhookTarget | null {
  switch (category.toUpperCase()) {
    case 'HARDWARE':
      return {
        envKey: 'DISCORD_WEBHOOK_HW',
        url: env.DISCORD_WEBHOOK_HW.trim(),
        channelName: '#hw-support',
      };
    case 'SOFTWARE':
      return {
        envKey: 'DISCORD_WEBHOOK_SW',
        url: env.DISCORD_WEBHOOK_SW.trim(),
        channelName: '#sw-support',
      };
    case 'LICENSES':
      return {
        envKey: 'DISCORD_WEBHOOK_LIC',
        url: env.DISCORD_WEBHOOK_LIC.trim(),
        channelName: '#licensing',
      };
    case 'NETWORK':
      return {
        envKey: 'DISCORD_WEBHOOK_NET',
        url: env.DISCORD_WEBHOOK_NET.trim(),
        channelName: '#net-support',
      };
    default:
      return null;
  }
}

function getPriorityColor(priority: string): number {
  switch (priority.toUpperCase()) {
    case 'CRITICAL':
      return 0xdc3545;
    case 'MEDIUM':
      return 0xffc107;
    default:
      return 0x6c757d;
  }
}

export async function dispatchTicketNotification(
  event: TicketCreatedEvent,
): Promise<'sent' | 'skipped'> {
  const target = getWebhookTarget(event.category);
  if (!target) {
    console.warn(`No webhook mapping exists for category ${event.category}; skipping ticket ${event.ticketId}`);
    return 'skipped';
  }

  if (!target.url) {
    console.log(
      `Webhook ${target.envKey} is not configured; skipped Discord dispatch for ticket ${event.ticketId} (${event.category} -> ${target.channelName})`,
    );
    return 'skipped';
  }

  const payload = {
    embeds: [
      {
        title: 'New Support Ticket Created',
        color: getPriorityColor(event.priority),
        fields: [
          { name: 'Ticket ID', value: event.ticketId, inline: false },
          { name: 'Category', value: event.category, inline: true },
          { name: 'Priority', value: event.priority, inline: true },
          { name: 'Channel', value: target.channelName, inline: true },
          { name: 'Reporter', value: event.authorEmail, inline: false },
          { name: 'Title', value: event.title, inline: false },
        ],
        timestamp: event.createdAt ?? new Date().toISOString(),
      },
    ],
  };

  const response = await axios.post(target.url, payload, { timeout: 10000 });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Discord webhook responded with unexpected status ${response.status}`);
  }

  return 'sent';
}
