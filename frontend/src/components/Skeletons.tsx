import React from 'react';

// Card Skeleton
export const CardSkeleton: React.FC = () => (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
        </td>
        <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
        </td>
        <td className="px-6  py-4">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
        </td>
        <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
        </td>
    </tr>
);

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
    </div>
);

// Dashboard Card Skeleton
export const DashboardCardSkeleton: React.FC = () => (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-gray-200 rounded w-24"></div>
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-8 bg-gray-300 rounded w-20 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-32"></div>
    </div>
);

// Booking Card Skeleton
export const BookingCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
        </div>
        <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
        </div>
    </div>
);

// Route Card Skeleton
export const RouteCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
        <div className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-40 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
                <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
            </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
    <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
        <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-10 bg-gray-100 rounded"></div>
                </div>
            ))}
        </div>
    </div>
);

// Grid Skeleton
interface GridSkeletonProps {
    items?: number;
    component?: React.FC;
    columns?: 1 | 2 | 3 | 4;
}

export const GridSkeleton: React.FC<GridSkeletonProps> = ({
    items = 6,
    component: Component = CardSkeleton,
    columns = 3
}) => {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={`grid ${gridCols[columns]} gap-6`}>
            {[...Array(items)].map((_, index) => (
                <Component key={index} />
            ))}
        </div>
    );
};

// Page Loading Skeleton
export const PageLoadingSkeleton: React.FC = () => (
    <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <DashboardCardSkeleton key={i} />
                ))}
            </div>

            {/* Content Grid */}
            <GridSkeleton items={6} columns={3} />
        </div>
    </div>
);
