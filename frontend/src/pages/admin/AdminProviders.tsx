import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import {
  CheckCircle, XCircle, Clock, Shield, AlertCircle, Search,
  ChevronLeft, ChevronRight, BarChart2, Download, Mail,
  MessageCircle, PauseCircle, PlayCircle, ChevronDown,
  SortAsc, SortDesc, X, Star, Bus, Phone, MapPin, TrendingUp,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { exportToCSV } from '../../utils/exportUtils';
import Modal from '../../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

/* ── tiny debounce hook ─────────────────────────────────────────────────── */
function useDebounce<T>(value: T, delay = 400): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

/* ── skeleton card ──────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/5" />
          <div className="h-3 bg-gray-100 rounded w-3/5" />
          <div className="flex gap-2 mt-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 w-20 bg-gray-100 rounded-lg" />)}
          </div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full shrink-0" />
      </div>
    </div>
  );
}

/* ── status config ──────────────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; cls: string; icon: any }> = {
  VERIFIED: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  SUSPENDED: { label: 'Suspended', cls: 'bg-gray-100 text-gray-600 border-gray-300', icon: PauseCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: AlertCircle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" />{cfg.label}
    </span>
  );
}

/* ── stat chip ──────────────────────────────────────────────────────────── */
function Chip({ icon: Icon, label, value, color = 'gray' }: { icon: any; label: string; value: string | number; color?: string }) {
  const c: Record<string, string> = { gray: 'text-gray-500', green: 'text-emerald-600', amber: 'text-amber-600', blue: 'text-blue-600' };
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${c[color]}`} />
      <span className="text-xs text-gray-500">{label}:</span>
      <span className={`text-xs font-semibold ${c[color]}`}>{value}</span>
    </div>
  );
}

/* ── sort dropdown ──────────────────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Registered' },
  { value: 'companyName', label: 'Company Name' },
  { value: 'status', label: 'Status' },
  { value: 'city', label: 'City' },
];

function SortDropdown({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const current = SORT_OPTIONS.find((o) => o.value === value)?.label ?? 'Sort by';
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm min-w-[160px]"
      >
        <span className="flex-1 text-left">{current}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[180px] py-1 overflow-hidden">
          {SORT_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === o.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── analytics modal body ───────────────────────────────────────────────── */
function AnalyticsBody({ analytics }: { analytics: any }) {
  const monthly: any[] = analytics?.monthlyRevenue ?? [];
  const maxRev = Math.max(...monthly.map((m: any) => m.amount), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: `₹${(analytics.stats.totalRevenue ?? 0).toLocaleString()}`, cls: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700' },
          { label: 'Total Bookings', value: analytics.stats.totalBookings ?? 0, cls: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700' },
          { label: 'Vehicles', value: analytics.stats.totalVehicles ?? 0, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700' },
          { label: 'Routes', value: analytics.stats.totalRoutes ?? 0, cls: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700' },
        ].map((k) => (
          <div key={k.label} className={`p-4 rounded-xl border bg-gradient-to-br ${k.cls}`}>
            <p className="text-xs font-medium opacity-70 mb-1">{k.label}</p>
            <p className="text-2xl font-black">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-3">Monthly Revenue Trend</h4>
        {monthly.length > 0 ? (
          <div className="flex items-end gap-1.5 h-40 bg-gray-50 rounded-xl px-4 pb-3 pt-4 border border-gray-100">
            {monthly.map((item: any) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t transition-colors cursor-default"
                  style={{ height: `${Math.max((item.amount / maxRev) * 100, 4)}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                    ₹{item.amount.toLocaleString()}
                  </div>
                </div>
                <span className="text-[9px] text-gray-500">{item.month}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-100">
            No revenue data yet
          </div>
        )}
      </div>

      {/* Top routes */}
      {analytics.topRoutes?.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3">Top Routes</h4>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Route', 'Vehicle', 'Bookings', 'Revenue'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.topRoutes.map((r: any) => (
                  <tr key={r.routeId} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.vehicle}</td>
                    <td className="px-4 py-3">{r.bookings}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">₹{r.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-400">Email:</span> <span className="font-medium">{analytics.provider.contactEmail}</span></div>
        <div><span className="text-gray-400">Phone:</span> <span className="font-medium">{analytics.provider.contactPhone}</span></div>
        <div><span className="text-gray-400">Address:</span> <span className="font-medium">{analytics.provider.address || 'N/A'}, {analytics.provider.city}</span></div>
        <div><span className="text-gray-400">Joined:</span> <span className="font-medium">{(() => { const d = analytics.provider.createdAt ? new Date(analytics.provider.createdAt) : null; return d && !isNaN(d.getTime()) ? format(d, 'PPP') : 'N/A'; })()}</span></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function AdminProviders() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [messageProvider, setMessageProvider] = useState<any>(null);
  const [msgForm, setMsgForm] = useState({ title: '', message: '' });
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search, 400);
  useEffect(() => { setPage(1); }, [debouncedSearch, selectedStatus]);

  /* ── Main list query ── */
  const { data: providersData, isLoading, isFetching, refetch } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-providers', selectedStatus, debouncedSearch, page, sortBy, sortOrder],
    queryFn: () => api.get<{ data: any[]; meta: any }>(
      `/admin/providers?status=${selectedStatus}&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=10&sortBy=${sortBy}&sortOrder=${sortOrder}`
    ),
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const providers = providersData?.data ?? [];
  const meta = providersData?.meta ?? {};

  /* ── Analytics query (only when modal open) ── */
  const { data: analytics, isLoading: anaLoading } = useQuery({
    queryKey: ['provider-analytics', selectedProvider?.id],
    queryFn: () => api.get<any>(`/admin/providers/${selectedProvider!.id}/analytics`),
    enabled: !!selectedProvider,
    staleTime: 120000,
  });

  /* ── Invalidate cache helper ── */
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
  }, [queryClient]);

  /* ── Mutations ── */
  const verifyMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'verify' | 'reject' }) =>
      api.put(`/admin/providers/${id}/${action}`),
    onSuccess: () => { invalidate(); toast.success('Provider status updated'); setSelectedProvider(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'suspend' | 'activate' }) =>
      api.put(`/admin/providers/${id}/${action}`),
    onSuccess: () => { invalidate(); toast.success('Provider status updated'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const msgMutation = useMutation({
    mutationFn: () => api.post('/admin/notifications/send', {
      recipientType: 'SPECIFIC_USER',
      userId: messageProvider!.user?.id || messageProvider!.userId,
      title: msgForm.title,
      message: msgForm.message,
    }),
    onSuccess: () => { toast.success('Message sent'); setMessageProvider(null); setMsgForm({ title: '', message: '' }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send'),
  });

  /* ── Export ── */
  const handleExport = async () => {
    const t = toast.loading('Preparing export...');
    try {
      const res = await api.get<{ data: any[] }>(`/admin/providers?status=${selectedStatus}&search=${encodeURIComponent(debouncedSearch)}&limit=10000`);
      const rows = (res?.data ?? []).map((p: any) => ({
        Company: p.companyName, Owner: p.user?.name || p.contactName || 'N/A',
        Email: p.user?.email || 'N/A', Phone: p.contactPhone,
        Status: p.status, City: p.city || 'N/A',
        Bookings: p.totalBookings || 0, Revenue: p.totalRevenue || 0,
        Rating: p.rating ?? 'N/A',
        Registered: p.user?.createdAt ? format(new Date(p.user.createdAt), 'yyyy-MM-dd') : 'N/A',
      }));
      if (!rows.length) { toast.dismiss(t); toast.error('Nothing to export'); return; }
      exportToCSV(rows, 'Providers_Report', [
        { header: 'Company Name', key: 'Company' }, { header: 'Owner', key: 'Owner' },
        { header: 'Email', key: 'Email' }, { header: 'Phone', key: 'Phone' },
        { header: 'Status', key: 'Status' }, { header: 'City', key: 'City' },
        { header: 'Bookings', key: 'Bookings' }, { header: 'Revenue ₹', key: 'Revenue' },
        { header: 'Rating', key: 'Rating' }, { header: 'Registered', key: 'Registered' },
      ]);
      toast.dismiss(t); toast.success('Export ready');
    } catch { toast.dismiss(t); toast.error('Export failed'); }
  };

  const STATUS_TABS = ['all', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'];
  const STATUS_LABELS: Record<string, string> = { all: 'All', PENDING: 'Pending', VERIFIED: 'Verified', REJECTED: 'Rejected', SUSPENDED: 'Suspended' };
  const STATUS_DOT: Record<string, string> = { PENDING: 'bg-amber-400', VERIFIED: 'bg-emerald-400', REJECTED: 'bg-red-400', SUSPENDED: 'bg-gray-400' };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Providers</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {meta.total != null ? `${meta.total} total` : '—'}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· refreshing</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors" title="Refresh">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </motion.div>

      {/* ── Controls bar ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search company, city, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
          />
          {search && (
            <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <SortDropdown value={sortBy}
          onChange={(v) => { setSortBy(v); setPage(1); }} />
        <button onClick={() => setSortOrder((p) => p === 'asc' ? 'desc' : 'asc')}
          className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm" title="Toggle order">
          {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </button>
      </motion.div>

      {/* ── Status tabs ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-wrap gap-2 bg-gray-50/80 backdrop-blur rounded-2xl p-2 border border-gray-100">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => { setSelectedStatus(s); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedStatus === s ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-gray-100'
              }`}>
            {s !== 'all' && (
              <span className={`w-2 h-2 rounded-full ${selectedStatus === s ? 'bg-white/70' : STATUS_DOT[s]}`} />
            )}
            {STATUS_LABELS[s]}
          </button>
        ))}
      </motion.div>

      {/* ── Provider list ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : providers.length === 0 ? (
        <motion.div variants={fadeUpVariant} className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Bus className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-semibold">No providers found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? `No results for "${search}"` : `No providers with status "${STATUS_LABELS[selectedStatus]}"`}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
              Clear search
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {providers.map((provider: any, i: number) => {
              const registered = provider.user?.createdAt ? new Date(provider.user.createdAt) : null;
              return (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: identity */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm">
                        {(provider.companyName || '?')[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 truncate">{provider.companyName}</h3>
                          <StatusBadge status={provider.status} />
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                          {(provider.user?.name || provider.contactName) && (
                            <Chip icon={Shield} label="Contact" value={provider.user?.name || provider.contactName} />
                          )}
                          {provider.contactPhone && (
                            <Chip icon={Phone} label="Phone" value={provider.contactPhone} />
                          )}
                          {provider.city && (
                            <Chip icon={MapPin} label="City" value={provider.city} />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4">
                          <Chip icon={TrendingUp} label="Bookings" value={provider.totalBookings || 0} color="blue" />
                          <Chip icon={TrendingUp} label="Revenue" value={`₹${(provider.totalRevenue || 0).toLocaleString()}`} color="green" />
                          {provider.rating != null && (
                            <Chip icon={Star} label="Rating" value={`${provider.rating} ★`} color="amber" />
                          )}
                          {registered && !isNaN(registered.getTime()) && (
                            <span className="text-xs text-gray-400">Registered {format(registered, 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button onClick={() => setSelectedProvider(provider)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <BarChart2 className="h-4 w-4" /> Analytics
                      </button>
                      <button onClick={() => setMessageProvider(provider)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        <MessageCircle className="h-4 w-4" /> Message
                      </button>

                      {provider.status === 'PENDING' && (
                        <>
                          <button onClick={() => verifyMutation.mutate({ id: provider.id, action: 'verify' })}
                            disabled={verifyMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </button>
                          <button onClick={() => verifyMutation.mutate({ id: provider.id, action: 'reject' })}
                            disabled={verifyMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60">
                            <XCircle className="h-4 w-4" /> Reject
                          </button>
                        </>
                      )}
                      {provider.status === 'VERIFIED' && (
                        <button onClick={() => statusMutation.mutate({ id: provider.id, action: 'suspend' })}
                          disabled={statusMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60">
                          <PauseCircle className="h-4 w-4" /> Suspend
                        </button>
                      )}
                      {provider.status === 'SUSPENDED' && (
                        <button onClick={() => statusMutation.mutate({ id: provider.id, action: 'activate' })}
                          disabled={statusMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
                          <PlayCircle className="h-4 w-4" /> Activate
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ── Pagination ── */}
          {
            meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-500">
                  Page {meta.page} of {meta.totalPages} · {meta.total} providers
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
                    const p = start + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          }
        </div >
      )
      }

      {/* ── Analytics Modal ── */}
      <Modal isOpen={!!selectedProvider} onClose={() => setSelectedProvider(null)}
        title={selectedProvider && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg">
              {(selectedProvider.companyName || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{selectedProvider.companyName}</p>
              <p className="text-xs text-gray-500">Provider Analytics</p>
            </div>
          </div>
        )} maxWidth="max-w-4xl">
        {selectedProvider && (
          anaLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
            </div>
          ) : analytics ? (
            <AnalyticsBody analytics={analytics} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <AlertCircle className="h-10 w-10 mb-2 text-red-300" />
              <p>Failed to load analytics. Try again.</p>
            </div>
          )
        )}
      </Modal>

      {/* ── Message Modal ── */}
      <Modal isOpen={!!messageProvider} onClose={() => setMessageProvider(null)}
        title={messageProvider ? `Message — ${messageProvider.companyName}` : 'Message Provider'}>
        {messageProvider && (
          <form onSubmit={(e) => { e.preventDefault(); msgMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
              <input type="text" required value={msgForm.title}
                onChange={(e) => setMsgForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g. Account Update" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
              <textarea required rows={5} value={msgForm.message}
                onChange={(e) => setMsgForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm resize-none"
                placeholder="Write your message…" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setMessageProvider(null)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={msgMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
                <Mail className="h-4 w-4" />
                {msgMutation.isPending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div >
  );
}
