import { Prisma, Role, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthenticatedUser, CertificationSummary } from '../types/auth';
import { AppError } from '../types/errors';
import { publishTicketCreated } from './rabbitmq.service';

interface CreateTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
  categoryId: string;
}

export interface ListTicketsQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminAnalyticsResult {
  certifications: CertificationSummary[];
  totalTickets: number;
  byCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
  byPriority: Array<{ priority: TicketPriority; count: number }>;
  byStatus: Array<{ status: TicketStatus; count: number }>;
}

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
} as const;

const ticketSummaryInclude = {
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  author: {
    select: safeUserSelect,
  },
  assignedAdmin: {
    select: safeUserSelect,
  },
  _count: {
    select: {
      comments: true,
    },
  },
} as const;

async function getAdminCertifiedCategoryIds(userId: string): Promise<string[]> {
  const certifications = await prisma.adminCertification.findMany({
    where: { userId },
    select: { categoryId: true },
  });
  return certifications.map((cert) => cert.categoryId);
}

async function assertTicketAccess(
  ticket: { authorId: string; categoryId: string },
  actor: AuthenticatedUser,
): Promise<void> {
  if (ticket.authorId === actor.id) {
    return;
  }

  if (actor.role === Role.ADMIN) {
    const certification = await prisma.adminCertification.findUnique({
      where: {
        userId_categoryId: {
          userId: actor.id,
          categoryId: ticket.categoryId,
        },
      },
      select: { categoryId: true },
    });

    if (!certification) {
      throw new AppError('You are not certified for this ticket category', 403);
    }
    return;
  }

  throw new AppError('You do not have permission to access this ticket', 403);
}

function buildOptionalFilters(query: ListTicketsQuery): Prisma.TicketWhereInput[] {
  const filters: Prisma.TicketWhereInput[] = [];

  if (query.status) {
    filters.push({ status: query.status });
  }
  if (query.priority) {
    filters.push({ priority: query.priority });
  }
  if (query.categoryId) {
    filters.push({ categoryId: query.categoryId });
  }
  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  return filters;
}

function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export async function createTicket(authorId: string, input: CreateTicketInput) {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError('Selected category does not exist', 400);
  }

  const ticket = await prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: TicketStatus.OPEN,
      categoryId: input.categoryId,
      authorId,
    },
    include: ticketSummaryInclude,
  });

  publishTicketCreated({
    ticketId: ticket.id,
    title: ticket.title,
    priority: ticket.priority,
    category: ticket.category.name,
    authorEmail: ticket.author.email,
    createdAt: ticket.createdAt.toISOString(),
  });

  return ticket;
}

export async function listUserTickets(authorId: string, query: ListTicketsQuery) {
  const where: Prisma.TicketWhereInput = {
    AND: [{ authorId }, ...buildOptionalFilters(query)],
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: ticketSummaryInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    pagination: buildPagination(query.page, query.limit, total),
  };
}

export async function listAdminTickets(adminId: string, query: ListTicketsQuery) {
  const certifiedCategoryIds = await getAdminCertifiedCategoryIds(adminId);
  if (certifiedCategoryIds.length === 0) {
    return {
      tickets: [],
      pagination: buildPagination(query.page, query.limit, 0),
    };
  }

  // Always intersect the certification scope at the database query boundary.
  const where: Prisma.TicketWhereInput = {
    AND: [{ categoryId: { in: certifiedCategoryIds } }, ...buildOptionalFilters(query)],
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: ticketSummaryInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    pagination: buildPagination(query.page, query.limit, total),
  };
}

export async function getTicketById(ticketId: string, actor: AuthenticatedUser) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      author: {
        select: safeUserSelect,
      },
      assignedAdmin: {
        select: safeUserSelect,
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: safeUserSelect,
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  await assertTicketAccess(ticket, actor);
  return ticket;
}

export async function updateTicketStatus(
  ticketId: string,
  adminId: string,
  status: TicketStatus,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, categoryId: true },
  });

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const certification = await prisma.adminCertification.findUnique({
    where: {
      userId_categoryId: {
        userId: adminId,
        categoryId: ticket.categoryId,
      },
    },
    select: { categoryId: true },
  });

  if (!certification) {
    throw new AppError('You are not certified for this ticket category', 403);
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      assignedAdminId: adminId,
    },
    include: ticketSummaryInclude,
  });
}

export async function addTicketComment(
  ticketId: string,
  actor: AuthenticatedUser,
  content: string,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, authorId: true, categoryId: true },
  });

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  await assertTicketAccess(ticket, actor);

  return prisma.comment.create({
    data: {
      content,
      ticketId,
      authorId: actor.id,
    },
    include: {
      author: {
        select: safeUserSelect,
      },
    },
  });
}

export async function getAdminAnalytics(adminId: string): Promise<AdminAnalyticsResult> {
  const certRecords = await prisma.adminCertification.findMany({
    where: { userId: adminId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      category: {
        name: 'asc',
      },
    },
  });

  const certifications: CertificationSummary[] = certRecords.map((cert) => ({
    id: cert.category.id,
    name: cert.category.name,
    certifiedAt: cert.certifiedAt,
  }));

  const categoryCounts = new Map<string, number>();
  for (const cert of certifications) {
    categoryCounts.set(cert.id, 0);
  }

  const priorityCounts = new Map<TicketPriority, number>([
    [TicketPriority.LOW, 0],
    [TicketPriority.MEDIUM, 0],
    [TicketPriority.CRITICAL, 0],
  ]);

  const statusCounts = new Map<TicketStatus, number>([
    [TicketStatus.OPEN, 0],
    [TicketStatus.IN_PROGRESS, 0],
    [TicketStatus.RESOLVED, 0],
  ]);

  const certifiedCategoryIds = certifications.map((cert) => cert.id);
  let totalTickets = 0;

  if (certifiedCategoryIds.length > 0) {
    const scopedWhere: Prisma.TicketWhereInput = {
      categoryId: { in: certifiedCategoryIds },
    };

    const [total, categoryGroups, priorityGroups, statusGroups] = await Promise.all([
      prisma.ticket.count({ where: scopedWhere }),
      prisma.ticket.groupBy({
        by: ['categoryId'],
        where: scopedWhere,
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        where: scopedWhere,
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ['status'],
        where: scopedWhere,
        _count: { _all: true },
      }),
    ]);

    totalTickets = total;
    for (const group of categoryGroups) {
      categoryCounts.set(group.categoryId, group._count._all);
    }
    for (const group of priorityGroups) {
      priorityCounts.set(group.priority, group._count._all);
    }
    for (const group of statusGroups) {
      statusCounts.set(group.status, group._count._all);
    }
  }

  return {
    certifications,
    totalTickets,
    byCategory: certifications.map((cert) => ({
      categoryId: cert.id,
      categoryName: cert.name,
      count: categoryCounts.get(cert.id) ?? 0,
    })),
    byPriority: [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.CRITICAL].map(
      (priority) => ({
        priority,
        count: priorityCounts.get(priority) ?? 0,
      }),
    ),
    byStatus: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED].map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
  };
}
