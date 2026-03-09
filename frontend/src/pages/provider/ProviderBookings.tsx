import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format, parseISO } from 'date-fns';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Phone, 
  Filter, 
  CreditCard,
  Mail,
  Search,
  Ticket,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';
import EmptyState from '../../components/EmptyState';
import { exportToCSV } from '../../utils/exportUtils';

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

  const filteredBookings = bookings;

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
      params.append('limit', '10000'); // Export all (up to 10k)

      const response = await api.get<any>(`/bookings/provider/my-bookings?${params.toString()}`);
      const allBookings = response.data || [];

      if (allBookings.length === 0) {
        toast.dismiss();
        toast.error('No bookings to export');
        return;
      }

      const data = allBookings.map((b: any) => {
        const createdDate = b.createdAt ? new Date(b.createdAt) : null;
        const tripDate = b.route?.date ? new Date(b.route.date) : null;

        return {
          BookingID: b.id.slice(-6).toUpperCase(),
          Date: createdDate && !isNaN(createdDate.getTime()) ? format(createdDate, 'yyyy-MM-dd HH:mm') : 'N/A',
          Passenger: b.passengerName,
          Phone: b.passengerPhone,
          Route: b.route ? `${b.route.fromCity} - ${b.route.toCity}` : 'N/A',
          TripDate: tripDate && !isNaN(tripDate.getTime()) ? format(tripDate, 'yyyy-MM-dd') : 'N/A',
          Seats: b.seatNumbers?.join(', '),
          Status: b.status,
          Amount: b.totalAmount,
          Payment: b.paymentStatus
        };
      });

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
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'PENDING':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'CANCELLED':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
        
        {/* Filters Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid md:grid-cols-3 gap-4">
          <div className="relative">
             <label className="block text-sm font-bold text-gray-700 mb-1.5">Search</label>
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
               <input
                 type="text"
                 placeholder="Search passenger, city..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
               />
             </div>
          </div>
          
          <div className="relative z-20">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Date</label>
            <CustomDatePicker
               selected={dateFilter ? parseISO(dateFilter) : null}
               onChange={(date) => setDateFilter(date ? format(date, 'yyyy-MM-dd') : '')}
               placeholder="Filter by Date"
               className="w-full bg-gray-50 border-gray-200"
            />
          </div>

          <div className="relative z-10">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Status</label>
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
            />
          </div>
        </div>
      </div>

      {filteredBookings && filteredBookings.length > 0 ? (
        <div className="grid gap-4">
          {filteredBookings.map((booking: any) => (
            <div
              key={booking.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Route & Status Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between lg:justify-start gap-4">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {getStatusIcon(booking.status)}
                      {booking.status}
                    </span>
                    <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(() => {
                         const d = booking.createdAt ? new Date(booking.createdAt) : null;
                         return d && !isNaN(d.getTime()) ? format(d, 'MMM dd, HH:mm') : 'N/A';
                      })()}
                    </span>
                  </div>

                  {booking.route && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 rounded-xl">
                           <MapPin className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                           <p className="text-xs text-gray-500 font-medium">Route</p>
                           <p className="font-bold text-gray-900">
                             {booking.route.fromCity} <span className="text-gray-400 mx-1">→</span> {booking.route.toCity}
                           </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 pl-[3.25rem]">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {booking.route.date && !isNaN(new Date(booking.route.date).getTime())
                              ? format(new Date(booking.route.date), 'MMM dd, yyyy')
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{booking.route.departureTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                          <Ticket className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{booking.seats} Seats</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-primary-50 px-2.5 py-1 rounded-lg text-primary-700">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-bold">₹{booking.totalAmount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Passenger Info & Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-6 lg:border-l lg:pl-6 border-gray-100">
                  <div className="space-y-3 min-w-[200px]">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                       </div>
                       <div>
                          <p className="text-xs text-gray-500 font-medium">Passenger</p>
                          <p className="font-bold text-gray-900">{booking.passengerName}</p>
                       </div>
                    </div>
                    <div className="space-y-1 pl-[3.25rem]">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                           <Phone className="h-3 w-3" />
                           {booking.passengerPhone}
                        </div>
                        {booking.passengerEmail && (
                           <div className="flex items-center gap-2 text-sm text-gray-600">
                             <Mail className="h-3 w-3" />
                             {booking.passengerEmail}
                           </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 lg:w-40 xl:w-auto">
                    {booking.status === 'PENDING' && !isPastBooking(booking) && (
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: booking.id,
                              status: 'CONFIRMED',
                              paymentStatus: 'PAID',
                            })
                          }
                          className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm hover:shadow-green-100"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: booking.id,
                              status: 'CANCELLED',
                            })
                          }
                          className="flex-1 px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    {isPastBooking(booking) && booking.status === 'PENDING' && (
                        <span className="w-full text-center px-4 py-2 bg-gray-100 text-gray-500 text-sm font-bold rounded-xl border border-gray-200">
                            Expired
                        </span>
                    )}
                    
                    {booking.status !== 'PENDING' && (
                       <div className="w-full text-center text-sm font-medium text-gray-400 italic">
                          {booking.status === 'CONFIRMED' ? 'Booking Confirmed' : 'Booking Cancelled'}
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Ticket}
          title="No bookings found"
          description="You don't have any bookings matching your filters yet."
        />
      )}
    </div>
  );
}
