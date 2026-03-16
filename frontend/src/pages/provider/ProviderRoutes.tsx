import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format, parseISO } from 'date-fns';
import { 
  Plus, MapPin, Calendar, Clock, Trash2, Ticket, 
  Map, Sofa, X, FileText, Bus, ChevronLeft, ChevronRight,
  ArrowRight, DollarSign, Activity, AlertCircle, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import ProviderBookingModal from '../../components/ProviderBookingModal';
import RouteTrackingModal from '../../components/RouteTrackingModal';
import { generateTripManifest } from '../../utils/exportUtils';
import RouteSeatsModal from '../../components/RouteSeatsModal';
import CitySearchInput from '../../components/CitySearchInput';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import SEO from '../../components/SEO';

export default function ProviderRoutes() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [bookingRoute, setBookingRoute] = useState<any>(null);
  const [trackingRoute, setTrackingRoute] = useState<any>(null);
  const [seatsRoute, setSeatsRoute] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    date: '',
    fromCity: '',
    toCity: '',
  });
  const [formData, setFormData] = useState({
    vehicleId: '',
    fromCity: '',
    toCity: '',
    intermediateStops: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
    price: '',
  });

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => api.get('/providers/profile'),
    retry: false,
    staleTime: Infinity,
  });

  const { data: routesData, isLoading } = useQuery({
    queryKey: ['provider-routes', filters, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.fromCity) params.append('fromCity', filters.fromCity);
      if (filters.toCity) params.append('toCity', filters.toCity);
      params.append('page', page.toString());
      params.append('limit', '10');
      return api.get<any>(`/routes/provider/my-routes?${params.toString()}`);
    },
    retry: false,
    placeholderData: (previousData: any) => previousData,
    staleTime: 60000,
  });

  const routes = (routesData as any)?.routes || [];
  const totalPages = (routesData as any)?.meta?.totalPages || 1;

  const { data: vehicles } = useQuery({
    queryKey: ['provider-vehicles'],
    queryFn: () => api.get<any[]>('/providers/vehicles'),
    retry: false,
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/routes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-routes'] });
      toast.success('Route created successfully');
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/routes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-routes'] });
      toast.success('Route updated successfully');
      setShowModal(false);
      setEditingRoute(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/routes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-routes'] });
      toast.success('Route deleted successfully');
    },
  });

  const completeRouteMutation = useMutation({
    mutationFn: (id: string) => api.put(`/routes/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-routes'] });
      toast.success('Trip marked as completed');
    },
  });

  const handleDownloadManifest = async (route: any) => {
    try {
      const loadingToast = toast.loading('Generating manifest...');
      const response: any = await api.get(`/bookings/provider/my-bookings?routeId=${route.id}&limit=1000`);
      generateTripManifest(route, response.data?.data || []);
      toast.dismiss(loadingToast);
      toast.success('Manifest downloaded');
    } catch (error) {
      toast.error('Failed to generate manifest');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      fromCity: '',
      toCity: '',
      intermediateStops: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      departureTime: '',
      arrivalDate: '',
      arrivalTime: '',
      price: '',
    });
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setFormData({
      vehicleId: route.vehicleId,
      fromCity: route.fromCity,
      toCity: route.toCity,
      intermediateStops: route.intermediateStops?.join(', ') || '',
      date: format(new Date(route.date), 'yyyy-MM-dd'),
      departureTime: route.departureTime,
      arrivalDate: route.arrivalDate ? format(new Date(route.arrivalDate), 'yyyy-MM-dd') : '',
      arrivalTime: route.arrivalTime || '',
      price: route.price.toString(),
    });
    setShowModal(true);
  };

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.vehicleId) newErrors.vehicleId = 'Vehicle is required';
    if (!formData.fromCity) newErrors.fromCity = 'Origin city is required';
    if (!formData.toCity) newErrors.toCity = 'Destination city is required';
    if (formData.fromCity && formData.toCity && 
        formData.fromCity.toLowerCase() === formData.toCity.toLowerCase()) {
      newErrors.toCity = 'Destination cannot be the same as origin';
    }
    
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.departureTime) newErrors.departureTime = 'Departure time is required';
    
    if (formData.arrivalDate && formData.date && formData.arrivalDate < formData.date) {
      newErrors.arrivalDate = 'Arrival date cannot be before departure date';
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    const data = {
      ...formData,
      price: parseFloat(formData.price),
      arrivalDate: formData.arrivalDate ? new Date(formData.arrivalDate) : undefined,
      intermediateStops: formData.intermediateStops
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (profile === null) {
    return <ProviderRegistrationPrompt />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

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

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-6 pb-12"
    >
      <SEO
        title="Operations Hub | BusBook"
        description="Schedule management and route deployments."
        noIndex={true}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="w-8 h-px bg-indigo-600"></div>
             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Fleet Operations</p>
           </div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Active Deployments</h2>
           <p className="text-gray-500 font-medium max-w-lg">Manage your active routes, schedules, and live transit operations from your command center.</p>
        </div>
        <motion.button
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingRoute(null);
            resetForm();
            setShowModal(true);
          }}
          className="group relative flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-gray-900/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
            Deploy New Route
          </div>
        </motion.button>
      </div>

      {/* Advanced Filter Panel */}
      <motion.div 
        variants={itemVariants}
        className="bg-white/90 backdrop-blur-xl p-4 lg:p-6 rounded-[32px] shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col lg:flex-row gap-6 items-stretch lg:items-end"
      >
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2 ml-1">
             <Calendar className="h-3.5 w-3.5 text-indigo-500" />
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Deployment Timeline</label>
          </div>
          <CustomDatePicker
            selected={filters.date ? parseISO(filters.date) : null}
            onChange={(date) => setFilters({...filters, date: date ? format(date, 'yyyy-MM-dd') : ''})}
            placeholder="Search by date"
            className="w-full"
          />
        </div>
        
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2 ml-1">
             <MapPin className="h-3.5 w-3.5 text-emerald-500" />
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Origin Node</label>
          </div>
          <CitySearchInput
            placeholder="Origin City"
            value={filters.fromCity}
            onChange={(val) => setFilters({...filters, fromCity: val})}
            className="w-full h-[54px] pl-12 rounded-[22px] bg-gray-50/50 border-gray-100 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all"
          />
        </div>

        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2 ml-1">
             <MapPin className="h-3.5 w-3.5 text-rose-500" />
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Arrival Terminal</label>
          </div>
          <CitySearchInput
            placeholder="Destination City"
            value={filters.toCity}
            onChange={(val) => setFilters({...filters, toCity: val})}
            className="w-full h-[54px] pl-12 rounded-[22px] bg-gray-50/50 border-gray-100 font-bold focus:bg-white focus:ring-4 focus:ring-rose-500/5 transition-all"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setFilters({ date: '', fromCity: '', toCity: '' })}
          className="h-[54px] px-8 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-gray-500 bg-gray-50 hover:bg-rose-50 hover:text-rose-600 rounded-[22px] transition-all border border-gray-100 group/reset"
        >
          <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
          Reset Control
        </motion.button>
      </motion.div>

      {routes && routes.length > 0 ? (
        <div className="grid gap-6">
          {routes.map((route: any) => (
            <motion.div
              variants={itemVariants}
              key={route.id}
              className="bg-white rounded-[40px] shadow-xl shadow-gray-200/30 border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group relative"
            >
              <div className="flex flex-col xl:flex-row">
                {/* Left Side: Route Visualizer */}
                <div className="xl:w-2/3 p-10 relative">
                  <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-br-[80px] -z-10"></div>
                  
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-5">
                       <div className="h-14 w-14 rounded-[20px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform duration-500">
                          <Bus className="h-7 w-7" />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1.5">
                             <Activity className="h-3 w-3" /> DEP-ID: {route.id.slice(-6).toUpperCase()}
                          </div>
                          <h3 className="text-3xl font-black text-gray-900 leading-none flex items-center gap-3">
                             {route.fromCity} 
                             <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                <div className="w-8 h-px bg-gray-200"></div>
                                <ArrowRight className="h-5 w-5 text-indigo-400 mx-1" />
                                <div className="w-8 h-px bg-gray-200"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                             </div>
                             {route.toCity}
                          </h3>
                       </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                      route.availableSeats === 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {route.availableSeats === 0 ? 'Sold Out' : 'Active'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <Calendar className="h-3.5 w-3.5 text-indigo-400" /> Date
                        </div>
                        <p className="text-sm font-black text-gray-900 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 inline-block">
                           {(() => {
                             const d = new Date(route.date);
                             return !isNaN(d.getTime()) ? format(d, 'MMM dd, yyyy') : 'Invalid';
                           })()}
                        </p>
                     </div>
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <Clock className="h-3.5 w-3.5 text-orange-400" /> Departure
                        </div>
                        <p className="text-sm font-black text-gray-900 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 inline-block">
                           {route.departureTime}
                        </p>
                     </div>
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <Sofa className="h-3.5 w-3.5 text-emerald-400" /> Inventory
                        </div>
                        <div className="flex items-baseline gap-1 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 inline-block">
                           <span className="text-sm font-black text-gray-900">{route.availableSeats}</span>
                           <span className="text-[10px] font-bold text-gray-400">/ {route.totalSeats} LEFT</span>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <DollarSign className="h-3.5 w-3.5 text-purple-400" /> Price
                        </div>
                        <p className="text-lg font-black text-indigo-600 tracking-tighter">
                           ₹{route.price}
                        </p>
                     </div>
                  </div>

                  {route.intermediateStops && route.intermediateStops.length > 0 && (
                     <div className="mt-10 pt-6 border-t border-gray-50">
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Transit Nodes:</span>
                           <div className="flex flex-wrap gap-2">
                              {route.intermediateStops.map((stop: string, i: number) => (
                                 <motion.span 
                                    whileHover={{ y: -2 }}
                                    key={i} 
                                    className="px-4 py-1.5 bg-white text-gray-700 text-[10px] font-black rounded-full border border-gray-200 flex items-center gap-2 shadow-sm"
                                 >
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    {stop}
                                 </motion.span>
                              ))}
                           </div>
                        </div>
                     </div>
                  )}
                </div>

                {/* Right Side: Deployment Controls */}
                <div className="xl:w-1/3 p-10 bg-gray-50/50 flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-gray-100">
                   <div>
                      <div className="flex items-center justify-between mb-8">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operations Suite</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <motion.button 
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setBookingRoute(route)} 
                          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-[24px] text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group/btn"
                        >
                           <div className="p-3 bg-indigo-50 rounded-xl group-hover/btn:bg-indigo-600 group-hover/btn:text-white transition-colors">
                              <Ticket className="h-6 w-6" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest">Manual Book</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setTrackingRoute(route)} 
                          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-[24px] text-gray-500 hover:text-emerald-600 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group/btn"
                        >
                           <div className="p-3 bg-emerald-50 rounded-xl group-hover/btn:bg-emerald-600 group-hover/btn:text-white transition-colors">
                              <Map className="h-6 w-6" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest">Live Track</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSeatsRoute(route)} 
                          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-[24px] text-gray-500 hover:text-orange-600 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all group/btn"
                        >
                           <div className="p-3 bg-orange-50 rounded-xl group-hover/btn:bg-orange-600 group-hover/btn:text-white transition-colors">
                              <Sofa className="h-6 w-6" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest">Manifest</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDownloadManifest(route)} 
                          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-[24px] text-gray-500 hover:text-slate-900 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-500/5 transition-all group/btn"
                        >
                           <div className="p-3 bg-slate-50 rounded-xl group-hover/btn:bg-slate-900 group-hover/btn:text-white transition-colors">
                              <FileText className="h-6 w-6" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest">Export PDF</span>
                        </motion.button>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex gap-3">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleEdit(route)} 
                          className="flex-1 py-4 bg-white border border-gray-200 text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                           Optimize Fleet
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to mark this trip as completed? This will update all confirmed bookings.')) {
                              completeRouteMutation.mutate(route.id);
                            }
                          }}
                          className="flex-1 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                        >
                           Complete Trip
                        </motion.button>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this route deployment?')) {
                            deleteMutation.mutate(route.id);
                          }
                        }}
                        className="w-full py-3 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                         <Trash2 className="h-4 w-4" /> Terminate Deployment
                      </motion.button>
                   </div>
                </div>
              </div>
            </motion.div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-xl shadow-gray-200/40 mt-10">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                   setPage(p => Math.max(1, p - 1));
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page === 1}
                className="flex items-center gap-3 px-8 py-3 bg-white text-xs font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-2xl shadow-sm border border-gray-100"
              >
                <ChevronLeft className="h-4 w-4" /> Previous Cluster
              </motion.button>
              
              <div className="flex items-center gap-3">
                 {[...Array(totalPages)].map((_, i) => (
                    <motion.button 
                       whileHover={{ y: -2 }}
                       key={i} 
                       onClick={() => setPage(i + 1)}
                       className={`h-10 w-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'}`}
                    >
                       {i + 1}
                    </motion.button>
                 ))}
              </div>

              <motion.button
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                   setPage(p => Math.min(totalPages, p + 1));
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={page === totalPages}
                className="flex items-center gap-3 px-8 py-3 bg-white text-xs font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-2xl shadow-sm border border-gray-100"
              >
                Next Cluster <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </div>
      ) : (
        <motion.div 
          variants={itemVariants}
          className="py-20 bg-gray-50/50 rounded-[48px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-10"
        >
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 rounded-[36px] bg-white shadow-xl shadow-gray-200/50 flex items-center justify-center mb-8 relative border border-gray-100"
          >
             <Bus className="h-14 w-14 text-indigo-500 opacity-80" />
             <div className="absolute -top-1 -right-1 w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200 border-2 border-white animate-bounce">
                <AlertCircle className="h-5 w-5" />
             </div>
          </motion.div>

          <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Fleet Hangar is Offline</h3>
          <p className="text-gray-500 font-medium max-w-sm mb-10 text-base leading-relaxed">
            No active deployments match your current criteria. Ready to initialize your first intelligent route?
          </p>

          <motion.button
            whileHover={{ y: -4, scale: 1.05, boxShadow: "0 20px 40px -10px rgba(79, 70, 229, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-4 px-10 py-4 bg-gray-900 text-white rounded-[20px] font-black text-sm relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center gap-3">
              <Plus className="h-5 w-5" />
              Initialize Deployment
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* Modals with Premium Framing */}
      <AnimatePresence>
        {bookingRoute && (
          <ProviderBookingModal
            route={bookingRoute}
            onClose={() => setBookingRoute(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {trackingRoute && (
          <RouteTrackingModal
            route={trackingRoute}
            onClose={() => setTrackingRoute(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {seatsRoute && (
          <RouteSeatsModal
            route={seatsRoute}
            onClose={() => setSeatsRoute(null)}
          />
        )}
      </AnimatePresence>

      {/* Deploy Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
           setShowModal(false);
           resetForm();
           setErrors({});
        }}
        title={
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                <TrendingUp className="h-5 w-5" />
             </div>
             <div>
                <p className="text-xl font-black text-gray-900 leading-none">{editingRoute ? 'Refine Deployment' : 'New Deployment'}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">SDR (Secure Deployment Request) Protocol</p>
             </div>
           </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-8 pt-4">
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-6">
                <div className="flex items-center gap-3 mb-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Allocation</p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assigned Resource <span className="text-red-500">*</span></label>
                  <CustomSelect
                    value={formData.vehicleId}
                    onChange={(val) => {
                      setFormData({ ...formData, vehicleId: val });
                      if (errors.vehicleId) setErrors({...errors, vehicleId: ''});
                    }}
                    options={vehicles?.map((v: any) => ({
                      value: v.id,
                      label: v.name,
                      description: `${v.type} • ${v.registrationNumber}`
                    })) || []}
                    placeholder="Select fleet asset..."
                    icon={<Bus className="h-5 w-5" />}
                    className={errors.vehicleId ? 'border-red-500 ring-red-500' : ''}
                  />
                  {errors.vehicleId && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.vehicleId}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Departure Point <span className="text-red-500">*</span></label>
                    <CitySearchInput
                      placeholder="Origin City"
                      value={formData.fromCity}
                      onChange={(val) => {
                        setFormData({ ...formData, fromCity: val });
                        if (errors.fromCity) setErrors({...errors, fromCity: ''});
                      }}
                      className={`w-full h-[52px] pl-12 rounded-[20px] bg-white border-gray-200 font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all ${errors.fromCity ? 'border-red-500' : ''}`}
                    />
                    {errors.fromCity && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.fromCity}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Arrival Terminal <span className="text-red-500">*</span></label>
                    <CitySearchInput
                      placeholder="Destination City"
                      value={formData.toCity}
                      onChange={(val) => {
                        setFormData({ ...formData, toCity: val });
                        if (errors.toCity) setErrors({...errors, toCity: ''});
                      }}
                      className={`w-full h-[52px] pl-12 rounded-[20px] bg-white border-gray-200 font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all ${errors.toCity ? 'border-red-500' : ''}`}
                    />
                    {errors.toCity && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.toCity}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Transit Nodes (Via)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-12 pr-5 h-[52px] rounded-[20px] bg-white border border-gray-200 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-gray-300"
                      value={formData.intermediateStops}
                      onChange={(e) => setFormData({ ...formData, intermediateStops: e.target.value })}
                      placeholder="City A, City B..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 px-1">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departure Schedule</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Date</label>
                      <CustomDatePicker
                        selected={formData.date ? parseISO(formData.date) : null}
                        minDate={new Date()}
                        onChange={(date) => {
                          setFormData({ ...formData, date: date ? format(date, 'yyyy-MM-dd') : '' });
                          if (errors.date) setErrors({...errors, date: ''});
                        }}
                        placeholder="Select Date"
                        className={errors.date ? 'border-red-500' : ''}
                      />
                      {errors.date && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.date}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Time</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-orange-500 transition-colors">
                          <Clock className="h-4 w-4" />
                        </div>
                        <input
                          type="time"
                          className={`w-full pl-12 pr-5 h-[52px] rounded-[20px] bg-gray-50 border border-gray-100 font-bold focus:bg-white focus:ring-4 focus:ring-orange-500/10 outline-none transition-all ${errors.departureTime ? 'border-red-500' : ''}`}
                          value={formData.departureTime}
                          onChange={(e) => {
                            setFormData({ ...formData, departureTime: e.target.value });
                            if (errors.departureTime) setErrors({...errors, departureTime: ''});
                          }}
                        />
                      </div>
                      {errors.departureTime && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.departureTime}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arrival Target</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Estimated Date</label>
                      <CustomDatePicker
                        selected={formData.arrivalDate ? parseISO(formData.arrivalDate) : null}
                        minDate={formData.date ? parseISO(formData.date) : new Date()}
                        onChange={(date) => {
                          setFormData({ ...formData, arrivalDate: date ? format(date, 'yyyy-MM-dd') : '' });
                          if (errors.arrivalDate) setErrors({...errors, arrivalDate: ''});
                        }}
                        placeholder="Arrival Date"
                        className={errors.arrivalDate ? 'border-red-500' : ''}
                      />
                      {errors.arrivalDate && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.arrivalDate}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Estimated Time</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                          <Clock className="h-4 w-4" />
                        </div>
                        <input
                          type="time"
                          className="w-full pl-12 pr-5 h-[52px] rounded-[20px] bg-gray-50 border border-gray-100 font-bold focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          value={formData.arrivalTime}
                          onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-900 rounded-[32px] p-8 shadow-2xl shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10">
                   <div className="flex items-center justify-between mb-4">
                      <label className="block text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em]">Deployment Fare Protocol</label>
                      <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-indigo-200 uppercase tracking-widest border border-white/10">
                         Live Sync
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white text-2xl font-black">₹</div>
                      <input
                        type="number"
                        className={`flex-1 bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-3xl font-black text-white focus:border-white/40 focus:bg-white/10 outline-none transition-all placeholder:text-white/20 ${errors.price ? 'border-red-400' : ''}`}
                        value={formData.price}
                        onChange={(e) => {
                          setFormData({ ...formData, price: e.target.value });
                          if (errors.price) setErrors({...errors, price: ''});
                        }}
                        min="0"
                        step="1"
                        placeholder="0.00"
                      />
                   </div>
                   {errors.price && <p className="mt-2 text-[10px] font-bold text-red-400 uppercase tracking-tighter">{errors.price}</p>}
                   <div className="mt-4 flex items-center gap-2 text-indigo-300/60 text-[10px] font-bold uppercase">
                      <AlertCircle className="h-3.5 w-3.5" /> Fares are subject to platform service optimization
                   </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <motion.button 
                  whileHover={{ x: -4 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRoute(null);
                    resetForm();
                    setErrors({});
                  }}
                  className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors"
                >
                  Cancel Protocol
                </motion.button>
                <motion.button 
                  whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(79, 70, 229, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className="flex-1 py-4 bg-gray-900 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative">{editingRoute ? 'Refine Deployment' : 'Authorize Deployment'}</span>
                </motion.button>
              </div>
            </form>
      </Modal>
    </motion.div>
  );
}

