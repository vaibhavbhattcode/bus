import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import PageLoader from './components/PageLoader';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { SocketProvider } from './context/SocketContext';
import { usePushNotifications } from './hooks/usePushNotifications';

// Lazy load auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const PassengerRegisterPage = lazy(() => import('./pages/auth/PassengerRegisterPage'));
const ProviderRegisterPage = lazy(() => import('./pages/auth/ProviderRegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Lazy load 404 page
const NotFoundPage = lazy(() => import('./pages/passenger/NotFoundPage'));

// Lazy load public pages
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/passenger/AboutPage'));
const ContactPage = lazy(() => import('./pages/passenger/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/passenger/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/passenger/TermsPage'));
const BlogListPage = lazy(() => import('./pages/passenger/BlogListPage'));
const BlogPostPage = lazy(() => import('./pages/passenger/BlogPostPage'));
const CareersPage = lazy(() => import('./pages/passenger/CareersPage'));

// Lazy load passenger pages
const SearchRoutesPage = lazy(() => import('./pages/passenger/SearchRoutesPage'));
const BookingDetailsPage = lazy(() => import('./pages/passenger/BookingDetailsPage'));
const MyBookingsPage = lazy(() => import('./pages/passenger/MyBookingsPage'));
const NewBookingPage = lazy(() => import('./pages/passenger/NewBookingPage'));
const ProfilePage = lazy(() => import('./pages/passenger/ProfilePage'));
const NotificationSettingsPage = lazy(() => import('./pages/passenger/NotificationSettingsPage'));
const WalletPage = lazy(() => import('./pages/passenger/WalletPage'));
const SupportTicketsPage = lazy(() => import('./pages/passenger/SupportTicketsPage'));
const SupportTicketDetailPage = lazy(() => import('./pages/passenger/SupportTicketDetailPage'));
const PriceAlertsPage = lazy(() => import('./pages/passenger/PriceAlertsPage'));
const MyFeedbackPage = lazy(() => import('./pages/passenger/MyFeedbackPage'));

// Lazy load provider pages
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderRoutes = lazy(() => import('./pages/provider/ProviderRoutes'));
const ProviderVehicles = lazy(() => import('./pages/provider/ProviderVehicles'));
const ProviderBookings = lazy(() => import('./pages/provider/ProviderBookings'));
const ProviderReviews = lazy(() => import('./pages/provider/ProviderReviews'));
const ProviderRegistrationPage = lazy(() => import('./pages/provider/ProviderRegistrationPage'));
const ProviderEarnings = lazy(() => import('./pages/provider/ProviderEarnings'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminProviders = lazy(() => import('./pages/admin/AdminProviders'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'));
const AdminPromoCodes = lazy(() => import('./pages/admin/AdminPromoCodes'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminBlogPage = lazy(() => import('./pages/admin/AdminBlogPage').then(module => ({ default: module.AdminBlogPage })));
const AdminDestinations = lazy(() => import('./pages/admin/AdminDestinations'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminAccessLogs = lazy(() => import('./pages/admin/AdminAccessLogs'));

type UserRole = 'PASSENGER' | 'PROVIDER' | 'ADMIN';

function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: UserRole[] }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/** Redirect already-authenticated users away from auth pages */
function GuestRoute({ children }: { children: JSX.Element }) {
  const { user, isAuthenticated } = useAuthStore();

  if (isAuthenticated()) {
    const destination =
      user?.role === 'ADMIN'
        ? '/admin/dashboard'
        : user?.role === 'PROVIDER'
          ? '/provider/dashboard'
          : '/';
    return <Navigate to={destination} replace />;
  }

  return children;
}

function App() {
  const location = useLocation();
  const isAuthenticated = useAuthStore(state => !!state.accessToken);
  usePushNotifications(isAuthenticated);

  return (
    <ErrorBoundary>
      <SocketProvider>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-grow flex flex-col w-full min-h-screen"
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
                <Route path="/register/passenger" element={<GuestRoute><PassengerRegisterPage /></GuestRoute>} />
                <Route path="/register/provider" element={<GuestRoute><ProviderRegisterPage /></GuestRoute>} />
                <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/blog" element={<BlogListPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/careers" element={<CareersPage />} />

                  {/* Passenger Routes */}
                  <Route path="/search" element={<SearchRoutesPage />} />
                  <Route
                    path="/bookings/new"
                    element={
                      <ProtectedRoute>
                        <NewBookingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bookings/:id"
                    element={
                      <ProtectedRoute>
                        <BookingDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-bookings"
                    element={
                      <ProtectedRoute>
                        <MyBookingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/wallet"
                    element={
                      <ProtectedRoute>
                        <WalletPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/support"
                    element={
                      <ProtectedRoute>
                        <SupportTicketsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/support/:id"
                    element={
                      <ProtectedRoute>
                        <SupportTicketDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/price-alerts"
                    element={
                      <ProtectedRoute>
                        <PriceAlertsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-feedback"
                    element={
                      <ProtectedRoute>
                        <MyFeedbackPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Provider Routes */}
                  <Route
                    path="/provider/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/reviews"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderReviews />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/register"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderRegistrationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/routes"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderRoutes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/vehicles"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderVehicles />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/bookings"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/earnings"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderEarnings />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/providers"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminProviders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/bookings"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/support"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminSupport />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/notifications"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminNotifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/promo-codes"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminPromoCodes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/blog"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminBlogPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/feedback"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminFeedback />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/destinations"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDestinations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit-logs"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminAuditLogs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/access-logs"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminAccessLogs />
                      </ProtectedRoute>
                    }
                  />
                  {/* 404 — catch-all for unknown paths */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </SocketProvider>
    </ErrorBoundary >
  );
}

export default App;

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/auth';
import { QueryProvider } from './components/QueryProvider';
import { useNetworkOptimization, useResourcePrefetch } from './hooks/useOptimization';
import Layout from './components/Layout';
import PageLoader from './components/PageLoader';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { SocketProvider } from './context/SocketContext';
import { usePushNotifications } from './hooks/usePushNotifications';

// Lazy load auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const PassengerRegisterPage = lazy(() => import('./pages/auth/PassengerRegisterPage'));
const ProviderRegisterPage = lazy(() => import('./pages/auth/ProviderRegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Lazy load 404 page
const NotFoundPage = lazy(() => import('./pages/passenger/NotFoundPage'));

// Lazy load public pages
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/passenger/AboutPage'));
const ContactPage = lazy(() => import('./pages/passenger/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/passenger/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/passenger/TermsPage'));
const BlogListPage = lazy(() => import('./pages/passenger/BlogListPage'));
const BlogPostPage = lazy(() => import('./pages/passenger/BlogPostPage'));
const CareersPage = lazy(() => import('./pages/passenger/CareersPage'));

// Lazy load passenger pages
const SearchRoutesPage = lazy(() => import('./pages/passenger/SearchRoutesPage'));
const BookingDetailsPage = lazy(() => import('./pages/passenger/BookingDetailsPage'));
const MyBookingsPage = lazy(() => import('./pages/passenger/MyBookingsPage'));
const NewBookingPage = lazy(() => import('./pages/passenger/NewBookingPage'));
const ProfilePage = lazy(() => import('./pages/passenger/ProfilePage'));
const NotificationSettingsPage = lazy(() => import('./pages/passenger/NotificationSettingsPage'));
const WalletPage = lazy(() => import('./pages/passenger/WalletPage'));
const SupportTicketsPage = lazy(() => import('./pages/passenger/SupportTicketsPage'));
const SupportTicketDetailPage = lazy(() => import('./pages/passenger/SupportTicketDetailPage'));
const PriceAlertsPage = lazy(() => import('./pages/passenger/PriceAlertsPage'));
const MyFeedbackPage = lazy(() => import('./pages/passenger/MyFeedbackPage'));

// Lazy load provider pages
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderRoutes = lazy(() => import('./pages/provider/ProviderRoutes'));
const ProviderVehicles = lazy(() => import('./pages/provider/ProviderVehicles'));
const ProviderBookings = lazy(() => import('./pages/provider/ProviderBookings'));
const ProviderReviews = lazy(() => import('./pages/provider/ProviderReviews'));
const ProviderRegistrationPage = lazy(() => import('./pages/provider/ProviderRegistrationPage'));
const ProviderEarnings = lazy(() => import('./pages/provider/ProviderEarnings'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminProviders = lazy(() => import('./pages/admin/AdminProviders'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'));
const AdminPromoCodes = lazy(() => import('./pages/admin/AdminPromoCodes'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminBlogPage = lazy(() => import('./pages/admin/AdminBlogPage').then(module => ({ default: module.AdminBlogPage })));
const AdminDestinations = lazy(() => import('./pages/admin/AdminDestinations'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminAccessLogs = lazy(() => import('./pages/admin/AdminAccessLogs'));

type UserRole = 'PASSENGER' | 'PROVIDER' | 'ADMIN';

function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: UserRole[] }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/** Redirect already-authenticated users away from auth pages */
function GuestRoute({ children }: { children: JSX.Element }) {
  const { user, isAuthenticated } = useAuthStore();

  if (isAuthenticated()) {
    const destination =
      user?.role === 'ADMIN'
        ? '/admin/dashboard'
        : user?.role === 'PROVIDER'
          ? '/provider/dashboard'
          : '/';
    return <Navigate to={destination} replace />;
  }

  return children;
}

function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  
  // Enable network optimizations
  useNetworkOptimization();
  useResourcePrefetch();

  // Initialize push notifications
  usePushNotifications(isAuthenticated);

  return (
    <ErrorBoundary>
      <SocketProvider>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-grow flex flex-col w-full min-h-screen"
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
                <Route path="/register/passenger" element={<GuestRoute><PassengerRegisterPage /></GuestRoute>} />
                <Route path="/register/provider" element={<GuestRoute><ProviderRegisterPage /></GuestRoute>} />
                <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/blog" element={<BlogListPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/careers" element={<CareersPage />} />

                  {/* Passenger Routes */}
                  <Route path="/search" element={<SearchRoutesPage />} />
                  <Route
                    path="/bookings/new"
                    element={
                      <ProtectedRoute>
                        <NewBookingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bookings/:id"
                    element={
                      <ProtectedRoute>
                        <BookingDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-bookings"
                    element={
                      <ProtectedRoute>
                        <MyBookingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/wallet"
                    element={
                      <ProtectedRoute>
                        <WalletPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/support"
                    element={
                      <ProtectedRoute>
                        <SupportTicketsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/support/:id"
                    element={
                      <ProtectedRoute>
                        <SupportTicketDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/price-alerts"
                    element={
                      <ProtectedRoute>
                        <PriceAlertsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-feedback"
                    element={
                      <ProtectedRoute>
                        <MyFeedbackPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Provider Routes */}
                  <Route
                    path="/provider/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/reviews"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderReviews />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/register"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderRegistrationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/routes"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderRoutes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/vehicles"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderVehicles />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/bookings"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/earnings"
                    element={
                      <ProtectedRoute allowedRoles={['PROVIDER']}>
                        <ProviderEarnings />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/providers"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminProviders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/bookings"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/support"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminSupport />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/notifications"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminNotifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/promo-codes"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminPromoCodes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/blog"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminBlogPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/feedback"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminFeedback />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/destinations"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminDestinations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit-logs"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminAuditLogs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/access-logs"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminAccessLogs />
                      </ProtectedRoute>
                    }
                  />
                  {/* 404 — catch-all for unknown paths */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </SocketProvider>
    </ErrorBoundary >
  );
}

export default App;
