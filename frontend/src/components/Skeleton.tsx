import React from 'react';

/**
 * Base Skeleton Component
 */
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gray-200 rounded ${className}`}
      style={{ width, height }}
      aria-label="Loading..."
    />
  );
}

/**
 * Card Skeleton
 * Matches route/booking card dimensions
 */
export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Route Card Skeleton
 * Specific for search results
 */
export function RouteCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between">
        {/* Left: Provider */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Center: Route */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-1 w-24" />
          <div>
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Right: Price & Action */}
        <div className="text-right">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Table Row Skeleton
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Text Skeleton
 */
export function TextSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

/**
 * Avatar Skeleton
 */
export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };
  return <Skeleton className={`${sizeClasses[size]} rounded-full`} />;
}

/**
 * Stat Card Skeleton
 */
export function StatCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/**
 * List Skeleton
 * Generic list with multiple items
 */
export function ListSkeleton({ items = 5, ItemComponent = CardSkeleton }: { items?: number; ItemComponent?: React.ComponentType }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <ItemComponent key={i} />
      ))}
    </div>
  );
}

/**
 * Grid Skeleton
 */
export function GridSkeleton({ items = 6, columns = 3 }: { items?: number; columns?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6`}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
