import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Clock, ShieldCheck, MonitorPlay, History, Calendar, RefreshCw, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    details: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Filters
    const [filterAction, setFilterAction] = useState('');
    const [filterEntity, setFilterEntity] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [page, filterAction, filterEntity]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response: any = await api.get('/admin/audit-logs', {
                params: {
                    page,
                    limit: 15,
                    action: filterAction || undefined,
                    entityType: filterEntity || undefined,
                },
            });
            setLogs(response?.data || []);
            setTotalPages(response?.meta?.totalPages || 1);
            setTotalRecords(response?.meta?.total || 0);
        } catch (error) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (action.includes('DELETE') || action.includes('REJECT')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('CREATE') || action.includes('VERIFY')) return 'bg-green-100 text-green-700 border-green-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <History className="h-6 w-6 text-primary-600" />
                        Audit Logs
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        System trail of administrative actions for security and compliance.
                    </p>
                </div>

                <button
                    onClick={() => { setPage(1); fetchLogs(); }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-primary-600 transition-colors shadow-sm"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary-500' : ''}`} />
                    <span>Refresh Data</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Action</label>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={filterAction}
                            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                            className="pl-9 w-full rounded-xl border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">All Actions</option>
                            <option value="UPDATE_SETTING">Update Setting</option>
                            <option value="UPDATE_BOOKING_STATUS">Update Booking</option>
                            <option value="VERIFY_PROVIDER">Verify Provider</option>
                            <option value="REJECT_PROVIDER">Reject Provider</option>
                            <option value="LOGIN">Admin Login</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Entity</label>
                    <div className="relative">
                        <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={filterEntity}
                            onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
                            className="pl-9 w-full rounded-xl border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">All Entities</option>
                            <option value="SystemSetting">System Settings</option>
                            <option value="Booking">Bookings</option>
                            <option value="Provider">Providers</option>
                            <option value="User">Users</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Date / Time
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Admin ID
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Action Taken
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Target Entity
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Context Info
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {!logs || logs.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 italic">
                                        No audit records match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                logs?.map((log, i) => (
                                    <motion.tr
                                        key={log.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className="hover:bg-gray-50/80 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                                <Clock className="h-3 w-3 mr-2" />
                                                {format(new Date(log.createdAt), 'HH:mm:ss a')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 mr-2">
                                                    <User className="h-3 w-3" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 font-mono text-xs" title={log.adminId}>
                                                    ...{log.adminId.slice(-6)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 font-medium">{log.entityType}</div>
                                            <div className="text-xs text-gray-500 font-mono truncate max-w-[120px]" title={log.entityId}>
                                                {log.entityId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="text-xs text-gray-600 truncate bg-gray-50 p-2 rounded border border-gray-100 font-mono" title={JSON.stringify(log.details)}>
                                                {log.details ? JSON.stringify(log.details) : '—'}
                                            </div>
                                            {log.ipAddress && (
                                                <div className="flex items-center text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                                                    <MonitorPlay className="h-3 w-3 mr-1" />
                                                    {log.ipAddress}
                                                </div>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Header */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 text-xs">
                                Showing page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages || 1}</span>
                                {totalRecords > 0 && <span className="ml-2 text-gray-400">({totalRecords} total entries)</span>}
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading || totalPages === 0}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
