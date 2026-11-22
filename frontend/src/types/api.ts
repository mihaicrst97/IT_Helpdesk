export type Role = 'USER' | 'ADMIN';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'CRITICAL';

export interface CertificationSummary {
  id: string;
  name: string;
  certifiedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface SafeUser extends UserSummary {
  createdAt: string;
  certifications: CertificationSummary[];
}

export interface AuthResponse {
  token: string;
  user: SafeUser;
}

export interface Category {
  id: string;
  name: string;
  discordChannelKey: string;
}

export interface TicketComment {
  id: string;
  content: string;
  ticketId: string;
  authorId: string;
  createdAt: string;
  author: UserSummary;
}

export interface TicketSummary {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: string;
  authorId: string;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  };
  author: UserSummary;
  assignedAdmin: UserSummary | null;
  _count?: {
    comments: number;
  };
}

export interface TicketDetail extends TicketSummary {
  comments: TicketComment[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TicketListResponse {
  tickets: TicketSummary[];
  pagination: PaginationMeta;
}

export interface TicketFilterParams {
  status?: TicketStatus | '';
  priority?: TicketPriority | '';
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminAnalyticsResponse {
  certifications: CertificationSummary[];
  totalTickets: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
  byPriority: Array<{
    priority: TicketPriority;
    count: number;
  }>;
  byStatus: Array<{
    status: TicketStatus;
    count: number;
  }>;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
