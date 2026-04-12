import React from 'react';
import { 
  Search, 
  Calendar, 
  Ticket, 
  AlertCircle, 
  Inbox, 
  MapPin,
  Bus,
  Wallet,
  Bell,
  FileText,
  LucideIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

/**
 * Generic Empty State Component
 */
export function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action,
  className = '' 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="mb-6 p-4 bg-gray-100 rounded-full">
        <Icon className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link to={action.href} className="btn btn-primary">
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className="btn btn-primary">
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

/**
 * No Search Results
 */
export function NoSearchResults({ onReset }: { onReset?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No routes found"
      description="We couldn't find any routes matching your search. Try adjusting your filters or search for a different route."
      action={onReset ? { label: 'Clear Filters', onClick: onReset } : undefined}
    />
  );
}

/**
 * No Bookings
 */
export function NoBookings({ type = 'all' }: { type?: 'all' | 'upcoming' | 'completed' | 'cancelled' }) {
  const messages = {
    all: {
      title: 'No bookings yet',
      description: 'Start your journey by searching and booking your first bus ticket.',
      action: { label: 'Search Routes', href: '/search' },
    },
    upcoming: {
      title: 'No upcoming trips',
      description: 'You don\'t have any upcoming trips. Book a ticket to see it here.',
      action: { label: 'Book Now', href: '/search' },
    },
    completed: {
      title: 'No completed trips',
      description: 'Your completed trips will appear here once you\'ve traveled.',
    },
    cancelled: {
      title: 'No cancelled bookings',
      description: 'You haven\'t cancelled any bookings yet.',
    },
  };

  const config = messages[type];

  return (
    <EmptyState
      icon={Ticket}
      title={config.title}
      description={config.description}
      action={config.action}
    />
  );
}

/**
 * No Routes (Provider)
 */
export function NoRoutes() {
  return (
    <EmptyState
      icon={MapPin}
      title="No routes added yet"
      description="Start by adding your first route. Define the origin, destination, schedule, and pricing."
      action={{ label: 'Add Route', onClick: () => {} }}
    />
  );
}

/**
 * No Vehicles (Provider)
 */
export function NoVehicles() {
  return (
    <EmptyState
      icon={Bus}
      title="No vehicles registered"
      description="Add your first vehicle to start creating routes and accepting bookings."
      action={{ label: 'Add Vehicle', onClick: () => {} }}
    />
  );
}

/**
 * No Transactions (Wallet)
 */
export function NoTransactions() {
  return (
    <EmptyState
      icon={Wallet}
      title="No transactions yet"
      description="Your wallet transaction history will appear here once you add money or make payments."
    />
  );
}

/**
 * No Notifications
 */
export function NoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="You're all caught up!"
      description="No new notifications at the moment. We'll notify you about important updates."
    />
  );
}

/**
 * Error State
 */
export function ErrorState({ 
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content. Please try again.',
  onRetry 
}: { 
  title?: string; 
  description?: string; 
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
}

/**
 * Network Error State
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6">
        <svg className="h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No internet connection</h3>
      <p className="text-gray-500 max-w-md mb-6">
        Please check your internet connection and try again.
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * 404 Not Found
 */
export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-9xl font-black text-gray-200 mb-4">404</h1>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Page not found</h2>
      <p className="text-gray-500 max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link to="/" className="btn btn-primary">
          Go Home
        </Link>
        <button onClick={() => window.history.back()} className="btn btn-secondary">
          Go Back
        </button>
      </div>
    </div>
  );
}

/**
 * Access Denied (403)
 */
export function AccessDenied() {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Access Denied"
      description="You don't have permission to access this page. Please contact support if you believe this is an error."
      action={{ label: 'Go Home', href: '/' }}
    />
  );
}
