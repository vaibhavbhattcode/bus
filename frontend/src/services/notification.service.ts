/**
 * Notification Service — typed API calls for notifications.
 */
import { api } from '../lib/api';
import type { PaginatedResponse } from './booking.service';

// ─── Domain Types ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const notificationService = {
  /** Get notifications (paginated). */
  getAll: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Notification>>(
      `/notifications?page=${page}&limit=${limit}`,
    ),

  /** Get unread count only (lightweight). */
  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count'),

  /** Mark a notification as read. */
  markRead: (id: string) =>
    api.patch<Notification>(`/notifications/${id}/read`, {}),

  /** Mark all notifications as read. */
  markAllRead: () =>
    api.patch<{ success: boolean; updated: number }>('/notifications/read-all', {}),

  /** Delete a notification. */
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/notifications/${id}`),

  /** Register FCM device token for push notifications. */
  registerFcmToken: (token: string, device?: string) =>
    api.post<{ success: boolean }>('/notifications/fcm-token', { token, device }),

  /** Update notification preferences. */
  updatePreferences: (prefs: {
    emailOnBooking?: boolean;
    emailOnPromo?: boolean;
    pushOnBooking?: boolean;
    pushOnReminder?: boolean;
  }) =>
    api.patch<{ success: boolean }>('/notifications/preferences', prefs),
};
