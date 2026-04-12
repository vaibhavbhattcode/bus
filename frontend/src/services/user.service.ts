/**
 * User Service — typed API calls for user profile, wallet, alerts, and preferences.
 */
import { api } from '../lib/api';
import type { PaginatedResponse } from './booking.service';

// ─── Domain Types ───────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  role: 'PASSENGER' | 'PROVIDER' | 'ADMIN';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  alternatePhone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  alternatePhone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface Wallet {
  id: string;
  balance: number;
  totalCredit: number;
  totalDebit: number;
  createdAt: string;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description: string;
  bookingId?: string;
  createdAt: string;
}

export interface PriceAlert {
  id: string;
  type: 'PRICE_DROP' | 'SEAT_AVAILABLE' | 'NEW_ROUTE' | 'DEPARTURE_REMINDER';
  fromCity: string;
  toCity: string;
  targetPrice?: number;
  date?: string;
  status: 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'DISABLED';
  createdAt: string;
  triggeredAt?: string;
}

export interface CreatePriceAlertPayload {
  type: PriceAlert['type'];
  fromCity: string;
  toCity: string;
  targetPrice?: number;
  date?: string;
}

export interface SeatPreference {
  preferredSide?: 'window' | 'aisle' | 'middle';
  preferredRow?: 'front' | 'middle' | 'back';
  avoidLastRow?: boolean;
}

export interface FavoriteRoute {
  id: string;
  fromCity: string;
  toCity: string;
  createdAt: string;
}

export interface UserFeedback {
  id: string;
  type: 'BOOKING' | 'PROVIDER' | 'ROUTE' | 'PLATFORM';
  subject?: string;
  message?: string;
  rating?: number;
  isPublic: boolean;
  adminReply?: string;
  createdAt: string;
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const userService = {
  /** Get the current user's profile. */
  getProfile: () =>
    api.get<UserProfile>('/users/profile'),

  /** Update the current user's profile. */
  updateProfile: (data: UpdateProfilePayload) =>
    api.patch<UserProfile>('/users/profile', data),

  /** Change the current user's password. */
  changePassword: (data: ChangePasswordPayload) =>
    api.patch<{ success: boolean; message: string }>('/users/change-password', data),

  /** Upload a profile photo. */
  uploadPhoto: (formData: FormData) =>
    api.post<{ photoUrl: string }>('/users/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ─── Wallet ────────────────────────────────────────────────────

  /** Get wallet balance and recent transactions. */
  getWallet: (page = 1, limit = 20) =>
    api.get<Wallet>(`/wallet?page=${page}&limit=${limit}`),

  // ─── Price Alerts ──────────────────────────────────────────────

  /** Get the user's price alerts. */
  getPriceAlerts: (page = 1) =>
    api.get<PaginatedResponse<PriceAlert>>(`/alerts?page=${page}`),

  /** Create a new price alert. */
  createPriceAlert: (data: CreatePriceAlertPayload) =>
    api.post<PriceAlert>('/alerts', data),

  /** Delete a price alert. */
  deletePriceAlert: (id: string) =>
    api.delete<{ success: boolean }>(`/alerts/${id}`),

  // ─── Favorite Routes ───────────────────────────────────────────

  /** Get the user's favourite routes. */
  getFavoriteRoutes: () =>
    api.get<FavoriteRoute[]>('/users/favorites'),

  /** Add a route to favourites. */
  addFavoriteRoute: (fromCity: string, toCity: string) =>
    api.post<FavoriteRoute>('/users/favorites', { fromCity, toCity }),

  /** Remove a route from favourites. */
  removeFavoriteRoute: (id: string) =>
    api.delete<{ success: boolean }>(`/users/favorites/${id}`),

  // ─── Seat Preferences ──────────────────────────────────────────

  /** Get smart seat preferences. */
  getSeatPreferences: () =>
    api.get<SeatPreference>('/seat-preferences'),

  /** Update smart seat preferences. */
  updateSeatPreferences: (data: SeatPreference) =>
    api.put<SeatPreference>('/seat-preferences', data),

  // ─── Feedback ──────────────────────────────────────────────────

  /** Get my submitted feedback. */
  getMyFeedback: (page = 1) =>
    api.get<PaginatedResponse<UserFeedback>>(`/feedback/my?page=${page}`),

  /** Submit feedback. */
  submitFeedback: (data: {
    type: UserFeedback['type'];
    subject?: string;
    message?: string;
    rating?: number;
    bookingId?: string;
    providerId?: string;
    routeId?: string;
  }) =>
    api.post<UserFeedback>('/feedback', data),
};
