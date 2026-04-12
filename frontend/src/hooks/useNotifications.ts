/**
 * useNotifications — React Query hooks for notification operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { notificationService } from '../services/notification.service';
import { adminService } from '../services/admin.service';
import { userService } from '../services/user.service';
import { queryKeys } from '../lib/queryKeys';

// ─── Notification Queries ────────────────────────────────────────────────────

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: queryKeys.notifications.list(page),
    queryFn: () => notificationService.getAll(page),
    staleTime: 30_000,
    refetchInterval: 60_000, // poll for new notifications every 60s
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationService.getUnreadCount,
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ─── Notification Mutations ──────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ─── Admin Stats Queries ─────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: adminService.getDashboard,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useAdminAnalytics(period?: 'week' | 'month' | 'quarter' | 'year') {
  return useQuery({
    queryKey: queryKeys.admin.analytics(period),
    queryFn: () => adminService.getAnalytics(period),
    staleTime: 10 * 60_000,
  });
}

export function useAdminUsers(params: { page?: number; search?: string; role?: string }) {
  return useQuery({
    queryKey: queryKeys.users.adminList(params.page ?? 1, params.search, params.role),
    queryFn: () => adminService.getUsers(params),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export function useAdminProviders(params: {
  page?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.providers.adminList(params.page ?? 1, params.status, params.search),
    queryFn: () => adminService.getProviders(params),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

// ─── User Profile Queries ────────────────────────────────────────────────────

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.users.profile,
    queryFn: userService.getProfile,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile });
      toast.success('Profile updated successfully!');
    },
  });
}

export function useWallet(page = 1) {
  return useQuery({
    queryKey: queryKeys.users.wallet,
    queryFn: () => userService.getWallet(page),
    staleTime: 30_000,
  });
}

export function usePriceAlerts(page = 1) {
  return useQuery({
    queryKey: queryKeys.users.priceAlerts(page),
    queryFn: () => userService.getPriceAlerts(page),
    staleTime: 60_000,
  });
}

export function useSeatPreferences() {
  return useQuery({
    queryKey: queryKeys.users.seatPreferences,
    queryFn: userService.getSeatPreferences,
    staleTime: 10 * 60_000,
  });
}
