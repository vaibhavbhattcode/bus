import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MapPin, ArrowRight, Filter, Wifi, Zap, Coffee, ChevronDown, Bell, SlidersHorizontal, Bus, Star, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { Route } from '../../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import { motion, Variants } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import CitySearchInput from '../../components/CitySearchInput';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';
import CustomCheckbox from '../../components/CustomCheckbox';
import CustomRange from '../../components/CustomRange';
import { routeService } from '../../services/route.service';
import { userService } from '../../services/user.service';
import { queryKeys } from '../../lib/queryKeys';

const RouteCardSkeleton = () => (
  <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm relative overflow-hidden">
    <div className="animate-shimmer absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
      {/* Bus Info Skeleton */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-100 rounded-lg w-40 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-4 bg-gray-100 rounded-md w-20 animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded-md w-12 animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-gray-50 rounded-full w-16 animate-pulse border border-gray-100/50"></div>
          ))}
        </div>
      </div>

      {/* Journey Info Skeleton */}
      <div className="flex-[2] flex items-center justify-between gap-4 py-4 md:py-0 w-full md:w-auto px-4 md:px-12 border-y md:border-y-0 md:border-x border-gray-50">
        <div className="space-y-2">
          <div className="h-8 bg-gray-100 rounded-lg w-20 animate-pulse"></div>
          <div className="h-3 bg-gray-100 rounded-md w-16 animate-pulse mx-auto"></div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 max-w-[120px]">
          <div className="h-4 bg-primary-50 rounded-full w-16 animate-pulse"></div>
          <div className="w-full h-px bg-gray-100"></div>
          <div className="h-3 bg-gray-100 rounded-md w-12 animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-100 rounded-lg w-20 animate-pulse"></div>
          <div className="h-3 bg-gray-100 rounded-md w-16 animate-pulse mx-auto"></div>
        </div>
      </div>

      {/* Pricing & Action Skeleton */}
      <div className="flex-1 text-right w-full md:w-auto space-y-4">
        <div className="space-y-2 flex flex-col items-end">
          <div className="h-3 bg-gray-100 rounded-md w-24 animate-pulse"></div>
          <div className="h-10 bg-gray-100 rounded-xl w-32 animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <div className="h-14 bg-gray-100 rounded-2xl w-full animate-pulse"></div>
          <div className="h-3 bg-green-50 rounded-md w-3/4 animate-pulse ml-auto"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function SearchRoutesPage() {
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const [alertPrice, setAlertPrice] = useState('');

  const [searchParams, setSearchParams] = useState({
    fromCity: urlSearchParams.get('from') || '',
    toCity: urlSearchParams.get('to') || '',
    date: urlSearchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
    seats: 1,
  });

  const seoTitle = searchParams.fromCity && searchParams.toCity
    ? `Bus from ${searchParams.fromCity} to ${searchParams.toCity}`
    : 'Search Bus Routes';

  const seoDescription = `Find and book the best bus tickets from ${searchParams.fromCity || 'anywhere'} to ${searchParams.toCity || 'anywhere'}. Compare prices, amenities, and schedules.`;

  const [filters, setFilters] = useState({
    priceRange: [0, 5000],
    busType: [] as string[],
    amenities: [] as string[],
    departureTime: [] as string[],
    operators: [] as string[],
  });

  const [sortBy, setSortBy] = useState('price_asc');
  const [searching, setSearching] = useState(false);

  // Trigger search immediately if params are present from URL
  useEffect(() => {
    if (urlSearchParams.get('from') && urlSearchParams.get('to')) {
      setSearching(true);
    }
  }, [urlSearchParams]);

  // ✅ Migrated: typed routeService + typed queryKeys (no more hardcoded strings)
  const { data: routesResponse, refetch, isLoading } = useQuery({
    queryKey: queryKeys.routes.search(searchParams.fromCity, searchParams.toCity, searchParams.date),
    queryFn: () =>
      routeService.search({
        from: searchParams.fromCity,
        to: searchParams.toCity,
        date: searchParams.date,
        seats: searchParams.seats,
      }),
    enabled: searching && !!searchParams.fromCity && !!searchParams.toCity,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60_000, // routes fresh for 2 minutes
  });

  // Routes data is now paginated — extract the array
  const routes: Route[] = (routesResponse as any)?.data ?? (Array.isArray(routesResponse) ? routesResponse : []);

  // Calculate Duration Helper
  const calculateDuration = useCallback((dep: string, arr?: string) => {
    if (!dep || !arr) return 'N/A';
    const [depH, depM] = dep.split(':').map(Number);
    const [arrH, arrM] = arr.split(':').map(Number);

    let diffMins = (arrH * 60 + arrM) - (depH * 60 + depM);
    if (diffMins < 0) diffMins += 24 * 60; // Assume next day if arrival is earlier

    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return `${h}h ${m}m`;
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchParams.fromCity || !searchParams.toCity) {
      toast.error('Please enter both from and to cities');
      return;
    }
    setSearching(true);
    refetch();
  };

  const handleBook = (routeId: string) => {
    navigate(`/bookings/new?routeId=${routeId}`);
  };

  const handleCreateAlert = async () => {
    if (!searchParams.fromCity || !searchParams.toCity) {
      toast.error('Please enter both from and to cities');
      return;
    }
    if (!isAuthenticated) {
      toast.error('Please login to create alerts');
      navigate('/login');
      return;
    }
    try {
      // ✅ Migrated: typed userService (no more raw api.post + any payload)
      await userService.createPriceAlert({
        type: 'PRICE_DROP',
        fromCity: searchParams.fromCity,
        toCity: searchParams.toCity,
        ...(alertPrice ? { targetPrice: Number(alertPrice) } : {}),
      });
      toast.success('Price alert created');
      setAlertPrice('');
    } catch (e) {
      toast.error('Failed to create alert');
    }
  };

  // Filter and Sort Logic
  const filteredRoutes = useMemo(() => {
    const result = routes?.filter(route => {
      // Price Filter
      if (route.price < filters.priceRange[0] || route.price > filters.priceRange[1]) return false;

      // Departure Time Filter
      if (filters.departureTime.length > 0) {
        const hour = parseInt(route.departureTime.split(':')[0], 10);
        const matchesTime = filters.departureTime.some(time => {
          if (time === 'Before 6 AM') return hour < 6;
          if (time === '6 AM - 12 PM') return hour >= 6 && hour < 12;
          if (time === '12 PM - 6 PM') return hour >= 12 && hour < 18;
          if (time === 'After 6 PM') return hour >= 18;
          return false;
        });
        if (!matchesTime) return false;
      }

      // Operator Filter
      if (filters.operators.length > 0) {
        if (!filters.operators.includes(route.vehicle?.provider?.companyName || '')) return false;
      }

      // Bus Type Filter
      if (filters.busType.length > 0) {
        const vehicleType = route.vehicle?.type || '';
        const vehicleAmenities = route.vehicle?.amenities || [];
        const combinedType = `${vehicleType} ${vehicleAmenities.join(' ')}`.toLowerCase();

        const matchesType = filters.busType.some(type => {
          const lowerType = type.toLowerCase();
          const isAC = lowerType.includes('ac') && !lowerType.includes('non-ac');
          const isNonAC = lowerType.includes('non-ac');

          if (isAC) {
            if (!combinedType.includes('ac') || combinedType.includes('non-ac')) return false;
          }

          if (isNonAC) {
            if (/\bac\b/.test(combinedType) && !combinedType.includes('non-ac')) return false;
          }

          if (lowerType.includes('sleeper') && !combinedType.includes('sleeper')) return false;
          if (lowerType.includes('seater') && !combinedType.includes('seater')) return false;
          return true;
        });

        if (!matchesType) return false;
      }

      // Amenities Filter
      if (filters.amenities.length > 0) {
        const routeAmenities = route.vehicle?.amenities || [];
        const hasAllAmenities = filters.amenities.every(amenity =>
          routeAmenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
        );
        if (!hasAllAmenities) return false;
      }

      return true;
    }) || [];

    // Sort the filtered results
    return result.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'duration') {
        const getDurationMins = (r: Route) => {
          if (!r.departureTime || !r.arrivalTime) return 9999;
          const [depH, depM] = r.departureTime.split(':').map(Number);
          const [arrH, arrM] = r.arrivalTime.split(':').map(Number);
          let diff = (arrH * 60 + arrM) - (depH * 60 + depM);
          if (diff < 0) diff += 24 * 60;
          return diff;
        };
        return getDurationMins(a) - getDurationMins(b);
      }
      if (sortBy === 'departure_asc') {
        return a.departureTime.localeCompare(b.departureTime);
      }
      if (sortBy === 'departure_desc') {
        return b.departureTime.localeCompare(a.departureTime);
      }
      return 0;
    });
  }, [routes, filters, sortBy]);

  // Find the cheapest route for "Best Deal" badge
  const cheapestPrice = useMemo(() => {
    if (!filteredRoutes || filteredRoutes.length === 0) return Infinity;
    return Math.min(...filteredRoutes.map(r => r.price));
  }, [filteredRoutes]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 animate-fadeIn relative overflow-hidden font-sans">
      {/* Abstract Background Shapes */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-[100px] opacity-40 translate-x-1/4 -translate-y-1/4 mix-blend-multiply animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] opacity-40 -translate-x-1/4 translate-y-1/4 mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[80px] opacity-30 -translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={`bus from ${searchParams.fromCity}, bus to ${searchParams.toCity}, bus tickets, travel ${searchParams.fromCity} to ${searchParams.toCity}`}
      />

      {/* Search Header - Relative Positioning to avoid covering content */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-30 transition-all duration-300 mb-8"
      >
        <div className="absolute inset-0 bg-gray-50/90 backdrop-blur-xl border-b border-white/20 shadow-sm"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 items-center">
              <CitySearchInput
                wrapperClassName="relative flex-1 w-full group"
                className="w-full pl-16 pr-4 py-4 bg-transparent hover:bg-gray-50 focus:bg-gray-50 border-transparent focus:border-transparent focus:ring-0 rounded-xl text-gray-900 placeholder-gray-400 font-bold text-lg transition-all duration-300"
                placeholder="From City"
                value={searchParams.fromCity}
                onChange={(val) => setSearchParams({ ...searchParams, fromCity: val })}
                required
                icon={
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-primary-50 rounded-xl text-primary-600 group-focus-within:bg-primary-100 transition-all duration-300 z-10">
                    <MapPin className="h-5 w-5" />
                  </div>
                }
              />

              <motion.button
                type="button"
                whileHover={{ rotate: 180, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchParams(prev => ({ ...prev, fromCity: prev.toCity, toCity: prev.fromCity }))}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-primary-600 -mx-5 z-10 border border-white shadow-md cursor-pointer hover:bg-white hover:shadow-lg transition-all duration-300"
              >
                <ArrowRight className="h-4 w-4" />
              </motion.button>

              <CitySearchInput
                wrapperClassName="relative flex-1 w-full group"
                className="w-full pl-16 pr-4 py-4 bg-transparent hover:bg-gray-50 focus:bg-gray-50 border-transparent focus:border-transparent focus:ring-0 rounded-xl text-gray-900 placeholder-gray-400 font-bold text-lg transition-all duration-300"
                placeholder="To City"
                value={searchParams.toCity}
                onChange={(val) => setSearchParams({ ...searchParams, toCity: val })}
                required
                icon={
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-primary-50 rounded-xl text-primary-600 group-focus-within:bg-primary-100 transition-all duration-300 z-10">
                    <MapPin className="h-5 w-5" />
                  </div>
                }
              />

              <div className="w-px h-12 bg-gray-200 hidden md:block mx-2"></div>

              <CustomDatePicker
                wrapperClassName="relative w-full md:w-64 group"
                className="w-full pl-16 pr-4 py-4 bg-transparent hover:bg-gray-50 focus:bg-gray-50 border-transparent focus:border-transparent focus:ring-0 rounded-xl text-gray-900 font-bold text-lg transition-all duration-300 text-left"
                selected={searchParams.date ? new Date(searchParams.date) : null}
                onChange={(date) => setSearchParams({ ...searchParams, date: date ? format(date, 'yyyy-MM-dd') : '' })}
                minDate={new Date()}
                placeholder="Journey Date"
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300"
              >
                Search
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-bold">Set a price alert</span>
            <span className="text-gray-400">Get notified when prices drop</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={alertPrice}
              onChange={(e) => setAlertPrice(e.target.value)}
              placeholder="Target price (₹)"
              className="input w-40"
              min="0"
              step="1"
            />
            <button
              onClick={handleCreateAlert}
              className="btn btn-primary"
            >
              <Bell className="h-4 w-4" /> Set Alert
            </button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Mobile Toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 font-bold text-gray-800"
            >
              <span className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary-600" /> Filters</span>
              <ChevronDown className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters Sidebar */}
          <motion.div
            className={`lg:w-1/4 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-white/60 sticky top-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-xl flex items-center gap-2 text-gray-900">
                  <Filter className="h-5 w-5 text-primary-600" /> Filters
                </h3>
                <button
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors"
                  onClick={() => setFilters({ priceRange: [0, 5000], busType: [], amenities: [], departureTime: [], operators: [] })}
                >
                  Reset
                </button>
              </div>

              {/* Price Filter */}
              <div className="mb-8">
                <label className="text-sm font-bold text-gray-900 mb-4 block">Price Range</label>
                <div className="px-2">
                  <CustomRange
                    min={0}
                    max={5000}
                    step={100}
                    value={filters.priceRange[1]}
                    onChange={(val) => setFilters({ ...filters, priceRange: [0, val] })}
                  />
                  <div className="flex justify-between text-sm font-bold text-gray-600 mt-3">
                    <span>₹0</span>
                    <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">₹{filters.priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Bus Type */}
              <div className="mb-8">
                <label className="text-sm font-bold text-gray-900 mb-4 block">Bus Type</label>
                <div className="space-y-1">
                  {['AC Sleeper', 'AC Seater', 'Non-AC Sleeper', 'Non-AC Seater'].map(type => (
                    <CustomCheckbox
                      key={type}
                      label={type}
                      checked={filters.busType.includes(type)}
                      onChange={(checked) => {
                        if (checked) {
                          setFilters({ ...filters, busType: [...filters.busType, type] });
                        } else {
                          setFilters({ ...filters, busType: filters.busType.filter(t => t !== type) });
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="text-sm font-bold text-gray-900 mb-4 block">Amenities</label>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: 'WiFi', icon: Wifi },
                    { label: 'Charging Point', icon: Zap },
                    { label: 'Water Bottle', icon: Coffee }
                  ].map((item) => (
                    <CustomCheckbox
                      key={item.label}
                      checked={filters.amenities.includes(item.label)}
                      onChange={(checked) => {
                        if (checked) {
                          setFilters({ ...filters, amenities: [...filters.amenities, item.label] });
                        } else {
                          setFilters({ ...filters, amenities: filters.amenities.filter(a => a !== item.label) });
                        }
                      }}
                      label={
                        <span className="flex items-center gap-3">
                          <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                            <item.icon className="h-4 w-4" />
                          </div>
                          {item.label}
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Results */}
          <div className="lg:w-3/4">
            {/* Sort Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-20 overflow-visible"
            >
              <p className="text-gray-600 font-medium flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 font-bold text-xs">
                  {filteredRoutes?.length || 0}
                </span>
                buses available
              </p>

              <div className="w-full sm:w-auto">
                <CustomSelect
                  value={sortBy}
                  onChange={setSortBy}
                  icon={<SlidersHorizontal className="h-4 w-4" />}
                  label="Sort by:"
                  options={[
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'duration', label: 'Duration: Shortest First' },
                    { value: 'departure_asc', label: 'Departure: Earliest First' },
                    { value: 'departure_desc', label: 'Departure: Latest First' },
                  ]}
                  className="min-w-[260px]"
                />
              </div>
            </motion.div>

            {/* Route Results */}
            <div className="space-y-6">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <RouteCardSkeleton key={i} />)
              ) : filteredRoutes && filteredRoutes.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  {filteredRoutes.map((route) => (
                    <motion.div
                      key={route.id}
                      variants={itemVariants}
                      className="group bg-white rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 hover:border-primary-200 transition-all duration-500 overflow-hidden relative"
                    >
                      {/* Best Deal Badge */}
                      {route.price === cheapestPrice && (
                        <div className="absolute top-0 right-0 z-10">
                          <div className="bg-gradient-to-l from-green-500 to-emerald-400 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl flex items-center gap-1 shadow-lg">
                            <Zap className="h-3 w-3 fill-current" /> BEST DEAL
                          </div>
                        </div>
                      )}

                      <div className="p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                          {/* Bus Info */}
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 transition-colors duration-500">
                                <Bus className="h-7 w-7 text-gray-400 group-hover:text-primary-600 transition-colors" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                                  {route.vehicle?.provider?.companyName || 'Premium Express'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    {route.vehicle?.type || 'AC Sleeper'}
                                  </span>
                                  <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    <span className="text-xs font-bold">4.8</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Amenities */}
                            <div className="flex flex-wrap gap-2 pt-2">
                              {(route.vehicle?.amenities || ['WiFi', 'Water', 'Charging']).slice(0, 4).map((amenity, idx) => (
                                <span key={idx} className="text-[10px] font-bold text-gray-400 bg-gray-50/50 px-2.5 py-1 rounded-full border border-gray-100/50">
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Journey Info */}
                          <div className="flex-[2] flex items-center justify-between gap-4 w-full md:w-auto px-4 md:px-8 border-x-0 md:border-x border-gray-100/80 py-4 md:py-0">
                            <div className="text-center">
                              <p className="text-xl sm:text-2xl font-black text-gray-900">{route.departureTime}</p>
                              <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{route.fromCity}</p>
                            </div>

                            <div className="flex-1 flex flex-col items-center gap-2 max-w-[100px] sm:max-w-[120px]">
                              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                {calculateDuration(route.departureTime, route.arrivalTime)}
                              </span>
                              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent relative">
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white border border-gray-300 rounded-full"></div>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {route.distanceKm ? `${route.distanceKm} km` : 'Direct'}
                              </span>
                            </div>

                            <div className="text-center">
                              <p className="text-xl sm:text-2xl font-black text-gray-900">{route.arrivalTime || '--:--'}</p>
                              <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{route.toCity}</p>
                            </div>
                          </div>

                          {/* Pricing & Action */}
                          <div className="flex-1 text-right w-full md:w-auto relative">
                            {/* Dynamic Pricing Badges */}
                            {(route as any).basePrice && (route as any).price > (route as any).basePrice ? (
                              <div className="absolute -top-6 right-0 bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> DEMAND SURGE
                              </div>
                            ) : (route as any).basePrice && (route as any).price < (route as any).basePrice ? (
                              <div className="absolute -top-6 right-0 bg-green-50 text-green-600 border border-green-100 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" /> VALUE DROP
                              </div>
                            ) : route.availableSeats < 10 ? (
                              <div className="absolute -top-6 right-0 bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                                <Flame className="h-3 w-3" /> SELLING FAST
                              </div>
                            ) : null}

                            <div className="mb-4">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Starting from</p>
                              <p className="text-3xl font-black text-gray-900 group-hover:text-primary-600 transition-colors">
                                <span className="text-sm font-bold mr-1">₹</span>{route.price}
                              </p>
                              {(route as any).basePrice && (route as any).price !== (route as any).basePrice && (
                                <p className="text-xs text-gray-400 line-through mt-0.5">₹{(route as any).basePrice}</p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleBook(route.id)}
                                className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg shadow-gray-900/10 hover:bg-primary-600 hover:shadow-primary-600/20 transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                              >
                                Select Seats
                                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                              </motion.button>
                              <p className="text-[10px] font-bold text-green-600 text-center uppercase tracking-tighter">
                                {route.availableSeats} Seats left at this price
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Info Bar */}
                      <div className="bg-gray-50/50 border-t border-gray-100 px-8 py-3 flex justify-between items-center">
                        <div className="flex gap-6">
                          <button className="text-[10px] font-bold text-gray-500 hover:text-primary-600 transition-colors uppercase tracking-widest">Amenities</button>
                          <button className="text-[10px] font-bold text-gray-500 hover:text-primary-600 transition-colors uppercase tracking-widest">Boarding Points</button>
                          <button className="text-[10px] font-bold text-gray-500 hover:text-primary-600 transition-colors uppercase tracking-widest">Cancellation Policy</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Tracking Available</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-gray-200/20"
                >
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="bg-gradient-to-br from-primary-50 to-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"
                  >
                    <Bus className="h-10 w-10 text-primary-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No buses found</h3>
                  <p className="text-gray-500 max-w-md mx-auto">We couldn't find any buses for your search criteria. Try changing the date or cities.</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilters({ priceRange: [0, 5000], busType: [], amenities: [], departureTime: [], operators: [] })}
                    className="mt-6 px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    Clear Filters
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
