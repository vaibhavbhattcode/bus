/**
 * Services barrel export — import all services from a single entry point.
 *
 * Usage:
 *   import { bookingService, userService, adminService } from '../services';
 */

export { authService } from './auth.service';
export type {
  LoginPayload,
  RegisterPassengerPayload,
  RegisterProviderPayload,
  AuthUser,
  LoginResponse,
} from './auth.service';

export { bookingService } from './booking.service';
export type {
  BookingListItem,
  BookingDetail,
  CreateBookingPayload,
  PaginatedResponse,
  PaginationMeta,
  SeatLockPayload,
} from './booking.service';

export { routeService } from './route.service';
export type {
  RouteItem,
  RouteVehicle,
  SearchRoutesParams,
  CreateRoutePayload,
  UpdateRoutePayload,
} from './route.service';

export { userService } from './user.service';
export type {
  UserProfile,
  UpdateProfilePayload,
  Wallet,
  WalletTransaction,
  PriceAlert,
  SeatPreference,
  FavoriteRoute,
  UserFeedback,
} from './user.service';

export { providerService } from './provider.service';
export type {
  ProviderProfile,
  Vehicle,
  CreateVehiclePayload,
  ProviderDashboardStats,
} from './provider.service';

export { adminService } from './admin.service';
export type {
  AdminDashboardStats,
  AdminUser,
  AdminProvider,
  AuditLog,
  AccessLog,
  AdminPromoCode,
  CreatePromoCodePayload,
} from './admin.service';

export { notificationService } from './notification.service';
export type { Notification } from './notification.service';

export { supportService } from './support.service';
export type {
  SupportTicket,
  TicketReply,
  CreateTicketPayload,
} from './support.service';
