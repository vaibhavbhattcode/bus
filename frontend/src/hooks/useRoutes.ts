/**
 * useRoutes — React Query hooks for route searching and management.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routeService, SearchRoutesParams } from '../services/route.service';
import { queryKeys } from '../lib/queryKeys';
import toast from 'react-hot-toast';

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Search for available routes.
 * Only fetches when from, to, and date are provided.
 */
export function useSearchRoutes(params: SearchRoutesParams) {
  const enabled = !!(params.from && params.to && params.date);

  return useQuery({
    queryKey: queryKeys.routes.search(params.from, params.to, params.date),
    queryFn: () => routeService.search(params),
    enabled,
    staleTime: 2 * 60_000,   // routes are fresh for 2 minutes
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Get a single route by ID.
 */
export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.routes.detail(id ?? ''),
    queryFn: () => routeService.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });
}

/**
 * Provider: fetch own routes (paginated).
 */
export function useProviderRoutes(page = 1) {
  return useQuery({
    queryKey: queryKeys.routes.providerList(page),
    queryFn: () => routeService.getProviderRoutes(page),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/**
 * Get available and booked seats for a route.
 */
export function useRouteSeats(routeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.routes.seats(routeId ?? ''),
    queryFn: () => routeService.getSeats(routeId!),
    enabled: !!routeId,
    staleTime: 15_000,
    refetchInterval: 30_000, // live seat updates
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: routeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
      toast.success('Route created successfully!');
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof routeService.update>[1] }) =>
      routeService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.detail(id) });
      toast.success('Route updated successfully!');
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: routeService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
      toast.success('Route deleted.');
    },
  });
}

export function useToggleRouteActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      routeService.toggleActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
    },
  });
}
