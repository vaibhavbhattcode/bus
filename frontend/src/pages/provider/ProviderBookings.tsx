import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format, parseISO } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  Phone,
  Filter,
  Mail,
  Search,
  Ticket,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';
import EmptyState from '../../components/EmptyState';
import { exportToCSV } from '../../utils/exportUtils';
import SEO from '../../components/SEO';

const isPastBooking = (booking: any) => {
  if (!booking.route) return false;
  try {
    const tripDate = new Date(booking.route.date);
    let hours = 0, minutes = 0;
    if (booking.route.departureTime) {
      const timeParts = booking.route.departureTime.split(':');
      hours = parseInt(timeParts[0] || '0', 10);
      minutes = parseInt(timeParts[1] || '0', 10);
    }
    tripDate.setHours(hours, minutes, 0, 0);
    return new Date() > tripDate;
  } catch (e) {
    console.error('Error checking past booking:', e);
    return false;
  }
};

export default function ProviderBookings() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['provider-bookings', selectedStatus, dateFilter, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (dateFilter) params.append('date', dateFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', page.toString());
      params.append('limit', '10');
      const response = await api.get<any>(`/bookings/provider/my-bookings?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 15000,
    placeholderData: keepPreviousData,
    staleTime: 10000,
  });

  const bookings = bookingsData?.data || [];
  const meta = bookingsData?.meta || { page: 1, totalPages: 1 };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: string; status?: string; paymentStatus?: string }) =>
      api.put(`/bookings/${id}/status`, { status, paymentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      toast.success('Booking status updated');
    },
  });

  const handleExport = async () => {
    try {
      toast.loading('Preparing export...');
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (dateFilter) params.append('date', dateFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('limit', '10000');

      const response = await api.get<any>(`/bookings/provider/my-bookings?${params.toString()}`);
      const allBookings = response.data || [];

      if (allBookings.length === 0) {
        toast.dismiss();
        toast.error('No bookings to export');
        return;
      }

      const data = allBookings.map((b: any) => ({
        BookingID: b.id.slice(-6).toUpperCase(),
        Date: b.createdAt ? format(new Date(b.createdAt), 'yyyy-MM-dd HH:mm') : 'N/A',
        Passenger: b.passengerName,
        Phone: b.passengerPhone,
        Route: b.route ? `${b.route.fromCity} - ${b.route.toCity}` : 'N/A',
        TripDate: b.route?.date ? format(new Date(b.route.date), 'yyyy-MM-dd') : 'N/A',
        Seats: b.seatNumbers?.join(', '),
        Status: b.status,
        Amount: b.totalAmount,
        Payment: b.paymentStatus
      }));

      exportToCSV(data, 'Bookings_Report', [
        { header: 'Booking ID', key: 'BookingID' },
        { header: 'Date', key: 'Date' },
        { header: 'Passenger', key: 'Passenger' },
        { header: 'Phone', key: 'Phone' },
        { header: 'Route', key: 'Route' },
        { header: 'Trip Date', key: 'TripDate' },
        { header: 'Seats', key: 'Seats' },
        { header: 'Status', key: 'Status' },
        { header: 'Amount', key: 'Amount' },
        { header: 'Payment', key: 'Payment' }
      ]);
      toast.dismiss();
      toast.success('Export completed');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export bookings');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">Accessing Ledger...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-10"
    >
      <SEO
        title="Ledger & Manifests | BusBook"
        description="Comprehensive audit of all passenger manifests and bookings."
        noIndex={true}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tight">Booking Manifests</h2>
           <p className="text-gray-500 font-medium">Audit real-time passenger logs and confirmations</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-sm shadow-xl hover:bg-primary-600 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Download className="h-4 w-4" />
          Export Ledger
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 grid md:grid-cols-3 gap-6">
        <div className="relative">
           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Live Search</label>
           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
             <input
               type="text"
               placeholder="Passenger, Route, Reference ID..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all outline-none font-bold text-sm"
             />
           </div>
        </div>
        
        <div className="relative">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Timeline</label>
          <CustomDatePicker
             selected={dateFilter ? parseISO(dateFilter) : null}
             onChange={(date) => setDateFilter(date ? format(date, 'yyyy-MM-dd') : '')}
             placeholder="Audit by Date"
             className="w-full bg-gray-50 border-transparent rounded-2xl font-bold"
          />
        </div>

        <div className="relative">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Validation State</label>
          <CustomSelect
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            icon={<Filter className="h-4 w-4" />}
            placeholder="Filter Status"
            className="rounded-2xl border-transparent bg-gray-50"
          />
        </div>
      </div>

      {bookings && bookings.length > 0 ? (
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {bookings.map((booking: any) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={booking.id}
                className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 group"
              >
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-2/3 p-8 border-r border-gray-50">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                         <div className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-full border flex items-center gap-1.5 ${
                           booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                           booking.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                           'bg-amber-50 text-amber-600 border-amber-100'
                         }`}>
                           {booking.status === 'CONFIRMED' && <ShieldCheck className="h-3 w-3" />}
                           {booking.status === 'CANCELLED' && <XCircle className="h-3 w-3" />}
                           {booking.status === 'PENDING' && <Zap className="h-3 w-3" />}
                           {booking.status}
                         </div>
                         <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">REF: {booking.id.slice(-8).toUpperCase()}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {booking.createdAt ? format(new Date(booking.createdAt), 'MMM dd, HH:mm') : 'N/A'}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-10">
                       <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                             <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors duration-500">
                                <User className="h-6 w-6" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Manifest Holder</p>
                                <h3 className="text-xl font-black text-gray-900 leading-none">{booking.passengerName}</h3>
                             </div>
                          </div>
                          <div className="space-y-2 ml-1">
                             <p className="text-sm font-bold text-gray-600 flex items-center gap-2"><Phone className="h-3 w-3 text-gray-300" /> {booking.passengerPhone}</p>
                             {booking.passengerEmail && <p className="text-sm font-bold text-gray-400 flex items-center gap-2"><Mail className="h-3 w-3 text-gray-200" /> {booking.passengerEmail}</p>}
                          </div>
                       </div>

                       <div className="flex-1 bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                             <Tag className="h-3 w-3" /> Booking Specification
                          </div>
                          <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-gray-900">
                                   {booking.route?.fromCity} <ArrowRight className="inline h-3 w-3 mx-1 text-gray-300" /> {booking.route?.toCity}
                                </span>
                                <span className="text-xs font-medium text-gray-400">{booking.route?.departureTime}</span>
                             </div>
                             <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                   <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                      <Ticket className="h-3 w-3" />
                                   </div>
                                   <span className="text-xs font-black uppercase text-gray-900">{booking.seats} SEATS</span>
                                </div>
                                <span className="text-xs font-black text-emerald-600">₹{booking.totalAmount}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="lg:w-1/3 min-h-[120px] bg-gray-50/50 p-8 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-50">
                    <AnimatePresence mode="wait">
                      {booking.status === 'PENDING' && !isPastBooking(booking) ? (
                        <motion.div 
                          key="actions"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex flex-col gap-3"
                        >
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'CONFIRMED', paymentStatus: 'PAID' })}
                            disabled={updateStatusMutation.isPending}
                            className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                          >
                            Authorize Entry
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'CANCELLED' })}
                            disabled={updateStatusMutation.isPending}
                            className="w-full py-3.5 bg-white border border-gray-200 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-100 transition-all active:scale-95 disabled:opacity-50"
                          >
                            Reject Booking
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="status"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center"
                        >
                          <div className={`inline-flex h-12 w-12 rounded-2xl items-center justify-center mb-3 ${
                            booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' : 
                            booking.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                             {booking.status === 'CONFIRMED' ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                          </div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Audit result</p>
                          <p className={`text-sm font-black uppercase tracking-widest ${
                            booking.status === 'CONFIRMED' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {isPastBooking(booking) && booking.status === 'PENDING' ? 'Reference Expired' : `Manifest ${booking.status.toLowerCase()}`}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {meta.totalPages > 1 && (
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <button
                onClick={() => {
                   setPage(p => Math.max(1, p - 1));
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page === 1}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Previous Cluster
              </button>
              <div className="flex items-center gap-3">
                 {[...Array(meta.totalPages)].map((_, i) => (
                    <button 
                       key={i} 
                       onClick={() => setPage(i + 1)}
                       className={`h-8 w-8 rounded-lg text-xs font-black transition-all ${page === i + 1 ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                       {i + 1}
                    </button>
                 ))}
              </div>
              <button
                onClick={() => {
                   setPage(p => Math.min(meta.totalPages, p + 1));
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page === meta.totalPages}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next Cluster <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Ticket}
          title="No Transaction Logs Found"
          description="Your manifest database is currently clear. Active bookings will stream here in real-time."
        />
      )}
    </motion.div>
  );
}

