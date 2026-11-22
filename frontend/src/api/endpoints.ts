import {
  AdminAnalyticsResponse,
  AuthResponse,
  Category,
  SafeUser,
  TicketComment,
  TicketDetail,
  TicketFilterParams,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from '../types/api';
import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority: TicketPriority;
  categoryId: string;
}

function cleanFilterParams(params: TicketFilterParams): Record<string, string | number> {
  const cleaned: Record<string, string | number> = {};
  if (params.status) cleaned.status = params.status;
  if (params.priority) cleaned.priority = params.priority;
  if (params.categoryId) cleaned.categoryId = params.categoryId;
  if (params.search && params.search.trim()) cleaned.search = params.search.trim();
  if (params.page) cleaned.page = params.page;
  if (params.limit) cleaned.limit = params.limit;
  return cleaned;
}

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function fetchMeApi(): Promise<SafeUser> {
  const { data } = await apiClient.get<{ user: SafeUser }>('/auth/me');
  return data.user;
}

export async function fetchCategoriesApi(): Promise<Category[]> {
  const { data } = await apiClient.get<{ categories: Category[] }>('/categories');
  return data.categories;
}

export async function createTicketApi(payload: CreateTicketPayload): Promise<TicketSummary> {
  const { data } = await apiClient.post<{ ticket: TicketSummary }>('/tickets', payload);
  return data.ticket;
}

export async function fetchUserTicketsApi(
  params: TicketFilterParams,
): Promise<TicketListResponse> {
  const { data } = await apiClient.get<TicketListResponse>('/tickets', {
    params: cleanFilterParams(params),
  });
  return data;
}

export async function fetchAdminTicketsApi(
  params: TicketFilterParams,
): Promise<TicketListResponse> {
  const { data } = await apiClient.get<TicketListResponse>('/admin/tickets', {
    params: cleanFilterParams(params),
  });
  return data;
}

export async function fetchTicketByIdApi(id: string): Promise<TicketDetail> {
  const { data } = await apiClient.get<{ ticket: TicketDetail }>(`/tickets/${id}`);
  return data.ticket;
}

export async function updateTicketStatusApi(
  id: string,
  status: TicketStatus,
): Promise<TicketSummary> {
  const { data } = await apiClient.patch<{ ticket: TicketSummary }>(`/tickets/${id}/status`, {
    status,
  });
  return data.ticket;
}

export async function addTicketCommentApi(id: string, content: string): Promise<TicketComment> {
  const { data } = await apiClient.post<{ comment: TicketComment }>(`/tickets/${id}/comments`, {
    content,
  });
  return data.comment;
}

export async function fetchAdminAnalyticsApi(): Promise<AdminAnalyticsResponse> {
  const { data } = await apiClient.get<AdminAnalyticsResponse>('/admin/analytics');
  return data;
}
