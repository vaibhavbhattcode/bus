import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, MapPin, Calendar, Clock, Edit, Trash2, CheckCircle, Ticket, Map, Sofa, X, FileText, Bus } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import ProviderBookingModal from '../../components/ProviderBookingModal';
import RouteTrackingModal from '../../components/RouteTrackingModal';
import { generateTripManifest } from '../../utils/exportUtils';
import RouteSeatsModal from '../../components/RouteSeatsModal';
import CitySearchInput from '../../components/CitySearchInput';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';

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
      // response.data is { data: [...], meta: ... } so we need response.data.data
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

  // Show registration prompt if profile doesn't exist
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">My Routes</h2>
          <button
            onClick={() => {
              setEditingRoute(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2 rounded-xl shadow-sm hover:shadow-primary-100"
          >
            <Plus className="h-5 w-5" />
            Add Route
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid md:grid-cols-4 gap-4 items-end">
          <div className="relative z-20">
             <label className="block text-sm font-bold text-gray-700 mb-1.5">Date</label>
             <CustomDatePicker
              selected={filters.date ? parseISO(filters.date) : null}
              onChange={(date) => setFilters({...filters, date: date ? format(date, 'yyyy-MM-dd') : ''})}
              placeholder="Select Date"
              className="w-full bg-gray-50 border-gray-200"
            />
          </div>
          <div className="relative z-10">
             <label className="block text-sm font-bold text-gray-700 mb-1.5">From</label>
             <CitySearchInput
               placeholder="From City"
               value={filters.fromCity}
               onChange={(val) => setFilters({...filters, fromCity: val})}
               className="input pl-10 w-full bg-gray-50 border-gray-200 focus:bg-white transition-colors rounded-xl"
             />
          </div>
          <div className="relative z-10">
             <label className="block text-sm font-bold text-gray-700 mb-1.5">To</label>
             <CitySearchInput
               placeholder="To City"
               value={filters.toCity}
               onChange={(val) => setFilters({...filters, toCity: val})}
               className="input pl-10 w-full bg-gray-50 border-gray-200 focus:bg-white transition-colors rounded-xl"
             />
          </div>
          <button
            onClick={() => setFilters({ date: '', fromCity: '', toCity: '' })}
            className="h-[42px] flex items-center justify-center gap-2 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        </div>
      </div>

      {routes && routes.length > 0 ? (
        <div className="grid gap-4">
          {routes.map((route: any) => (
            <div
              key={route.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-50 rounded-xl">
                      <MapPin className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-0.5">
                        <span>{route.fromCity}</span>
                        <span>→</span>
                        <span>{route.toCity}</span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {route.fromCity} to {route.toCity}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 pl-[3.75rem]">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {(() => {
                          const d = new Date(route.date);
                          return !isNaN(d.getTime()) ? format(d, 'MMM dd, yyyy') : 'Invalid Date';
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{route.departureTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Ticket className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {route.availableSeats}/{route.totalSeats} Seats
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-primary-50 px-3 py-1.5 rounded-lg text-primary-700">
                      <span className="font-bold">₹{route.price}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    onClick={() => setBookingRoute(route)}
                    className="p-2.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-100"
                    title="Book for Customer"
                  >
                    <Ticket className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setTrackingRoute(route)}
                    className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100"
                    title="Track Bus"
                  >
                    <Map className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSeatsRoute(route)}
                    className="p-2.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors border border-orange-100"
                    title="View Seats"
                  >
                    <Sofa className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDownloadManifest(route)}
                    className="p-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors border border-gray-200"
                    title="Download Trip Manifest"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                  <div className="w-px h-8 bg-gray-200 mx-1 self-center hidden lg:block"></div>
                  <button
                    onClick={() => handleEdit(route)}
                    className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100"
                    title="Edit Route"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to mark this trip as completed? This will update all confirmed bookings.')) {
                        completeRouteMutation.mutate(route.id);
                      }
                    }}
                    className="p-2.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-100"
                    title="Complete Trip"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this route?')) {
                        deleteMutation.mutate(route.id);
                      }
                    }}
                    className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
                    title="Delete Route"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm font-medium text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Bus}
          title="No routes found"
          description="Create your first route to start receiving bookings"
          action={{
            label: 'Add Route',
            onClick: () => setShowModal(true),
          }}
        />
      )}

      {/* Modals */}
      {bookingRoute && (
        <ProviderBookingModal
          route={bookingRoute}
          onClose={() => setBookingRoute(null)}
        />
      )}

      {trackingRoute && (
        <RouteTrackingModal
          route={trackingRoute}
          onClose={() => setTrackingRoute(null)}
        />
      )}

      {seatsRoute && (
        <RouteSeatsModal
          route={seatsRoute}
          onClose={() => setSeatsRoute(null)}
        />
      )}

      {/* Add/Edit Route Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRoute ? 'Edit Route' : 'Add New Route'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Vehicle <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.vehicleId}
                  onChange={(val) => {
                    setFormData({ ...formData, vehicleId: val });
                    if (errors.vehicleId) setErrors({...errors, vehicleId: ''});
                  }}
                  options={vehicles?.map((v: any) => ({
                    value: v.id,
                    label: `${v.name} - ${v.registrationNumber} (${v.type})`
                  })) || []}
                  placeholder="Choose a vehicle..."
                  icon={<Bus className="h-5 w-5" />}
                  className={errors.vehicleId ? 'border-red-500 ring-red-500' : ''}
                />
                {errors.vehicleId && <p className="mt-1 text-sm text-red-500">{errors.vehicleId}</p>}
              </div>

              {/* Route Locations */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <CitySearchInput
                    label="From"
                    required
                    placeholder="Origin City"
                    value={formData.fromCity}
                    onChange={(val) => {
                      setFormData({ ...formData, fromCity: val });
                      if (errors.fromCity) setErrors({...errors, fromCity: ''});
                    }}
                    className={`input pl-10 w-full ${errors.fromCity ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {errors.fromCity && <p className="mt-1 text-sm text-red-500">{errors.fromCity}</p>}
                </div>
                <div>
                  <CitySearchInput
                    label="To"
                    required
                    placeholder="Destination City"
                    value={formData.toCity}
                    onChange={(val) => {
                      setFormData({ ...formData, toCity: val });
                      if (errors.toCity) setErrors({...errors, toCity: ''});
                    }}
                    className={`input pl-10 w-full ${errors.toCity ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {errors.toCity && <p className="mt-1 text-sm text-red-500">{errors.toCity}</p>}
                </div>
              </div>

              {/* Intermediate Stops */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intermediate Stops
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Map className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="input pl-10 w-full"
                    value={formData.intermediateStops}
                    onChange={(e) =>
                      setFormData({ ...formData, intermediateStops: e.target.value })
                    }
                    placeholder="e.g. City A, City B, City C"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Separate cities with commas</p>
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Departure Date <span className="text-red-500">*</span></label>
                  <CustomDatePicker
                    selected={formData.date ? parseISO(formData.date) : null}
                    minDate={new Date()}
                    onChange={(date) => {
                      setFormData({ ...formData, date: date ? format(date, 'yyyy-MM-dd') : '' });
                      if (errors.date) setErrors({...errors, date: ''});
                    }}
                    placeholder="Select Date"
                    className={`w-full ${errors.date ? 'border-red-500 ring-red-500' : ''}`}
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Departure Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      className={`input pl-10 w-full ${errors.departureTime ? 'border-red-500 focus:ring-red-500' : ''}`}
                      value={formData.departureTime}
                      onChange={(e) => {
                        setFormData({ ...formData, departureTime: e.target.value });
                        if (errors.departureTime) setErrors({...errors, departureTime: ''});
                      }}
                    />
                  </div>
                  {errors.departureTime && <p className="mt-1 text-sm text-red-500">{errors.departureTime}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Arrival Date</label>
                  <CustomDatePicker
                    selected={formData.arrivalDate ? parseISO(formData.arrivalDate) : null}
                    minDate={formData.date ? parseISO(formData.date) : new Date()}
                    onChange={(date) => {
                      setFormData({ ...formData, arrivalDate: date ? format(date, 'yyyy-MM-dd') : '' });
                      if (errors.arrivalDate) setErrors({...errors, arrivalDate: ''});
                    }}
                    placeholder="Select Date"
                    className={`w-full pl-12 ${errors.arrivalDate ? 'border-red-500 ring-red-500' : ''}`}
                  />
                  {errors.arrivalDate && <p className="mt-1 text-sm text-red-500">{errors.arrivalDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Arrival Time
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      className="input pl-10 w-full"
                      value={formData.arrivalTime}
                      onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold">₹</span>
                  </div>
                  <input
                    type="number"
                    className={`input pl-10 w-full ${errors.price ? 'border-red-500 focus:ring-red-500' : ''}`}
                    value={formData.price}
                    onChange={(e) => {
                      setFormData({ ...formData, price: e.target.value });
                      if (errors.price) setErrors({...errors, price: ''});
                    }}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRoute(null);
                    resetForm();
                    setErrors({});
                  }}
                  className="btn btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1 py-2.5 font-semibold shadow-lg shadow-primary-200">
                  {editingRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
