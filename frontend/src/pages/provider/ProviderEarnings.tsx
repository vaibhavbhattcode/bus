import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import SEO from '../../components/SEO';
import {
    TrendingUp, DollarSign, Route, BarChart2,
    Loader2, Calendar, ChevronDown, ArrowUpRight
} from 'lucide-react';

interface EarningsReport {
    totalRevenue: number;
    commission: number;
    netEarnings: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    routes: RoutePerformance[];
}

interface RoutePerformance {
    routeId: string;
    from: string;
    to: string;
    totalBookings: number;
    revenue: number;
    netEarnings: number;
    occupancyRate: number;
    cancellationRate: number;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function ProviderEarnings() {
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    const { data: report, isLoading } = useQuery<EarningsReport>({
        queryKey: ['provider-earnings', period],
        queryFn: () => api.get(`/reports/provider/earnings?period=${period}`),
    });

    const stats = [
        {
            label: 'Total Revenue',
            value: report ? formatCurrency(report.totalRevenue) : '—',
            icon: DollarSign,
            color: 'from-blue-500 to-indigo-600',
            bg: 'bg-blue-50',
            text: 'text-blue-600',
        },
        {
            label: 'Net Earnings',
            value: report ? formatCurrency(report.netEarnings) : '—',
            icon: TrendingUp,
            color: 'from-green-500 to-emerald-600',
            bg: 'bg-green-50',
            text: 'text-green-600',
        },
        {
            label: 'Commission',
            value: report ? formatCurrency(report.commission) : '—',
            icon: ArrowUpRight,
            color: 'from-orange-400 to-orange-600',
            bg: 'bg-orange-50',
            text: 'text-orange-600',
        },
        {
            label: 'Total Bookings',
            value: report ? String(report.totalBookings) : '—',
            icon: BarChart2,
            color: 'from-violet-500 to-purple-600',
            bg: 'bg-violet-50',
            text: 'text-violet-600',
        },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <SEO title="Earnings & Reports" description="View your earnings, revenue, and route performance analytics." />

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-primary-600" />
                        Earnings & Reports
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Track your revenue and route performance</p>
                </div>

                {/* Period selector */}
                <div className="relative inline-block">
                    <select
                        value={period}
                        onChange={e => setPeriod(e.target.value as any)}
                        className="appearance-none bg-white border border-gray-300 rounded-xl pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer shadow-sm"
                    >
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
            ) : (
                <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map(s => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                                    <div className={`h-10 w-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                                        <Icon className={`h-5 w-5 ${s.text}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                                    <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Booking status breakdown */}
                    {report && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                Booking Breakdown
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-xl">
                                    <p className="text-2xl font-bold text-green-600">{report.completedBookings}</p>
                                    <p className="text-xs text-green-600 font-medium mt-1">Completed</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-xl">
                                    <p className="text-2xl font-bold text-blue-600">{report.totalBookings}</p>
                                    <p className="text-xs text-blue-600 font-medium mt-1">Total</p>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-xl">
                                    <p className="text-2xl font-bold text-red-500">{report.cancelledBookings}</p>
                                    <p className="text-xs text-red-500 font-medium mt-1">Cancelled</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Route performance table */}
                    {report?.routes && report.routes.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Route className="h-5 w-5 text-gray-400" />
                                    Route Performance
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {['Route', 'Bookings', 'Revenue', 'Net Earnings', 'Occupancy', 'Cancellation'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {report.routes.map((route) => (
                                            <tr key={route.routeId} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-semibold text-gray-900">{route.from} → {route.to}</p>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-700">{route.totalBookings}</td>
                                                <td className="px-4 py-4 text-sm font-semibold text-blue-600">{formatCurrency(route.revenue)}</td>
                                                <td className="px-4 py-4 text-sm font-semibold text-green-600">{formatCurrency(route.netEarnings)}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-16">
                                                            <div
                                                                className="bg-blue-500 h-1.5 rounded-full"
                                                                style={{ width: `${Math.min(route.occupancyRate, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-600">{route.occupancyRate?.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${route.cancellationRate > 20 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                        {route.cancellationRate?.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {(!report?.routes || report.routes.length === 0) && (
                        <div className="text-center py-14 bg-white rounded-2xl border border-gray-200">
                            <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <BarChart2 className="h-7 w-7 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-semibold">No earnings data yet</p>
                            <p className="text-gray-400 text-sm mt-1">Complete bookings will appear here as earnings.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
