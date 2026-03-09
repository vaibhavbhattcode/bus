import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'prisma-client-custom';
import { SendNotificationDto } from './dto/send-notification.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) { }

  // ─── Notifications ────────────────────────────────────────────────────────
  @Post('notifications/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send custom notification to users' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  sendNotification(@Body() dto: SendNotificationDto) {
    this.logger.log(`Sending notification: type=${dto.recipientType}, title="${dto.title}"`);
    return this.adminService.sendCustomNotification(dto);
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics with growth metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats with today, yesterday, and 30-day comparisons' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Analytics ────────────────────────────────────────────────────────────
  @Get('analytics')
  @ApiOperation({ summary: 'Get comprehensive analytics summary' })
  @ApiQuery({ name: 'start', required: false, description: 'Start date (ISO string)', example: '2026-01-01' })
  @ApiQuery({ name: 'end', required: false, description: 'End date (ISO string)', example: '2026-02-24' })
  @ApiQuery({ name: 'fromCity', required: false, description: 'Filter by origin city' })
  @ApiQuery({ name: 'toCity', required: false, description: 'Filter by destination city' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Filter by provider UUID' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'], description: 'Group trend data' })
  @ApiResponse({ status: 200, description: 'Analytics summary with trends, top routes, providers, and feedback' })
  getAnalytics(@Query() query: any) {
    return this.adminService.getAnalyticsSummary(query);
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue analytics with trend data' })
  @ApiQuery({ name: 'start', required: false, description: 'Start date' })
  @ApiQuery({ name: 'end', required: false, description: 'End date' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Revenue trend, totals, and transaction count' })
  getRevenueAnalytics(@Query() query: any) {
    return this.adminService.getRevenueAnalytics(query);
  }

  @Get('analytics/bookings')
  @ApiOperation({ summary: 'Get booking analytics with status distribution' })
  @ApiQuery({ name: 'start', required: false, description: 'Start date' })
  @ApiQuery({ name: 'end', required: false, description: 'End date' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Booking trends and status distribution' })
  getBookingAnalytics(@Query() query: any) {
    return this.adminService.getBookingAnalytics(query);
  }

  @Get('analytics/growth')
  @ApiOperation({ summary: 'Get month-over-month growth metrics' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to look back (default: 6)', example: 6 })
  @ApiResponse({ status: 200, description: 'Monthly growth data for users, bookings, revenue, and providers' })
  getGrowthMetrics(@Query() query: any) {
    return this.adminService.getGrowthMetrics(query);
  }

  // ─── Users ────────────────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Get all users with filtering, search, and pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 100)', example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or phone' })
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'PROVIDER', 'PASSENGER'] })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter users created after this date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter users created before this date' })
  @ApiResponse({ status: 200, description: 'Paginated list of users with booking counts' })
  getUsers(@Query() query) {
    return this.adminService.findAllUsers(query);
  }

  @Get('users/stats')
  @ApiOperation({ summary: 'Get user statistics (totals by role, active/inactive)' })
  @ApiResponse({ status: 200, description: 'User count breakdown' })
  getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details with booking count and provider info' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('users/:id/analytics')
  @ApiOperation({ summary: 'Get analytics for a specific user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User booking history, spending patterns, and top routes' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserAnalytics(@Param('id') id: string) {
    return this.adminService.getUserAnalytics(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Toggle user active status' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiBody({ schema: { properties: { isActive: { type: 'boolean' } }, required: ['isActive'] } })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate admin users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    this.logger.log(`Updating user status: ${id} → isActive=${isActive}`);
    return this.adminService.updateUserStatus(id, isActive);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiBody({ schema: { properties: { role: { type: 'string', enum: ['ADMIN', 'PROVIDER', 'PASSENGER'] } }, required: ['role'] } })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 400, description: 'Cannot change own role or demote admin' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @Request() req,
  ) {
    this.logger.log(`Updating user role: ${id} → ${role}`);
    return this.adminService.updateUserRole(id, role, req.user.id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user permanently' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete self or admin users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id') id: string, @Request() req) {
    this.logger.warn(`Deleting user: ${id} by admin: ${req.user.id}`);
    return this.adminService.deleteUser(id, req.user.id);
  }

  // ─── Providers ────────────────────────────────────────────────────────────
  @Get('providers')
  @ApiOperation({ summary: 'Get all providers with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by company name, phone, city, user name, or email' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'] })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated providers with booking stats and ratings' })
  getProviders(@Query() query) {
    return this.adminService.findAllProviders(query);
  }

  @Get('providers/stats')
  @ApiOperation({ summary: 'Get provider statistics by status' })
  @ApiResponse({ status: 200, description: 'Provider counts: total, verified, pending, rejected, suspended' })
  getProviderStats() {
    return this.adminService.getProviderStats();
  }

  @Get('providers/pending')
  @ApiOperation({ summary: 'Get all providers awaiting verification' })
  @ApiResponse({ status: 200, description: 'List of pending providers with user details' })
  getPendingProviders() {
    return this.adminService.getPendingProviders();
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get a single provider by ID' })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider details with user info and vehicle count' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  getProviderById(@Param('id') id: string) {
    return this.adminService.getProviderById(id);
  }

  @Get('providers/:id/analytics')
  @ApiOperation({ summary: 'Get analytics for a specific provider' })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider revenue, booking stats, top routes, and monthly trends' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  getProviderAnalytics(@Param('id') id: string) {
    return this.adminService.getProviderAnalytics(id);
  }

  @Put('providers/:id/verify')
  @ApiOperation({ summary: 'Verify a pending provider' })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider verified successfully — notification sent' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  verifyProvider(@Request() req, @Param('id') id: string) {
    this.logger.log(`Verifying provider: ${id} by admin: ${req.user.id}`);
    return this.adminService.verifyProvider(id, req.user.id);
  }

  @Put('providers/:id/reject')
  @ApiOperation({ summary: 'Reject a pending provider' })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider rejected — notification sent' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  rejectProvider(@Param('id') id: string) {
    this.logger.log(`Rejecting provider: ${id}`);
    return this.adminService.rejectProvider(id);
  }

  @Put('providers/:id/suspend')
  @ApiOperation({ summary: 'Suspend an active provider' })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider suspended — notification sent' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  suspendProvider(@Param('id') id: string) {
    this.logger.warn(`Suspending provider: ${id}`);
    return this.adminService.suspendProvider(id);
  }

  @Put('providers/:id/activate')
  @ApiOperation({ summary: 'Re-activate a suspended provider' })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider re-activated — notification sent' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  activateProvider(@Param('id') id: string) {
    this.logger.log(`Activating provider: ${id}`);
    return this.adminService.activateProvider(id);
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────
  @Get('bookings')
  @ApiOperation({ summary: 'Get all bookings with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Search by passenger name, booking ID, or route city' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter bookings from this date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter bookings until this date' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated bookings with user and route details' })
  getBookings(@Query() query) {
    return this.adminService.findAllBookings(query);
  }

  @Get('bookings/stats')
  @ApiOperation({ summary: 'Get booking statistics for a date range' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Booking counts by status, revenue, conversion rate' })
  getBookingStats(@Query() query) {
    return this.adminService.getBookingStats(query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get a single booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Full booking details with user, route, vehicle, and provider info' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  getBookingById(@Param('id') id: string) {
    return this.adminService.getBookingById(id);
  }

  @Patch('bookings/:id/status')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Booking status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  updateBookingStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    this.logger.log(`Updating booking status: ${id} → ${status}`);
    return this.adminService.updateBookingStatus(id, status, req.user.id);
  }

  // ─── Overview / Summary ───────────────────────────────────────────────────
  @Get('overview')
  @ApiOperation({ summary: 'Get system-wide overview with cached stats' })
  @ApiResponse({ status: 200, description: 'Platform overview: users, providers, bookings, revenue, alerts, and avgRating' })
  getOverview() {
    return this.adminService.getSystemOverview();
  }

  // ─── Auditing and Settings ──────────────────────────────────────────────────
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get system audit logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  getAuditLogs(@Query() query) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('access-logs')
  @ApiOperation({ summary: 'Get system access logs (API Traffic)' })
  getAccessLogs(@Query() query) {
    return this.adminService.getAccessLogs(query);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get global system settings' })
  getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Put('settings/:key')
  @ApiOperation({ summary: 'Update a global system setting' })
  @ApiParam({ name: 'key', description: 'Setting Key (e.g. PLATFORM_FEE_PERCENTAGE)' })
  @ApiBody({ schema: { properties: { value: { type: 'object' }, description: { type: 'string' } }, required: ['value'] } })
  updateSystemSetting(
    @Param('key') key: string,
    @Body('value') value: any,
    @Body('description') description: string,
    @Request() req
  ) {
    this.logger.log(`Updating system setting: ${key} by admin ${req.user.id}`);
    return this.adminService.updateSystemSetting(key, value, description, req.user.id);
  }
}
