/**
 * useBookings — React Query hooks for booking operations.
 * These hooks replace all raw useEffect + useState patterns in booking pages.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/booking.service';
import { queryKeys } from '../lib/queryKeys';
import toast from 'react-hot-toast';

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's bookings (paginated).
 * Automatically cached — no duplicate requests.
 */
export function useMyBookings(page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.bookings.myList(page, limit),
    queryFn: () => bookingService.getMyBookings(page, limit),
    placeholderData: (prev) => prev, // keep previous data while loading next page
    staleTime: 60_000, // bookings data is fresh for 1 min
  });
}

/**
 * Fetch a single booking by ID.
 */
export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id ?? ''),
    queryFn: () => bookingService.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });
}

/**
 * Fetch booked seat numbers for a route.
 */
export function useBookedSeats(routeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.routes.seats(routeId ?? ''),
    queryFn: () => bookingService.getBookedSeats(routeId!),
    enabled: !!routeId,
    staleTime: 15_000, // seats data goes stale quickly
    refetchInterval: 30_000, // auto-refresh every 30s
  });
}

/**
 * Provider: fetch bookings with filters (paginated).
 */
export function useProviderBookings(params: {
  page?: number;
  status?: string;
  routeId?: string;
  date?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.bookings.providerList(
      params.page ?? 1,
      params.status,
      params.routeId,
      params.date,
    ),
    queryFn: () => bookingService.getProviderBookings(params),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/**
 * Admin: fetch all bookings with filters.
 */
export function useAdminBookings(params: {
  page?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.bookings.adminList(params.page ?? 1, params.status, params.search),
    queryFn: () => bookingService.adminGetAll(params),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a new booking.
 * Automatically invalidates the my-bookings cache on success.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bookingService.create,
    onSuccess: () => {
      // Invalidate pages 1 onwards — user will see the new booking
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success('Booking confirmed successfully!');
    },
    onError: () => {
      // Toast already shown by api.ts interceptor — no double toast needed
    },
  });
}

/**
 * Cancel a booking.
 * Invalidates both the list and the detail cache.
 */
export function useCancelBooking(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      bookingService.cancel(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(bookingId),
      });
      toast.success('Booking cancelled successfully.');
    },
  });
}

/**
 * Lock seats before starting payment flow.
 */
export function useLockSeats() {
  return useMutation({
    mutationFn: bookingService.lockSeats,
  });
}

/**
 * Admin: update booking status.
 */
export function useAdminUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      paymentStatus,
    }: {
      id: string;
      status: string;
      paymentStatus?: string;
    }) => bookingService.adminUpdateStatus(id, status, paymentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success('Booking status updated.');
    },
  });
}
