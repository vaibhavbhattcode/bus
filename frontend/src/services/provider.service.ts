/**
 * Provider Service — typed API calls for provider dashboard, vehicles, routes, earnings.
 */
import { api } from '../lib/api';
import type { PaginatedResponse } from './booking.service';

// ─── Domain Types ───────────────────────────────────────────────────────────

export interface ProviderProfile {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  rating: number;
  totalReviews: number;
  verifiedAt?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  providerId: string;
  type: 'BUS' | 'TEMPO' | 'TRAVELLER';
  name: string;
  registrationNumber: string;
  totalSeats: number;
  seatLayout: string;
  amenities: string[];
  isActive: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehiclePayload {
  type: Vehicle['type'];
  name: string;
  registrationNumber: string;
  totalSeats: number;
  seatLayout?: string;
  amenities?: string[];
}

export interface UpdateVehiclePayload extends Partial<CreateVehiclePayload> {
  isActive?: boolean;
}

export interface ProviderDashboardStats {
  totalRoutes: number;
  activeRoutes: number;
  totalBookings: number;
  pendingBookings: number;
  todayEarnings: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
}

export interface EarningsPeriod {
  daily: { date: string; amount: number }[];
  weekly: { week: string; amount: number }[];
  monthly: { month: string; amount: number }[];
  total: number;
}

export interface ProviderReview {
  id: string;
  rating: number;
  type: string;
  subject?: string;
  message?: string;
  isPublic: boolean;
  createdAt: string;
  user: { name: string };
  route?: { fromCity: string; toCity: string };
}

export interface RegisterProviderPayload {
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const providerService = {
  /** Get the current provider's profile. */
  getProfile: () =>
    api.get<ProviderProfile>('/providers/profile'),

  /** Register as a provider (for existing PROVIDER role users). */
  register: (data: RegisterProviderPayload) =>
    api.post<ProviderProfile>('/providers/register', data),

  /** Update provider profile. */
  updateProfile: (data: Partial<RegisterProviderPayload>) =>
    api.patch<ProviderProfile>('/providers/profile', data),

  /** Get dashboard statistics. */
  getDashboardStats: () =>
    api.get<ProviderDashboardStats>('/providers/dashboard/stats'),

  // ─── Vehicles ──────────────────────────────────────────────────

  /** Get all vehicles for the current provider. */
  getVehicles: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<Vehicle>>(`/providers/vehicles?page=${page}&limit=${limit}`),

  /** Add a vehicle. */
  createVehicle: (data: CreateVehiclePayload) =>
    api.post<Vehicle>('/providers/vehicles', data),

  /** Update a vehicle. */
  updateVehicle: (id: string, data: UpdateVehiclePayload) =>
    api.patch<Vehicle>(`/providers/vehicles/${id}`, data),

  /** Soft-delete a vehicle. */
  deleteVehicle: (id: string) =>
    api.delete<{ success: boolean }>(`/providers/vehicles/${id}`),

  // ─── Earnings ──────────────────────────────────────────────────

  /** Get earnings data (daily/weekly/monthly). */
  getEarnings: (period?: 'week' | 'month' | 'year') =>
    api.get<EarningsPeriod>(`/providers/earnings${period ? `?period=${period}` : ''}`),

  // ─── Reviews ───────────────────────────────────────────────────

  /** Get reviews for the current provider. */
  getReviews: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<ProviderReview>>(
      `/providers/reviews?page=${page}&limit=${limit}`,
    ),

  // ─── Document Upload ───────────────────────────────────────────

  /** Upload verification document (idProof, rcDocuments, permit). */
  uploadDocument: (type: 'idProof' | 'rcDocuments' | 'permit', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post<{ url: string }>('/providers/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
