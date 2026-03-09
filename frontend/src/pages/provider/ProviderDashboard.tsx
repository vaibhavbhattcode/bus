import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { TrendingUp, Bus, BookOpen, DollarSign, User, Star, Clock, AlertCircle, Activity } from 'lucide-react';
import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import LoadingSpinner from '../../components/LoadingSpinner';
import { io } from 'socket.io-client';

export default function ProviderDashboard() {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => api.get<any>('/providers/profile'),
    retry: false,
    staleTime: Infinity, // Profile data rarely changes
  });

  const { data: routesData } = useQuery({
    queryKey: ['provider-routes'],
    queryFn: () => api.get<any>('/routes/provider/my-routes'),
    retry: false,
    staleTime: 60000, // 1 minute
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => api.get<any>('/bookings/provider/my-bookings?limit=100'),
    retry: false,
    staleTime: 60000, // 1 minute
  });

  const routes = (routesData as any)?.routes || [];
  const bookings = (bookingsData as any)?.data || [];

  // WebSocket State
  const [liveStats, setLiveStats] = useState<{ liveConnections: number; recentActivity: string } | null>(null);

  useEffect(() => {
    if (profile?.id) {
      const newSocket = io('http://localhost:3000/provider-stats', {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Connected to Provider Stats Stream');
        newSocket.emit('subscribeToStats', { providerId: profile.id });
      });

      newSocket.on('statsUpdate', (data) => {
        setLiveStats(data);
      });

      return () => {
        newSocket.emit('unsubscribeFromStats');
        newSocket.disconnect();
      };
    }
  }, [profile?.id]);

  // While profile is loading, don't render registration prompt yet
  if (profileLoading) {
    return (
      <div className="card text-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // If provider profile doesn't exist yet, show registration prompt
  if (!profile) {
    return <ProviderRegistrationPrompt />;
  }

  const stats = {
    totalRoutes: routes?.length || 0,
    totalBookings: bookings?.filter((b: any) => b.status === 'CONFIRMED').length || 0,
    totalVehicles: profile?.vehicles?.length || 0,
    totalRevenue:
      bookings
        ?.filter((b: any) => b.paymentStatus === 'PAID')
        .reduce((sum: number, b: any) => sum + b.totalAmount, 0) || 0,
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">
          Welcome back, <span className="font-semibold text-gray-800">{profile?.companyName || 'Provider'}</span>! Here's what's happening today.
        </p>
      </div>

      {liveStats && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl shadow-lg border border-blue-500 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-white/20 border-2 border-white"></span>
            </div>
            <span className="font-bold">Live Traffic Monitor</span>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right">
              <p className="text-sm text-blue-100 font-medium">Currently Viewing Routes</p>
              <p className="text-2xl font-black">{liveStats.liveConnections} <span className="text-sm font-normal text-blue-200">Users</span></p>
            </div>
            <div className="w-px h-10 bg-blue-500/50 hidden md:block"></div>
            <div className="text-right hidden md:block">
              <p className="text-sm text-blue-100 font-medium">System Status</p>
              <div className="flex items-center gap-1 mt-1 justify-end">
                <Activity className="h-4 w-4 text-green-300" />
                <p className="text-sm font-bold text-green-100">{liveStats.recentActivity}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-50 rounded-xl">
              <Bus className="h-6 w-6 text-primary-600" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +12%
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Routes</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalRoutes}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +5%
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalBookings}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Bus className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
              Active
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Vehicles</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalVehicles}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-50 rounded-xl">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +18%
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
            <button className="text-sm text-primary-600 font-semibold hover:text-primary-700">View All</button>
          </div>
          <div className="p-2">
            {bookings && bookings.length > 0 ? (
              <div className="space-y-1">
                {bookings.slice(0, 5).map((booking: any) => (
                  <div key={booking.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                        {booking.passengerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{booking.passengerName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {booking.route?.fromCity} → {booking.route?.toCity}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                  <BookOpen className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No bookings yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-fit">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Provider Status</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary-50 flex items-center justify-center border-2 border-white shadow-sm">
                <User className="h-7 w-7 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">{profile?.companyName || 'N/A'}</p>
                <p className="text-sm text-gray-500">Transport Provider</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Verification Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${profile?.status === 'VERIFIED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {profile?.status === 'VERIFIED' ? (
                    <><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Verified</>
                  ) : (
                    <><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Pending</>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Rating</span>
                <span className="font-bold text-gray-900 flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  {profile?.rating ? profile.rating.toFixed(1) : 'N/A'}
                  <span className="text-gray-400 font-normal text-xs ml-1">
                    ({profile?.totalReviews || 0} reviews)
                  </span>
                </span>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-0.5">Pro Tip</p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Complete your profile details to increase trust and get more bookings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}