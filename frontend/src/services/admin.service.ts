/**
 * Admin Service — typed API calls for all admin dashboard endpoints.
 */
import { api } from '../lib/api';
import type { PaginatedResponse } from './booking.service';

// ─── Domain Types ───────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  // The backend returns a nested structure
  overview: {
    totalUsers: number;
    totalProviders: number;
    totalBookings: number;
    totalRevenue: number;
    activeRoutes?: number;
  };
  today: {
    bookings: number;
    revenue: number;
    bookingsGrowth?: number;
    revenueGrowth?: number;
  };
  last30Days: {
    newUsers?: number;
    usersGrowth?: number;
    bookings?: number;
    bookingsGrowth?: number;
    revenue?: number;
    revenueGrowth?: number;
  };
  alerts: {
    pendingProviders: number;
    openTickets: number;
  };
  recentActivity?: Array<{
    id: string;
    description: string;
    amount?: number;
    status: string;
    createdAt: string;
  }>;
  // Legacy flat fields (keep for backward compat)
  totalUsers?: number;
  totalProviders?: number;
  totalBookings?: number;
  totalRevenue?: number;
  todayBookings?: number;
  todayRevenue?: number;
  pendingProviders?: number;
  openSupportTickets?: number;
  userGrowth?: number;
  revenueGrowth?: number;
  bookingGrowth?: number;
}

export interface AdminAnalytics {
  revenueByDay: { date: string; revenue: number; bookings: number }[];
  bookingsByStatus: { status: string; count: number }[];
  topRoutes: { from?: string; to?: string; fromCity?: string; toCity?: string; bookings?: number; count?: number; revenue: number }[];
  usersByRole: { role: string; count: number }[];
  providersByStatus: { status: string; count: number }[];
  // Extended fields returned by the backend
  trends?: { date: string; bookings: number; revenue: number }[];
  topProvidersByBookings?: { companyName: string; count: number }[];
  topProvidersByRating?: { companyName: string; avgRating: number }[];
  topUsersByBookings?: { userId: string; name: string; count: number }[];
  topVehicles?: { vehicleId: string; name: string; count: number }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'PASSENGER' | 'PROVIDER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  _count?: { bookings: number };
}

export interface AdminProvider {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  city?: string;
  state?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  rating: number;
  totalReviews: number;
  createdAt: string;
  user: { name: string; email?: string; phone: string };
  _count?: { vehicles: number };
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  userId?: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  ipAddress?: string;
  device?: string;
  os?: string;
  browser?: string;
  country?: string;
  city?: string;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  maxUses?: number;
  usedCount: number;
  createdAt: string;
}

export interface CreatePromoCodePayload {
  code: string;
  description?: string;
  type: AdminPromoCode['type'];
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  maxUses?: number;
  applicableRoutes?: string[];
}

export interface AdminNotificationPayload {
  title: string;
  message: string;
  type: string;
  targetRole?: 'PASSENGER' | 'PROVIDER' | 'ADMIN' | 'ALL';
  userIds?: string[];
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const adminService = {
  // ─── Dashboard / Analytics ─────────────────────────────────────

  /** Get admin dashboard stats. */
  getDashboard: () =>
    api.get<AdminDashboardStats>('/admin/dashboard'),

  /** Get detailed analytics. */
  getAnalytics: (period?: 'week' | 'month' | 'quarter' | 'year') =>
    api.get<AdminAnalytics>(`/admin/analytics${period ? `?period=${period}` : ''}`),

  // ─── Users ─────────────────────────────────────────────────────

  /** List all users (paginated). */
  getUsers: (params: { page?: number; limit?: number; search?: string; role?: string }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
    return api.get<PaginatedResponse<AdminUser>>(`/admin/users?${q.toString()}`);
  },

  /** Update a user's active status. */
  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch<AdminUser>(`/admin/users/${id}/status`, { isActive }),

  /** Update a user's role. */
  updateUserRole: (id: string, role: AdminUser['role']) =>
    api.patch<AdminUser>(`/admin/users/${id}/role`, { role }),

  // ─── Providers ─────────────────────────────────────────────────

  /** List all providers (paginated). */
  getProviders: (params: { page?: number; limit?: number; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
    return api.get<PaginatedResponse<AdminProvider>>(`/admin/providers?${q.toString()}`);
  },

  /** Verify or reject a provider. */
  updateProviderStatus: (id: string, status: 'VERIFIED' | 'REJECTED' | 'SUSPENDED') =>
    api.patch<AdminProvider>(`/admin/providers/${id}/status`, { status }),

  // ─── Promo Codes ───────────────────────────────────────────────

  /** List all promo codes. */
  getPromoCodes: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<AdminPromoCode>>(
      `/admin/promo-codes?page=${page}&limit=${limit}`,
    ),

  /** Create a promo code. */
  createPromoCode: (data: CreatePromoCodePayload) =>
    api.post<AdminPromoCode>('/admin/promo-codes', data),

  /** Update a promo code. */
  updatePromoCode: (id: string, data: Partial<CreatePromoCodePayload>) =>
    api.patch<AdminPromoCode>(`/admin/promo-codes/${id}`, data),

  /** Delete a promo code. */
  deletePromoCode: (id: string) =>
    api.delete<{ success: boolean }>(`/admin/promo-codes/${id}`),

  // ─── Notifications (Broadcast) ─────────────────────────────────

  /** Send a broadcast notification. */
  sendNotification: (data: AdminNotificationPayload) =>
    api.post<{ success: boolean; sent: number }>('/admin/notifications/broadcast', data),

  // ─── Logs ──────────────────────────────────────────────────────

  /** Get audit logs. */
  getAuditLogs: (page = 1, limit = 50, entityType?: string) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (entityType) q.set('entityType', entityType);
    return api.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${q.toString()}`);
  },

  /** Get access logs. */
  getAccessLogs: (page = 1, limit = 100, method?: string, statusCode?: number) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (method) q.set('method', method);
    if (statusCode) q.set('statusCode', String(statusCode));
    return api.get<PaginatedResponse<AccessLog>>(`/admin/access-logs?${q.toString()}`);
  },

  // ─── System Settings ───────────────────────────────────────────

  /** Get all system settings. */
  getSettings: () =>
    api.get<SystemSetting[]>('/admin/settings'),

  /** Update a system setting. */
  updateSetting: (key: string, value: unknown) =>
    api.patch<SystemSetting>(`/admin/settings/${key}`, { value }),

  // ─── Reports ───────────────────────────────────────────────────

  /** Export bookings report as CSV blob. */
  exportBookingsReport: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    return api.get<Blob>(`/admin/reports/bookings?${q.toString()}`, {
      responseType: 'blob',
    });
  },
};
