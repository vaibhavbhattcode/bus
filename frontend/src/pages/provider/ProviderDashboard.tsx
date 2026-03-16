import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { 
  TrendingUp, Bus, BookOpen, DollarSign, User, Star, Activity, ChevronRight, MapPin, Calendar,
  ArrowUpRight, Users, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import LoadingSpinner from '../../components/LoadingSpinner';
import { io } from 'socket.io-client';
import SEO from '../../components/SEO';
import { format } from 'date-fns';

export default function ProviderDashboard() {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => api.get<any>('/providers/profile'),
    retry: false,
    staleTime: Infinity,
  });

  const { data: routesData } = useQuery({
    queryKey: ['provider-routes'],
    queryFn: () => api.get<any>('/routes/provider/my-routes'),
    retry: false,
    staleTime: 60000,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: () => api.get<any>('/bookings/provider/my-bookings?limit=100'),
    retry: false,
    staleTime: 60000,
  });

  const routes = (routesData as any)?.routes || [];
  const bookings = (bookingsData as any)?.data || [];

  const [liveStats, setLiveStats] = useState<{ liveConnections: number; recentActivity: string } | null>(null);

  useEffect(() => {
    if (profile?.id) {
      const socketUrl = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';
      const newSocket = io(`${socketUrl}/provider-stats`, {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
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

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }


  if (!profile) {
    return <ProviderRegistrationPrompt />;
  }

  const stats = {
    totalRoutes: routes?.length || 0,
    totalBookings: bookings?.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length || 0,
    totalVehicles: profile?.vehicles?.length || 0,
    totalRevenue:
      bookings
        ?.filter((b: any) => b.paymentStatus === 'PAID')
        .reduce((sum: number, b: any) => sum + b.totalAmount, 0) || 0,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-10"
    >
      <SEO
        title="Provider Hub | BusBook"
        description="Analytics and management for transport partners."
        noIndex={true}
      />

      {/* Header with Glassmorphism Effect */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <motion.div variants={itemVariants} className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary-200">
                Partner Portal
              </span>
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-4xl font-black tracking-tight">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-indigo-300">{profile?.companyName}</span>
            </motion.h2>
            <motion.p variants={itemVariants} className="text-slate-400 mt-2 max-w-lg">
              Monitor your fleet, track revenue growth, and manage routes with our enterprise-grade partner dashboard.
            </motion.p>
          </div>

          <motion.div variants={itemVariants} className="flex items-center gap-4">
             <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-green-500/20">
                   <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">Live Status</p>
                   <p className="text-lg font-black text-white leading-none">Healthy</p>
                </div>
             </div>
          </motion.div>
        </div>
      </div>

      {/* Live Monitor Strip */}
      <AnimatePresence>
        {liveStats && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-3 w-3 bg-primary-500 rounded-full animate-ping absolute inset-0" />
                <div className="h-3 w-3 bg-primary-600 rounded-full relative" />
              </div>
              <p className="text-sm font-bold text-gray-700">Real-time Traffic Monitor</p>
            </div>
            
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-0.5">Active Browsing</p>
                  <p className="text-sm font-black text-gray-900 leading-none">{liveStats.liveConnections}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-0.5">System Latency</p>
                  <p className="text-sm font-black text-gray-900 leading-none">24ms</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Routes', value: stats.totalRoutes, icon: Bus, color: 'primary', trend: '+12%' },
          { label: 'Active Bookings', value: stats.totalBookings, icon: BookOpen, color: 'green', trend: '+5%' },
          { label: 'Fleet Size', value: stats.totalVehicles, icon: Zap, color: 'blue', trend: 'Stable' },
          { label: 'Revenue (INR)', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'orange', trend: '+18%' },
        ].map((stat) => {
          const Icon = stat.icon;
          const config: any = {
            primary: 'from-primary-600 to-indigo-600 shadow-primary-200',
            green: 'from-emerald-600 to-teal-600 shadow-emerald-200',
            blue: 'from-blue-600 to-cyan-600 shadow-blue-200',
            orange: 'from-orange-600 to-amber-600 shadow-orange-200',
          };
          return (
            <motion.div 
              variants={itemVariants}
              key={stat.label} 
              className="group relative bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${config[stat.color]} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-500`}>
                  <Icon className="h-6 w-6" />
                </div>
                {stat.trend.includes('+') ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <ArrowUpRight className="h-3 w-3" /> {stat.trend}
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
               <h3 className="text-lg font-black text-gray-900">Recent Stream</h3>
               <p className="text-xs text-gray-400">Latest 5 bookings activity</p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-primary-200 transition-all">
               Deep Analytics <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {bookings && bookings.length > 0 ? (
              bookings.slice(0, 5).map((booking: any) => (
                <div key={booking.id} className="p-4 flex items-center justify-between group hover:bg-primary-50/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <User className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-none mb-1">{booking.passengerName}</p>
                      <div className="flex items-center gap-3">
                         <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            <MapPin className="h-3 w-3" /> {booking.route?.fromCity}
                         </span>
                         <span className="h-1 w-1 bg-gray-300 rounded-full" />
                         <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            <Calendar className="h-3 w-3" /> {format(new Date(booking.createdAt), 'MMM d, HH:mm')}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900 mb-1">₹{booking.totalAmount}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center opacity-40">
                <BookOpen className="h-12 w-12 mb-4" />
                <p className="font-bold">No active stream detected</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={itemVariants} className="space-y-6">
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3">
                 <button className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                    <TrendingUp className="h-4 w-4" />
                 </button>
              </div>
              <div className="relative inline-block mb-6">
                 <div className="h-24 w-24 rounded-[32px] bg-gradient-to-tr from-primary-600 to-indigo-600 p-1 group-hover:rotate-6 transition-transform duration-500">
                    <div className="h-full w-full bg-white rounded-[28px] flex items-center justify-center p-4">
                       <Bus className="h-10 w-10 text-primary-600" />
                    </div>
                 </div>
                 <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white shadow-xl flex items-center justify-center text-yellow-400">
                    <Star className="h-5 w-5 fill-current" />
                 </div>
              </div>
              <h4 className="text-2xl font-black text-gray-900 leading-tight">{profile?.companyName}</h4>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1 mb-6">Certified Partner</p>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Rating</p>
                    <p className="text-lg font-black text-gray-900">{profile?.rating ? profile.rating.toFixed(1) : 'N/A'}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Reviews</p>
                    <p className="text-lg font-black text-gray-900">{profile?.totalReviews || 0}</p>
                 </div>
              </div>
           </div>

           <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 h-24 w-24 bg-white/10 rounded-full blur-xl" />
              <div className="relative z-10">
                 <h5 className="font-bold flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-yellow-300" /> Professional Edge
                 </h5>
                 <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                    Your account is currently hitting 92% performance efficiency. Complete route schedules early to maintain top rank.
                 </p>
                 <button className="w-full py-2.5 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-lg shadow-black/10 hover:bg-gray-50 active:scale-95 transition-all">
                    Optimization Guide
                 </button>
              </div>
           </div>
        </motion.div>
      </div>
    </motion.div>
  );
}