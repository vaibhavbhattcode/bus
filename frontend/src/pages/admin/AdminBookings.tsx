import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import {
  MapPin, CheckCircle, XCircle, Clock, CreditCard,
  Download, Calendar, User, ChevronLeft, ChevronRight, Search, X,
  RefreshCw, Ticket, ArrowRight, Phone, Building2, IndianRupee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../utils/exportUtils';
import { motion, AnimatePresence } from 'framer-motion';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

/* ── debounce ─────────────────────────────────────────────────────────────── */
function useDebounce<T>(value: T, ms = 400): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

/* ── skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2"><div className="h-5 w-24 bg-gray-200 rounded-full" /><div className="h-5 w-20 bg-gray-100 rounded-full" /></div>
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

/* ── status configs ───────────────────────────────────────────────────────── */
const BOOKING_STATUS: Record<string, { cls: string; icon: any; dot: string }> = {
  CONFIRMED: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-400' },
  COMPLETED: { cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle, dot: 'bg-blue-400' },
  CANCELLED: { cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, dot: 'bg-red-400' },
  PENDING: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, dot: 'bg-amber-400' },
};
const PAYMENT_STATUS: Record<string, { cls: string; icon: any }> = {
  PAID: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  FAILED: { cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  REFUNDED: { cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: CreditCard },
};

function StatusPill({ label, config }: { label: string; config: { cls: string; icon: any } }) {
  const Icon = config.icon || Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminBookings() {
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 400);
  useEffect(() => setPage(1), [debouncedSearch, status, paymentStatus, startDate, endDate]);

  const { data: bookingsData, isLoading, isFetching, refetch } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-bookings', status, paymentStatus, startDate, endDate, debouncedSearch, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: '10' });
      if (status !== 'all') p.set('status', status);
      if (paymentStatus !== 'all') p.set('paymentStatus', paymentStatus);
      if (debouncedSearch) p.set('search', debouncedSearch.trim());
      if (startDate) p.set('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) p.set('endDate', format(endDate, 'yyyy-MM-dd'));
      return api.get<{ data: any[]; meta: any }>(`/admin/bookings?${p}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const bookings = bookingsData?.data ?? [];
  const meta = bookingsData?.meta ?? {};
  const hasFilter = status !== 'all' || paymentStatus !== 'all' || startDate || endDate || search;

  const handleExport = async () => {
    const t = toast.loading('Preparing export…');
    try {
      const p = new URLSearchParams({ limit: '10000' });
      if (status !== 'all') p.set('status', status);
      if (paymentStatus !== 'all') p.set('paymentStatus', paymentStatus);
      const res = await api.get<{ data: any[] }>(`/admin/bookings?${p}`);
      const rows = (res?.data ?? []).map((b: any) => ({
        ID: b.id.slice(-8).toUpperCase(),
        Date: b.createdAt ? format(new Date(b.createdAt), 'yyyy-MM-dd HH:mm') : 'N/A',
        Passenger: b.passengerName,
        Email: b.passengerEmail || b.user?.email || '',
        Phone: b.passengerPhone || '',
        Route: b.route ? `${b.route.fromCity} → ${b.route.toCity}` : '',
        Provider: b.route?.vehicle?.provider?.companyName || '',
        Seats: b.seats,
        Amount: b.totalAmount,
        Status: b.status,
        Payment: b.paymentStatus,
      }));
      if (!rows.length) { toast.dismiss(t); toast.error('No data'); return; }
      exportToCSV(rows, 'Bookings_Report', [
        { header: 'Booking ID', key: 'ID' }, { header: 'Date', key: 'Date' },
        { header: 'Passenger', key: 'Passenger' }, { header: 'Email', key: 'Email' },
        { header: 'Phone', key: 'Phone' }, { header: 'Route', key: 'Route' },
        { header: 'Provider', key: 'Provider' }, { header: 'Seats', key: 'Seats' },
        { header: 'Amount ₹', key: 'Amount' }, { header: 'Status', key: 'Status' },
        { header: 'Payment', key: 'Payment' },
      ]);
      toast.dismiss(t); toast.success('Export ready!');
    } catch { toast.dismiss(t); toast.error('Export failed'); }
  };

  const STATUS_OPTS = [
    { value: 'all', label: 'All Status' }, 
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' }, 
    { value: 'COMPLETED', label: 'Completed' }, 
    { value: 'CANCELLED', label: 'Cancelled' },
  ];
  const PAY_OPTS = [
    { value: 'all', label: 'All Payments' }, 
    { value: 'PENDING', label: 'Pending' },
    { value: 'PAID', label: 'Paid' }, 
    { value: 'FAILED', label: 'Failed' }, 
    { value: 'REFUNDED', label: 'Refunded' },
  ];

  // summary counts from existing data
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalRev = 0;
    bookings.forEach((b: any) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
      if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') totalRev += b.totalAmount || 0;
    });
    return { counts, totalRev };
  }, [bookings]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200"
          >
            <Ticket className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bookings</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {meta.total != null ? `${meta.total} total` : '—'}
              {summary.totalRev > 0 && <span className="ml-2">· <span className="text-emerald-600 font-semibold">₹{summary.totalRev.toLocaleString('en-IN')}</span></span>}
              {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· refreshing</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} title="Refresh"
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <motion.button
            onClick={handleExport}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </motion.button>
        </div>
      </motion.div>

      {/* ── Summary Stats ── */}
      <motion.div variants={fadeUpVariant} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Confirmed', value: summary.counts.CONFIRMED ?? 0, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700', icon: CheckCircle },
          { label: 'Completed', value: summary.counts.COMPLETED ?? 0, cls: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700', icon: CheckCircle },
          { label: 'Pending', value: summary.counts.PENDING ?? 0, cls: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700', icon: Clock },
          { label: 'Cancelled', value: summary.counts.CANCELLED ?? 0, cls: 'from-red-50 to-red-100 border-red-200 text-red-700', icon: XCircle },
        ].map((k) => (
          <motion.div
            key={k.label}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`p-4 rounded-2xl border bg-gradient-to-br ${k.cls} flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-300`}
          >
            <k.icon className="h-6 w-6 opacity-70 shrink-0" />
            <div>
              <p className="text-xs font-medium opacity-70">{k.label}</p>
              <p className="text-2xl font-black">{k.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Mini summary chips ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-wrap gap-2">
        {Object.entries(BOOKING_STATUS).map(([key, cfg]) => (
          <button key={key} onClick={() => setStatus(status === key ? 'all' : key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${status === key ? cfg.cls : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {key.charAt(0) + key.slice(1).toLowerCase()}
            {summary.counts[key] != null && <span className="ml-1 opacity-70">({summary.counts[key]})</span>}
          </button>
        ))}
      </motion.div>

      {/* ── Search + Filters bar ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input ref={searchRef} type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search passenger, route, booking ID…"
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          {search && <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
        </div>

        {/* Filter pills replaced with CustomSelect for premium feel */}
        <CustomSelect 
          value={status} 
          options={STATUS_OPTS} 
          onChange={setStatus} 
          className="w-44"
          placeholder="Status"
        />
        
        <CustomSelect 
          value={paymentStatus} 
          options={PAY_OPTS} 
          onChange={setPaymentStatus} 
          className="w-44"
          placeholder="Payment"
        />

        {/* Date range */}
        <div className="flex items-center gap-2">
          <CustomDatePicker
            selected={startDate}
            onChange={setStartDate}
            placeholder="From Date"
            className="w-40"
          />
          <span className="text-gray-400 font-bold">→</span>
          <CustomDatePicker
            selected={endDate}
            onChange={setEndDate}
            placeholder="To Date"
            className="w-40"
          />
        </div>

        {hasFilter && (
          <button onClick={() => { setStatus('all'); setPaymentStatus('all'); setStartDate(null); setEndDate(null); setSearch(''); }}
            className="px-4 h-[52px] text-xs text-red-600 hover:bg-red-50 rounded-2xl border-2 border-red-50 transition-all font-black uppercase tracking-widest">
            Clear All
          </button>
        )}
      </motion.div>

      {/* ── Bookings list ── */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : bookings.length === 0 ? (
        <motion.div variants={fadeUpVariant} className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Ticket className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-semibold">No bookings found</p>
          <p className="text-gray-400 text-sm mt-1">{search ? `No results for "${search}"` : 'Try adjusting the filters'}</p>
          {hasFilter && <button onClick={() => { setStatus('all'); setPaymentStatus('all'); setStartDate(null); setEndDate(null); setSearch(''); }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Clear filters</button>}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {bookings.map((booking: any, i: number) => {
              const bStatus = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.PENDING;
              const pStatus = PAYMENT_STATUS[booking.paymentStatus] ?? PAYMENT_STATUS.PENDING;
              const travelDate = booking.route?.date ? new Date(booking.route.date) : null;
              const createdAt = booking.createdAt ? new Date(booking.createdAt) : null;
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bStatus.cls.replace('text-', 'bg-').split(' ')[0]}/20`}
                    >
                      <Ticket className={`h-5 w-5 ${bStatus.cls.split(' ')[1]}`} />
                    </motion.div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Row 1: ID + statuses + date */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                          #{booking.id.slice(-8).toUpperCase()}
                        </span>
                        <StatusPill label={booking.status} config={bStatus} />
                        <StatusPill label={booking.paymentStatus} config={pStatus} />
                        {createdAt && !isNaN(createdAt.getTime()) && (
                          <span className="text-xs text-gray-400">{format(createdAt, 'MMM d, yyyy · HH:mm')}</span>
                        )}
                      </div>

                      {/* Row 2: Route */}
                      {booking.route && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span className="font-bold text-gray-900">{booking.route.fromCity}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-bold text-gray-900">{booking.route.toCity}</span>
                          {travelDate && !isNaN(travelDate.getTime()) && (
                            <span className="text-xs text-gray-500 ml-2">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {format(travelDate, 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Row 3: Passenger + Provider + Amount */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {booking.passengerName}
                          {booking.seats && <span className="ml-1 text-gray-400">· {booking.seats} seat{booking.seats > 1 ? 's' : ''}</span>}
                        </span>
                        {booking.passengerPhone && (
                          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{booking.passengerPhone}</span>
                        )}
                        {booking.route?.vehicle?.provider?.companyName && (
                          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{booking.route.vehicle.provider.companyName}</span>
                        )}
                        <span className="font-bold text-indigo-600 text-sm flex items-center gap-0.5">
                          <IndianRupee className="h-3.5 w-3.5" />{booking.totalAmount?.toFixed(0)}
                        </span>
                      </div>

                      {booking.pickupLocation && (
                        <p className="text-xs text-gray-400"><MapPin className="h-3 w-3 inline mr-1" />Pickup: {booking.pickupLocation}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ── Pagination ── */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} · {meta.total} bookings</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
                  const p = start + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
