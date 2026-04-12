import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle, Ticket, Search, Bus, ArrowRight, Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import FeedbackModal from '../../components/FeedbackModal';
import ReportModal from '../../components/ReportModal';
import SEO from '../../components/SEO';
import { useMyBookings } from '../../hooks/useBookings';
import type { BookingListItem } from '../../services/booking.service';

export default function MyBookingsPage() {
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // ✅ Migrated: typed hook with proper caching (no more raw api.get + 5s interval)
  const { data: bookingsData, isLoading } = useMyBookings(1, 100);
  const bookings: BookingListItem[] = bookingsData?.data ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-green-600 bg-green-50 border-green-200 ring-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 border-yellow-200 ring-yellow-100';
      case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-200 ring-red-100';
      case 'COMPLETED': return 'text-blue-600 bg-blue-50 border-blue-200 ring-blue-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 ring-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'CANCELLED': return <XCircle className="h-3.5 w-3.5" />;
      case 'COMPLETED': return <CheckCircle className="h-3.5 w-3.5" />;
      default: return <AlertCircle className="h-3.5 w-3.5" />;
    }
  };

  const filteredBookings = bookings?.filter(booking => {
    if (activeTab === 'ALL') return true;

    // Check if the booking is in the past
    let isPast = false;
    if (booking.route) {
      try {
        const tripDate = new Date(booking.route.date);
        // Robust time parsing
        let hours = 0, minutes = 0;
        if (booking.route.departureTime) {
          const timeParts = booking.route.departureTime.split(':');
          hours = parseInt(timeParts[0] || '0', 10);
          minutes = parseInt(timeParts[1] || '0', 10);
        }
        
        tripDate.setHours(hours, minutes, 0, 0);
        isPast = new Date() > tripDate;
      } catch (e) {
        console.error('Error parsing date:', e);
        // If date parsing fails, we can't be sure. 
        // But if the date string itself contains a year < current year, it's past.
        // For now, let's assume if it fails, we keep it as is (false), but log it.
      }
    }

    if (activeTab === 'UPCOMING') {
      // If status is COMPLETED, it's definitely not upcoming
      if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') return false;
      return ['CONFIRMED', 'PENDING'].includes(booking.status) && !isPast;
    }

    if (activeTab === 'COMPLETED') {
      return booking.status === 'COMPLETED' || (['CONFIRMED', 'PENDING'].includes(booking.status) && isPast);
    }

    return booking.status === activeTab;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex gap-4 border-b border-gray-200 pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 relative overflow-hidden font-sans">
      <SEO
        title="My Bookings"
        description="View, manage, and track all your bus bookings on BusBook. Access your upcoming trips, completed journeys, and cancellations."
        noIndex={true}
      />
       {/* Abstract Background Shapes */}
       <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[80px] opacity-40 translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[80px] opacity-40 -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-xl text-primary-600">
                <Ticket className="h-6 w-6" />
              </div>
              My Bookings
            </h2>
            <p className="text-gray-500 mt-2 font-medium">Manage and track your travel history</p>
          </div>
          <Link to="/search" className="btn btn-primary shadow-lg shadow-primary-500/30 rounded-xl px-6 py-3 flex items-center gap-2 hover:scale-105 transition-transform">
            <Search className="h-4 w-4" />
            Book New Trip
          </Link>
        </div>

        {/* Custom Tabs */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 shadow-sm border border-gray-200/50 mb-8 inline-flex flex-wrap gap-1">
          {(['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => {
            const counts: Record<string, number> = {
              ALL: bookings.length,
              UPCOMING: bookings.filter(b => ['CONFIRMED','PENDING'].includes(b.status)).length,
              COMPLETED: bookings.filter(b => b.status === 'COMPLETED').length,
              CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 relative overflow-hidden flex items-center gap-2 ${
                  activeTab === tab
                    ? 'text-primary-700 shadow-md bg-white ring-1 ring-gray-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                {counts[tab] > 0 && (
                  <span className={`relative z-10 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    activeTab === tab ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                  }`}>{counts[tab]}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {filteredBookings && filteredBookings.length > 0 ? (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {filteredBookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  variants={itemVariants}
                  className="group"
                >
                  <Link
                    to={`/bookings/${booking.id}`}
                    className="block bg-white border border-gray-100 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary-500/8 hover:-translate-y-1 hover:border-primary-100 transition-all duration-300 relative group/card"
                  >
                    {/* Ticket Punch Holes */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-gray-50 rounded-r-full border-y border-r border-gray-100 z-10"></div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-gray-50 rounded-l-full border-y border-l border-gray-100 z-10"></div>
                    {/* Dashed separator line */}
                    <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 border-t border-dashed border-gray-100 pointer-events-none hidden md:block"></div>

                    <div className="p-6 md:p-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-12">
                        {/* Left Side: Route Info */}
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center justify-between md:justify-start gap-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ring-1 ring-inset ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              {booking.status}
                            </span>
                            <span className="text-xs text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                              #{booking.id.slice(-8).toUpperCase()}
                            </span>
                          </div>

                          {booking.route && (
                            <div className="flex flex-col md:flex-row gap-8 md:items-center">
                              <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 flex items-center justify-center text-primary-600 shadow-sm border border-primary-100 group-hover:scale-110 transition-transform duration-300">
                                  <Bus className="h-7 w-7" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                    {booking.route.fromCity} 
                                    <ArrowRight className="h-5 w-5 text-gray-300" />
                                    {booking.route.toCity}
                                  </div>
                                  <div className="text-sm font-medium text-gray-500 mt-1">
                                    {booking.route.vehicle?.provider?.companyName || 'Bus Operator'}
                                  </div>
                                </div>
                              </div>

                              <div className="h-px md:w-px md:h-12 bg-gray-200"></div>

                              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                                <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Date</p>
                                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                                    <Calendar className="h-4 w-4 text-primary-500" />
                                    {(() => {
                                      if (!booking.route?.date) return 'N/A';
                                      const d = new Date(booking.route.date);
                                      return !isNaN(d.getTime()) ? format(d, 'EEE, MMM dd') : 'Invalid Date';
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Time</p>
                                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                                    <Clock className="h-4 w-4 text-primary-500" />
                                    {booking.route.departureTime}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Seats</p>
                                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                                    <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold">
                                      {booking.seats}
                                    </span>
                                    Seats
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Side: Price & Actions */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 border-dashed border-gray-100 pt-6 md:pt-0 min-w-[140px]">
                          <div className="text-right">
                             <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Amount</p>
                             <div className="text-2xl font-black text-gray-900 group-hover/card:text-primary-600 transition-colors">
                                ₹{booking.totalAmount}
                             </div>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto justify-end">
                            {booking.status === 'COMPLETED' && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedBooking(booking);
                                  setShowFeedbackModal(true);
                                }}
                                className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg border border-yellow-100 hover:bg-yellow-100 transition-colors"
                              >
                                Rate Trip
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedBooking(booking);
                                setShowReportModal(true);
                              }}
                              className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                            >
                              Report
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-200/60 dashed-border"
            >
              <div className="h-24 w-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Ticket className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                {activeTab === 'ALL' 
                  ? "You haven't made any bookings yet. Start your journey today!" 
                  : `You have no ${activeTab.toLowerCase()} bookings.`}
              </p>
              {activeTab === 'ALL' && (
                <Link to="/search" className="btn btn-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:scale-105 transition-transform">
                  Start Booking
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {selectedBooking && (
        <>
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => {
              setShowFeedbackModal(false);
              setSelectedBooking(null);
            }}
            bookingId={selectedBooking.id}
            providerId={selectedBooking.route?.vehicle?.provider?.id}
            routeId={selectedBooking.route?.id}
          />
          <ReportModal
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setSelectedBooking(null);
            }}
            bookingId={selectedBooking.id}
            providerId={selectedBooking.route?.vehicle?.provider?.id}
            />
        </>
      )}
    </div>
  );
}
