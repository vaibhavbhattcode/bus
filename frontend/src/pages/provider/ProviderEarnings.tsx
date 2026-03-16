import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import SEO from '../../components/SEO';
import {
    TrendingUp, Route, BarChart2,
    Loader2, ArrowUpRight,
    PieChart, Download, 
    ArrowRight, Wallet, Activity, Target
} from 'lucide-react';
import { motion } from 'framer-motion';

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
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(amount);
}

export default function ProviderEarnings() {
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    const { data: report, isLoading } = useQuery<EarningsReport>({
        queryKey: ['provider-earnings', period],
        queryFn: () => api.get(`/reports/provider/earnings?period=${period}`),
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const stats = [
        {
            label: 'GROSS REVENUE',
            value: report ? formatCurrency(report.totalRevenue) : '₹0',
            icon: Wallet,
            color: 'blue',
            trend: '+12.5%',
            positive: true
        },
        {
            label: 'NET EARNINGS',
            value: report ? formatCurrency(report.netEarnings) : '₹0',
            icon: TrendingUp,
            color: 'emerald',
            trend: '+8.2%',
            positive: true
        },
        {
            label: 'PLATFORM FEE',
            value: report ? formatCurrency(report.commission) : '₹0',
            icon: Target,
            color: 'orange',
            trend: 'Fixed 10%',
            positive: false
        },
        {
            label: 'CONVERSION',
            value: report ? `${((report.completedBookings / (report.totalBookings || 1)) * 100).toFixed(1)}%` : '0%',
            icon: Activity,
            color: 'violet',
            trend: '-2.1%',
            positive: false
        },
    ];

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8 pb-10"
        >
            <SEO title="Financial Intel | BusBook" description="Professional revenue analytics and performance auditing." />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <PieChart className="h-8 w-8 text-primary-600" />
                        Revenue Intelligence
                    </h1>
                    <p className="text-gray-500 font-medium">Audit your financial performance and growth vectors</p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200 shadow-inner">
                    {(['week', 'month', 'year'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                period === p 
                                ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-200/50' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Annual'}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[32px] border border-gray-100 shadow-sm">
                    <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Compiling Analytics...</p>
                </div>
            ) : (
                <>
                    {/* Primary Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((s) => {
                            const Icon = s.icon;
                            return (
                                <motion.div 
                                    variants={itemVariants}
                                    key={s.label} 
                                    className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                                            s.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                            s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                            s.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                                            'bg-violet-50 text-violet-600'
                                        }`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        {s.trend && (
                                           <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${s.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                              {s.positive ? <ArrowUpRight className="h-3 w-3" /> : <Activity className="h-3 w-3" />} {s.trend}
                                           </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
                                    <p className="text-2xl font-black text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{s.value}</p>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Breakdown Visualization Card */}
                        <motion.div variants={itemVariants} className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary-500" />
                                Operational Health
                            </h2>
                            <div className="space-y-6">
                                {[
                                    { label: 'Successful Trips', value: report?.completedBookings, total: report?.totalBookings, color: 'bg-emerald-500' },
                                    { label: 'Revenue Loss (Cancellations)', value: report?.cancelledBookings, total: report?.totalBookings, color: 'bg-rose-500' },
                                ].map((item, i) => {
                                    const percentage = ((item.value || 0) / (item.total || 1)) * 100;
                                    return (
                                        <div key={i}>
                                            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                <span>{item.label}</span>
                                                <span className="text-gray-900">{percentage.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 1, delay: 0.5 }}
                                                    className={`h-full rounded-full ${item.color}`} 
                                                />
                                            </div>
                                            <p className="mt-2 text-[10px] items-center flex gap-1 font-bold text-gray-400">
                                               Total volume: <span className="text-gray-900">{item.value} units</span>
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-10 p-4 bg-gray-900 rounded-2xl text-white">
                               <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                                     <Download className="h-5 w-5" />
                                  </div>
                                  <div>
                                     <p className="text-xs font-black uppercase tracking-widest">Financial Audit</p>
                                     <p className="text-[10px] text-gray-400 font-medium">Export full data to CSV</p>
                                  </div>
                               </div>
                            </div>
                        </motion.div>

                        {/* Performance Table */}
                        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                    <Route className="h-4 w-4 text-indigo-500" />
                                    Deployment Efficiency
                                </h2>
                                <button className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 flex items-center gap-1.5">
                                   Advanced Analytics <ArrowRight className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            {['Deployment', 'Volume', 'Performance', 'Yield', 'Status'].map(h => (
                                                <th key={h} className="text-left px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {report?.routes && report.routes.length > 0 ? (
                                            report.routes.map((route) => (
                                                <tr key={route.routeId} className="hover:bg-gray-50/30 transition-all duration-300">
                                                    <td className="px-8 py-5">
                                                        <p className="text-xs font-black text-gray-900 flex items-center gap-2">
                                                           {route.from} <ArrowRight className="h-3 w-3 text-gray-300" /> {route.to}
                                                        </p>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                       <span className="text-xs font-bold text-gray-600">{route.totalBookings} units</span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-12 hidden md:block">
                                                                <div
                                                                    className="bg-primary-600 h-1.5 rounded-full"
                                                                    style={{ width: `${Math.min(route.occupancyRate, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-900">{route.occupancyRate?.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                       <span className="text-xs font-black text-emerald-600">{formatCurrency(route.netEarnings)}</span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                       <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${
                                                          route.cancellationRate > 20 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                                       }`}>
                                                          {route.cancellationRate > 20 ? 'Critical' : 'Stable'}
                                                       </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                               <td colSpan={5} className="px-8 py-20 text-center">
                                                  <BarChart2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                                                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No matching transactional data</p>
                                               </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </motion.div>
    );
}

