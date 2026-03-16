import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Activity, Monitor, Globe, Clock, Network, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AccessLog {
    id: string;
    userId: string | null;
    method: string;
    url: string;
    statusCode: number;
    durationMs: number;
    ipAddress: string | null;
    userAgent: string | null;
    device: string | null;
    os: string | null;
    browser: string | null;
    country: string | null;
    city: string | null;
    createdAt: string;
}

export default function AdminAccessLogs() {
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Filters
    const [filterMethod, setFilterMethod] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchIp, setSearchIp] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [page, filterMethod, filterStatus]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response: any = await api.get('/admin/access-logs', {
                params: {
                    page,
                    limit: 15,
                    method: filterMethod || undefined,
                    statusCode: filterStatus ? Number(filterStatus) : undefined,
                    ipAddress: searchIp || undefined,
                },
            });
            setLogs(response?.data || []);
            setTotalPages(response?.meta?.totalPages || 1);
            setTotalRecords(response?.meta?.total || 0);
        } catch (error) {
            toast.error('Failed to load access logs');
        } finally {
            setLoading(false);
        }
    };

    const executeSearch = () => {
        setPage(1);
        fetchLogs();
    };

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'POST': return 'bg-green-100 text-green-700 border-green-200';
            case 'PUT':
            case 'PATCH': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusColor = (status: number) => {
        if (status >= 200 && status < 300) return 'text-green-600';
        if (status >= 400 && status < 500) return 'text-yellow-600';
        if (status >= 500) return 'text-red-600';
        return 'text-gray-600';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Server className="h-6 w-6 text-primary-600" />
                        System Access Logs
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Monitor API traffic, performance, and security events in real-time.
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

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">HTTP Method</label>
                    <div className="relative">
                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={filterMethod}
                            onChange={(e) => { setFilterMethod(e.target.value); setPage(1); }}
                            className="pl-9 w-full rounded-xl border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">All Methods</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status Code</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                            className="pl-9 w-full rounded-xl border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="200">200 OK</option>
                            <option value="201">201 Created</option>
                            <option value="400">400 Bad Request</option>
                            <option value="401">401 Unauthorized</option>
                            <option value="403">403 Forbidden</option>
                            <option value="404">404 Not Found</option>
                            <option value="500">500 Server Error</option>
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-2/4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search IP Address</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="e.g. 192.168.1.1"
                                value={searchIp}
                                onChange={(e) => setSearchIp(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                                className="pl-9 w-full rounded-xl border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <button
                            onClick={executeSearch}
                            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition"
                        >
                            Search
                        </button>
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
                                    Timestamp / URL
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Request Info
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Response
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Client Info
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {!logs || logs.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500 italic">
                                        No access records match the current filters.
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
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-900 mb-1">
                                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                                {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono truncate max-w-[200px] border border-gray-100 bg-gray-50 p-1 rounded" title={log.url}>
                                                {log.url}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-2 items-start">
                                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md border ${getMethodColor(log.method)}`}>
                                                    {log.method}
                                                </span>
                                                {log.userId && (
                                                    <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md" title={`User ID: ${log.userId}`}>
                                                        <User className="h-3 w-3 mr-1" />
                                                        User: ...{log.userId.slice(-6)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1 items-start">
                                                <div className={`font-bold text-sm ${getStatusColor(log.statusCode)}`}>
                                                    {log.statusCode}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Activity className="h-3 w-3 mr-1" />
                                                    {log.durationMs} ms
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                <div className="flex items-center" title="IP Address">
                                                    <Network className="h-3 w-3 mr-1 text-gray-400" />
                                                    {log.ipAddress || '—'}
                                                </div>
                                                <div className="flex items-center truncate" title="Location">
                                                    <Globe className="h-3 w-3 mr-1 text-gray-400" />
                                                    {log.city !== 'Unknown' ? `${log.city}, ${log.country}` : log.country || '—'}
                                                </div>
                                                <div className="flex items-center col-span-2 truncate" title="Device & OS">
                                                    <Monitor className="h-3 w-3 mr-1 text-gray-400" />
                                                    {log.os || '—'} • {log.browser || '—'} • {log.device || '—'}
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
