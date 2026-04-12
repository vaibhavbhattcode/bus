/**
 * Booking Service — typed API calls for all booking-related endpoints.
 */
import { api } from '../lib/api';

// ─── Shared Types ───────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Domain Types ───────────────────────────────────────────────────────────

export interface BookingRoute {
  id: string;
  fromCity: string;
  toCity: string;
  date: string;
  departureTime: string;
  arrivalTime?: string;
  price: number;
  vehicle: {
    id: string;
    name: string;
    type: string;
    registrationNumber?: string;
    totalSeats?: number;
    seatLayout?: string;
    amenities?: string[];
    provider: {
      id: string;
      companyName: string;
      rating: number;
      contactPhone?: string;
      contactName?: string;
    };
  };
}

export interface BookingListItem {
  id: string;
  seats: number;
  seatNumbers: string[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  hasInsurance: boolean;
  passengerName: string;
  passengerPhone: string;
  refundAmount?: number;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  route: BookingRoute;
}

export interface BookingDetail extends BookingListItem {
  paymentId?: string;
  passengerEmail?: string;
  passengerAge?: number;
  passengerGender?: string;
  pickupLocation?: string;
  dropLocation?: string;
  cancellationReason?: string;
  insuranceAmount?: number;
  user?: {
    id: string;
    name: string;
    email?: string;
    phone: string;
  };
}

export interface CreateBookingPayload {
  routeId: string;
  seats: number;
  seatNumbers: string[];
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  passengerAge?: number;
  passengerGender?: string;
  pickupLocation?: string;
  dropLocation?: string;
  promoCodeId?: string;
  hasInsurance?: boolean;
  paymentMethod?: 'online' | 'pay_later' | 'wallet';
}

export interface SeatLockPayload {
  routeId: string;
  seatNumbers: string[];
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const bookingService = {
  /** Create a new booking. */
  create: (data: CreateBookingPayload) =>
    api.post<BookingDetail>('/bookings', data),

  /** Get the authenticated user's bookings (paginated). */
  getMyBookings: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<BookingListItem>>(
      `/bookings/my?page=${page}&limit=${limit}`,
    ),

  /** Get a single booking by ID. */
  getById: (id: string) =>
    api.get<BookingDetail>(`/bookings/${id}`),

  /** Cancel a booking with a reason. */
  cancel: (id: string, reason: string) =>
    api.patch<BookingDetail>(`/bookings/${id}/cancel`, { reason }),

  /** Download ticket PDF as a blob. */
  downloadTicket: (id: string) =>
    api.get<Blob>(`/bookings/${id}/ticket`, { responseType: 'blob' }),

  /** Lock seats before payment (prevents concurrent selection). */
  lockSeats: (data: SeatLockPayload) =>
    api.post<{ success: boolean; expiresAt: string }>('/bookings/lock-seats', data),

  /** Release seat locks. */
  unlockSeats: (data: SeatLockPayload) =>
    api.post<{ success: boolean }>('/bookings/unlock-seats', data),

  /** Get booked seat numbers for a route. */
  getBookedSeats: (routeId: string) =>
    api.get<{ seatNumbers: string[] }>(`/bookings/route/${routeId}/seats`),

  // ─── Provider ────────────────────────────────────────────────────

  /** Get provider's bookings (paginated, with filters). */
  getProviderBookings: (params: {
    page?: number;
    limit?: number;
    status?: string;
    routeId?: string;
    date?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') query.set(key, String(val));
    });
    return api.get<PaginatedResponse<BookingDetail>>(
      `/bookings/provider?${query.toString()}`,
    );
  },

  // ─── Admin ───────────────────────────────────────────────────────

  /** Admin: get all bookings (paginated, with filters). */
  adminGetAll: (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') query.set(key, String(val));
    });
    return api.get<PaginatedResponse<BookingDetail>>(
      `/admin/bookings?${query.toString()}`,
    );
  },

  /** Admin: update booking status. */
  adminUpdateStatus: (id: string, status: string, paymentStatus?: string) =>
    api.patch<BookingDetail>(`/admin/bookings/${id}/status`, {
      status,
      paymentStatus,
    }),
};
