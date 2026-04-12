/**
 * Support Service — typed API calls for support tickets.
 */
import { api } from '../lib/api';
import type { PaginatedResponse } from './booking.service';

// ─── Domain Types ───────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  subject?: string;
  message?: string;
  category?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  replies?: TicketReply[];
  user?: { name: string; email?: string; phone: string };
}

export interface TicketReply {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  user: { name: string };
}

export interface CreateTicketPayload {
  subject: string;
  message: string;
  category?: string;
  priority?: SupportTicket['priority'];
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const supportService = {
  /** Get my support tickets. */
  getMyTickets: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<SupportTicket>>(`/support?page=${page}&limit=${limit}`),

  /** Get a single ticket with replies. */
  getById: (id: string) =>
    api.get<SupportTicket>(`/support/${id}`),

  /** Create a new support ticket. */
  create: (data: CreateTicketPayload) =>
    api.post<SupportTicket>('/support', data),

  /** Reply to a ticket. */
  reply: (id: string, message: string) =>
    api.post<TicketReply>(`/support/${id}/reply`, { message }),

  /** Close a ticket (passenger action). */
  close: (id: string) =>
    api.patch<SupportTicket>(`/support/${id}/close`, {}),

  // ─── Admin ─────────────────────────────────────────────────────

  adminGetAll: (params: { page?: number; status?: string; priority?: string }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
    return api.get<PaginatedResponse<SupportTicket>>(`/admin/support?${q.toString()}`);
  },

  adminUpdateStatus: (
    id: string,
    status: SupportTicket['status'],
    priority?: SupportTicket['priority'],
  ) =>
    api.patch<SupportTicket>(`/admin/support/${id}`, { status, priority }),

  adminReply: (id: string, message: string) =>
    api.post<TicketReply>(`/admin/support/${id}/reply`, { message }),
};
