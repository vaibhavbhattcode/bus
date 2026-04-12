import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

/**
 * Consistent Spinner Component
 * Used across the app for loading states
 */
export function Spinner({ size = 'md', className = '', label }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-primary-600 ${className}`}
        aria-label={label || 'Loading'}
      />
      {label && (
        <p className="text-sm text-gray-500 font-medium">{label}</p>
      )}
    </div>
  );
}

/**
 * Full Page Spinner
 * Used for page-level loading states
 */
export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-700">{label}</p>
      </div>
    </div>
  );
}

/**
 * Button Spinner
 * Used inside buttons during loading state
 */
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <Loader2 className={`h-4 w-4 animate-spin ${className}`} />
  );
}

/**
 * Inline Spinner
 * Small spinner for inline loading indicators
 */
export function InlineSpinner({ className = '' }: { className?: string }) {
  return (
    <Loader2 className={`h-4 w-4 animate-spin text-gray-400 ${className}`} />
  );
}
