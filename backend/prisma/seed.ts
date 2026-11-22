import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient, Role, TicketPriority, TicketStatus } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const prisma = new PrismaClient();

const DEMO_USER_PASSWORD = 'Password123!';
const DEMO_ADMIN_PASSWORD = 'Admin123!';

const TICKET_HW_ID = '11111111-1111-4111-8111-111111111111';
const TICKET_LIC_ID = '22222222-2222-4222-8222-222222222222';
const COMMENT_LIC_ID = '33333333-3333-4333-8333-333333333333';

async function main(): Promise<void> {
  const categoryDefinitions = [
    { name: 'HARDWARE', discordChannelKey: 'DISCORD_WEBHOOK_HW' },
    { name: 'SOFTWARE', discordChannelKey: 'DISCORD_WEBHOOK_SW' },
    { name: 'LICENSES', discordChannelKey: 'DISCORD_WEBHOOK_LIC' },
    { name: 'NETWORK', discordChannelKey: 'DISCORD_WEBHOOK_NET' },
  ];

  const categoriesByName = new Map<string, string>();
  for (const item of categoryDefinitions) {
    const category = await prisma.category.upsert({
      where: { name: item.name },
      update: { discordChannelKey: item.discordChannelKey },
      create: item,
    });
    categoriesByName.set(category.name, category.id);
  }

  const userPasswordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
  const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);

  const standardUser = await prisma.user.upsert({
    where: { email: 'user@helpdesk.local' },
    update: {
      fullName: 'Alex Employee',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
    create: {
      email: 'user@helpdesk.local',
      fullName: 'Alex Employee',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });

  const adminHw = await prisma.user.upsert({
    where: { email: 'admin.hw@helpdesk.local' },
    update: {
      fullName: 'Jordan Hardware Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      email: 'admin.hw@helpdesk.local',
      fullName: 'Jordan Hardware Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const adminLic = await prisma.user.upsert({
    where: { email: 'admin.lic@helpdesk.local' },
    update: {
      fullName: 'Taylor Licenses Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      email: 'admin.lic@helpdesk.local',
      fullName: 'Taylor Licenses Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const adminSw = await prisma.user.upsert({
    where: { email: 'admin.sw@helpdesk.local' },
    update: {
      fullName: 'Morgan Software Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      email: 'admin.sw@helpdesk.local',
      fullName: 'Morgan Software Admin',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const certificationPairs: Array<{ userId: string; categoryName: string }> = [
    { userId: adminHw.id, categoryName: 'HARDWARE' },
    { userId: adminLic.id, categoryName: 'LICENSES' },
    { userId: adminSw.id, categoryName: 'SOFTWARE' },
    { userId: adminSw.id, categoryName: 'NETWORK' },
  ];

  for (const pair of certificationPairs) {
    const categoryId = categoriesByName.get(pair.categoryName);
    if (!categoryId) {
      throw new Error(`Missing seeded category: ${pair.categoryName}`);
    }
    await prisma.adminCertification.upsert({
      where: {
        userId_categoryId: {
          userId: pair.userId,
          categoryId,
        },
      },
      update: {},
      create: {
        userId: pair.userId,
        categoryId,
      },
    });
  }

  const hardwareCategoryId = categoriesByName.get('HARDWARE');
  const licensesCategoryId = categoriesByName.get('LICENSES');
  if (!hardwareCategoryId || !licensesCategoryId) {
    throw new Error('Required seed categories were not created');
  }

  await prisma.ticket.upsert({
    where: { id: TICKET_HW_ID },
    update: {
      title: 'Workstation monitor fails to power on',
      description: 'Primary dual-display setup in Lab B302 lost power after restart.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.CRITICAL,
      categoryId: hardwareCategoryId,
      authorId: standardUser.id,
      assignedAdminId: null,
    },
    create: {
      id: TICKET_HW_ID,
      title: 'Workstation monitor fails to power on',
      description: 'Primary dual-display setup in Lab B302 lost power after restart.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.CRITICAL,
      categoryId: hardwareCategoryId,
      authorId: standardUser.id,
    },
  });

  const licenseTicket = await prisma.ticket.upsert({
    where: { id: TICKET_LIC_ID },
    update: {
      title: 'IDE license renewal request',
      description: 'Annual seat renewal required for the engineering workstation group.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      categoryId: licensesCategoryId,
      authorId: standardUser.id,
      assignedAdminId: adminLic.id,
    },
    create: {
      id: TICKET_LIC_ID,
      title: 'IDE license renewal request',
      description: 'Annual seat renewal required for the engineering workstation group.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      categoryId: licensesCategoryId,
      authorId: standardUser.id,
      assignedAdminId: adminLic.id,
    },
  });

  await prisma.comment.upsert({
    where: { id: COMMENT_LIC_ID },
    update: {
      content: 'Renewal quote requested from vendor; awaiting procurement confirmation.',
      ticketId: licenseTicket.id,
      authorId: adminLic.id,
    },
    create: {
      id: COMMENT_LIC_ID,
      content: 'Renewal quote requested from vendor; awaiting procurement confirmation.',
      ticketId: licenseTicket.id,
      authorId: adminLic.id,
    },
  });

  const [categoryCount, userCount, certificationCount, ticketCount, commentCount] =
    await Promise.all([
      prisma.category.count(),
      prisma.user.count(),
      prisma.adminCertification.count(),
      prisma.ticket.count(),
      prisma.comment.count(),
    ]);

  console.log(
    `Seed completed: ${categoryCount} categories, ${userCount} users, ${certificationCount} certifications, ${ticketCount} tickets, ${commentCount} comments.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
