/**
 * Typed query key factory — single source of truth for all React Query cache keys.
 * This prevents key mismatches between useQuery and queryClient.invalidateQueries.
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.bookings.myList(1), ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
 */

export const queryKeys = {
  // ─── Auth ────────────────────────────────────────────────────────
  auth: {
    me: ['auth', 'me'] as const,
  },

  // ─── Bookings ────────────────────────────────────────────────────
  bookings: {
    all: ['bookings'] as const,
    myList: (page: number, limit?: number) =>
      ['bookings', 'my', page, limit] as const,
    providerList: (page: number, status?: string, routeId?: string, date?: string) =>
      ['bookings', 'provider', page, status, routeId, date] as const,
    adminList: (page: number, status?: string, search?: string) =>
      ['bookings', 'admin', page, status, search] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
  },

  // ─── Routes ──────────────────────────────────────────────────────
  routes: {
    all: ['routes'] as const,
    search: (from: string, to: string, date: string) =>
      ['routes', 'search', from, to, date] as const,
    providerList: (page: number) => ['routes', 'provider', page] as const,
    detail: (id: string) => ['routes', 'detail', id] as const,
    seats: (routeId: string) => ['routes', 'seats', routeId] as const,
  },

  // ─── Providers ───────────────────────────────────────────────────
  providers: {
    all: ['providers'] as const,
    profile: ['providers', 'profile'] as const,
    adminList: (page: number, status?: string, search?: string) =>
      ['providers', 'admin', page, status, search] as const,
    vehicles: (page: number) => ['providers', 'vehicles', page] as const,
    earnings: (period?: string) => ['providers', 'earnings', period] as const,
    reviews: (page: number) => ['providers', 'reviews', page] as const,
  },

  // ─── Users ───────────────────────────────────────────────────────
  users: {
    all: ['users'] as const,
    profile: ['users', 'profile'] as const,
    adminList: (page: number, search?: string, role?: string) =>
      ['users', 'admin', page, search, role] as const,
    wallet: ['users', 'wallet'] as const,
    priceAlerts: (page: number) => ['users', 'price-alerts', page] as const,
    favoriteRoutes: ['users', 'favorite-routes'] as const,
    seatPreferences: ['users', 'seat-preferences'] as const,
    feedback: (page: number) => ['users', 'feedback', page] as const,
  },

  // ─── Notifications ───────────────────────────────────────────────
  notifications: {
    list: (page: number) => ['notifications', page] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },

  // ─── Support ─────────────────────────────────────────────────────
  support: {
    all: ['support'] as const,
    myList: (page: number) => ['support', 'my', page] as const,
    adminList: (page: number, status?: string) =>
      ['support', 'admin', page, status] as const,
    detail: (id: string) => ['support', 'detail', id] as const,
  },

  // ─── Admin ───────────────────────────────────────────────────────
  admin: {
    dashboard: ['admin', 'dashboard'] as const,
    analytics: (period?: string) => ['admin', 'analytics', period] as const,
    auditLogs: (page: number) => ['admin', 'audit-logs', page] as const,
    accessLogs: (page: number) => ['admin', 'access-logs', page] as const,
    settings: ['admin', 'settings'] as const,
    promoCodes: (page: number) => ['admin', 'promo-codes', page] as const,
    feedback: (page: number, type?: string) =>
      ['admin', 'feedback', page, type] as const,
  },

  // ─── Destinations ────────────────────────────────────────────────
  destinations: {
    all: ['destinations'] as const,
    active: ['destinations', 'active'] as const,
  },

  // ─── Blog ────────────────────────────────────────────────────────
  blog: {
    all: ['blog'] as const,
    list: (page: number) => ['blog', 'list', page] as const,
    post: (slug: string) => ['blog', 'post', slug] as const,
    adminList: (page: number, published?: boolean) =>
      ['blog', 'admin', page, published] as const,
  },

  // ─── Promo Codes ─────────────────────────────────────────────────
  promoCodes: {
    validate: (code: string) => ['promo-codes', 'validate', code] as const,
  },

  // ─── Tracking ────────────────────────────────────────────────────
  tracking: {
    route: (routeId: string) => ['tracking', 'route', routeId] as const,
  },
} as const;
