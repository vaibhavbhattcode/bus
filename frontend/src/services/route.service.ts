/**
 * Route Service — typed API calls for searching and managing bus routes.
 */
import { api } from '../lib/api';
import type { PaginatedResponse } from './booking.service';

// ─── Domain Types ───────────────────────────────────────────────────────────

export interface RouteVehicle {
  id: string;
  name: string;
  type: 'BUS' | 'TEMPO' | 'TRAVELLER';
  registrationNumber: string;
  totalSeats: number;
  seatLayout: string;
  amenities: string[];
  provider: {
    id: string;
    companyName: string;
    rating: number;
    totalReviews: number;
    contactPhone?: string;
  };
}

export interface RouteItem {
  id: string;
  fromCity: string;
  toCity: string;
  intermediateStops: string[];
  date: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime?: string;
  price: number;
  availableSeats: number;
  totalSeats: number;
  isActive: boolean;
  createdAt: string;
  vehicle: RouteVehicle;
}

export interface SearchRoutesParams {
  from: string;
  to: string;
  date: string;
  seats?: number;
  minPrice?: number;
  maxPrice?: number;
  vehicleType?: string;
  sortBy?: 'price' | 'departure' | 'seats' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateRoutePayload {
  vehicleId: string;
  fromCity: string;
  toCity: string;
  intermediateStops?: string[];
  date: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime?: string;
  price: number;
  totalSeats: number;
}

export interface UpdateRoutePayload extends Partial<CreateRoutePayload> {
  isActive?: boolean;
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const routeService = {
  /** Search available routes. */
  search: (params: SearchRoutesParams) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') query.set(key, String(val));
    });
    return api.get<PaginatedResponse<RouteItem>>(`/routes/search?${query.toString()}`);
  },

  /** Get a single route by ID. */
  getById: (id: string) =>
    api.get<RouteItem>(`/routes/${id}`),

  /** Get available seat numbers for a route. */
  getSeats: (routeId: string) =>
    api.get<{ seatLayout: string; bookedSeats: string[]; lockedSeats: string[] }>(
      `/routes/${routeId}/seats`,
    ),

  // ─── Provider ────────────────────────────────────────────────────

  /** Provider: list own routes (paginated). */
  getProviderRoutes: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<RouteItem>>(
      `/routes/provider?page=${page}&limit=${limit}`,
    ),

  /** Provider: create a new route. */
  create: (data: CreateRoutePayload) =>
    api.post<RouteItem>('/routes', data),

  /** Provider: update a route. */
  update: (id: string, data: UpdateRoutePayload) =>
    api.patch<RouteItem>(`/routes/${id}`, data),

  /** Provider: soft-delete a route. */
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/routes/${id}`),

  /** Provider: toggle route active status. */
  toggleActive: (id: string, isActive: boolean) =>
    api.patch<RouteItem>(`/routes/${id}/toggle`, { isActive }),
};
