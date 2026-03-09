import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import {
  Users, MapPin, Bus, RefreshCcw, ShieldCheck, Ticket,
  ArrowRight, Wifi, Star, CheckCircle, Zap, TrendingUp, Heart, Smartphone
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import CitySearchInput from '../components/CitySearchInput';
import CustomDatePicker from '../components/CustomDatePicker';

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
} as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};



export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    fromCity: '',
    toCity: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?from=${searchParams.fromCity}&to=${searchParams.toCity}&date=${searchParams.date}`);
  };

  const cityFallbacks: Record<string, string> = {
    Mumbai: 'https://images.unsplash.com/photo-1504805572947-34b7d15b2b8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    Bangalore: 'https://images.unsplash.com/photo-1548013146-72479768bada?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    Delhi: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    Pune: 'https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
  };
  const defaultFallback = 'https://images.unsplash.com/photo-1524499982521-c78c7cf1b4b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
  const onImageError = (city: string) => (e: any) => {
    e.currentTarget.src = cityFallbacks[city] || defaultFallback;
  };

  const fallbackPopularDestinations = [
    { city: 'Mumbai', state: 'Maharashtra', image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', price: 'From ₹800' },
    { city: 'Bangalore', state: 'Karnataka', image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', price: 'From ₹650' },
    { city: 'Delhi', state: 'NCR', image: 'https://images.unsplash.com/photo-1587474265584-3639a9a7536b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', price: 'From ₹900' },
    { city: 'Pune', state: 'Maharashtra', image: 'https://images.unsplash.com/photo-1566375638495-99228498303b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', price: 'From ₹500' },
  ];

  const { data: popularDestinations } = useQuery<any[]>({
    queryKey: ['popular-destinations'],
    queryFn: () => api.get<any[]>('/destinations/popular').then(data => data || []),
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    initialData: fallbackPopularDestinations,
  });

  const { data: flags } = useQuery<any[]>({
    queryKey: ['feature-flags'],
    queryFn: () => api.get<any[]>('/feature-flags').then(data => data || []),
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const promoEnabled = (flags || []).some((f: any) => f.key === 'promo_banner' && f.enabled);

  const { data: experiments } = useQuery<any[]>({
    queryKey: ['promo-experiments'],
    queryFn: () => api.get<any[]>('/experiments/promotions').then(data => data || []),
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    enabled: promoEnabled,
  });

  const activePromo = (experiments || [])[0];
  const variant = activePromo ? (user?.id ? activePromo.variants[(user.id.charCodeAt(0) + activePromo.name.length) % activePromo.variants.length] : activePromo.variants[0]) : null;

  const recordEvent = async (eventType: string) => {
    if (!activePromo || !variant || !isAuthenticated()) return;
    try {
      await api.post('/experiments/events', {
        experimentId: activePromo.id,
        variant,
        eventType,
      });
    } catch {}
  };

  const testimonials = [
    { name: 'Arjun Mehta', role: 'Daily Commuter', content: "The best bus booking experience in India. Real-time tracking of private buses is a total life-saver in Mumbai traffic!", avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
    { name: 'Ananya Sharma', role: 'Business Traveler', content: "Extremely punctual and professional. I always book my Pune to Bangalore trips via BusBook for the luxury sleeper buses.", avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop' },
    { name: 'Priya Patel', role: 'Student', content: "Student discounts are genuine and the interface is very easy to use for booking last-minute home trips.", avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' }
  ];

  return (
    <div className="overflow-hidden bg-gray-50/50">
      <SEO
        title="Book Luxury Bus Tickets Online | BusBook"
        description="Experience premium bus travel with BusBook. Real-time tracking, safety first protocols, and instant refunds. Book your journey today."
        keywords="online bus booking, luxury bus, travel, safe journey, bus tickets"
      />

      {/* Hero Section */}
      <section className="relative min-h-[850px] flex items-center -mt-20 pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-primary-100/40 rounded-full blur-[100px] animate-blob mix-blend-multiply"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-blue-100/40 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply"></div>
          <div className="absolute top-[40%] left-[40%] w-[800px] h-[800px] bg-purple-100/40 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        <div className="container-custom grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8 relative z-10"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-sm font-semibold text-gray-700 tracking-wide">Trusted by 2 Million+ Travelers</span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
              Journey with <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600">
                Unmatched Comfort
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl text-gray-600 max-w-lg leading-relaxed">
              Elevate your travel experience with premium fleets, verified safety standards, and seamless digital booking.
            </motion.p>

            {/* Search Box */}
            <motion.div variants={fadeInUp} className="bg-white/70 backdrop-blur-xl border border-white/40 p-1 rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-xl">
              <div className="bg-white rounded-[1.3rem] p-6 border border-gray-100">
                <form onSubmit={handleSearch} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <CitySearchInput
                      label="From"
                      placeholder="Departure City"
                      value={searchParams.fromCity}
                      onChange={(val) => setSearchParams({ ...searchParams, fromCity: val })}
                      required
                    />
                    <CitySearchInput
                      label="To"
                      placeholder="Destination City"
                      value={searchParams.toCity}
                      onChange={(val) => setSearchParams({ ...searchParams, toCity: val })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Travel Date</label>
                      <CustomDatePicker
                        wrapperClassName="relative group w-full"
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium text-gray-900"
                        selected={searchParams.date ? new Date(searchParams.date) : null}
                        onChange={(date) => setSearchParams({ ...searchParams, date: date ? format(date, 'yyyy-MM-dd') : '' })}
                        minDate={new Date()}
                        placeholder="Select Date"
                      />
                    </div>
                    <button type="submit" className="w-full bg-gray-900 text-white h-[54px] rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 flex items-center justify-center gap-2 group">
                      Search Buses
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={fadeInUp} className="flex gap-8 pt-4 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Instant Refunds</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Verified Crew</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>24/7 Support</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block h-[700px] w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-600/10 to-transparent rounded-[3rem] transform rotate-6 scale-95"></div>
            <img
              src="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"
              alt="Premium Bus Travel"
              className="relative z-10 w-full h-full object-cover rounded-[2.5rem] shadow-2xl shadow-gray-900/10 transform transition-transform duration-700 hover:scale-[1.02]"
            />

            {/* Floating Review Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="absolute bottom-12 -left-12 z-20 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl max-w-xs border border-white/50"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">4.9/5 Rating</p>
                  <p className="text-xs text-gray-500">Based on 50k+ reviews</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 italic">"The most comfortable journey I've ever had. Wi-Fi was super fast!"</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Promo Banner (A/B Test) */}
      {promoEnabled && activePromo && variant && (
        <div className={`container-custom mt-4 ${variant === 'green-banner' ? 'bg-green-50 border-green-100' : 'bg-indigo-50 border-indigo-100'} border rounded-2xl p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Zap className={`${variant === 'green-banner' ? 'text-green-600' : 'text-indigo-600'} h-6 w-6`} />
            <div>
              <p className="font-bold text-gray-900">Special Promotion</p>
              <p className="text-sm text-gray-600">Exclusive deals on select routes today</p>
            </div>
          </div>
          <button
            className={`btn ${variant === 'green-banner' ? 'btn-success' : 'btn-primary'}`}
            onClick={() => {
              recordEvent('CLICK');
              navigate('/search');
            }}
            onMouseEnter={() => recordEvent('VIEW')}
          >
            Explore Deals
          </button>
        </div>
      )}

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
            {[
              { label: 'Routes Covered', value: '2,000+', icon: MapPin },
              { label: 'Happy Travelers', value: '5M+', icon: Users },
              { label: 'Partner Operators', value: '1,500+', icon: Bus },
              { label: 'Ticket Bookings', value: '10M+', icon: Ticket },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center group px-4"
              >
                <div className="mx-auto w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <stat.icon className="h-7 w-7" />
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-gray-500 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-24">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-primary-600 font-bold tracking-wider uppercase text-sm mb-2 block">Discover</span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular Destinations</h2>
              <p className="text-gray-600 text-lg">Explore the most visited cities with our premium bus services. Frequent departures and best prices guaranteed.</p>
            </div>
            <Link to="/search" className="btn btn-secondary group">
              View All Routes <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(popularDestinations || fallbackPopularDestinations).map((dest: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative h-[400px] rounded-3xl overflow-hidden cursor-pointer shadow-lg"
              >
                <img
                  src={dest.image}
                  alt={dest.city}
                  loading="lazy"
                  onError={onImageError(dest.city)}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full transform transition-transform duration-300 group-hover:translate-y-[-8px]">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-3 border border-white/30">
                    {dest.priceLabel || dest.price}
                  </span>
                  <h3 className="text-2xl font-bold text-white mb-1">{dest.city}</h3>
                  <p className="text-gray-300 font-medium">{dest.state}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gray-50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>

        <div className="container-custom relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-primary-600 font-bold tracking-wider uppercase text-sm mb-2 block">Why Choose Us</span>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Redefining Bus Travel</h2>
            <p className="text-gray-600 text-lg">We didn't just digitize bus booking; we reinvented the entire travel experience with technology and care.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Live GPS Tracking',
                desc: 'Track your bus in real-time on the map. Know exactly when to leave for the boarding point.',
                icon: MapPin,
                color: 'text-blue-600',
                bg: 'bg-blue-50'
              },
              {
                title: 'Safety First Protocol',
                desc: 'We partner only with top-rated operators who adhere to strict safety and hygiene protocols.',
                icon: ShieldCheck,
                color: 'text-green-600',
                bg: 'bg-green-50'
              },
              {
                title: 'Instant Refunds',
                desc: 'Cancel with a single click. Get instant refunds to your original payment source within seconds.',
                icon: RefreshCcw,
                color: 'text-purple-600',
                bg: 'bg-purple-50'
              },
              {
                title: 'Premium Amenities',
                desc: 'Filter buses by Wi-Fi, Charging Points, Blankets, and more for a comfortable journey.',
                icon: Wifi,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50'
              },
              {
                title: '24/7 Dedicated Support',
                desc: 'Our dedicated support team is available round the clock to assist you with any queries.',
                icon: Users,
                color: 'text-orange-600',
                bg: 'bg-orange-50'
              },
              {
                title: 'Best Price Guarantee',
                desc: 'Find a cheaper price elsewhere? We will refund double the difference. No questions asked.',
                icon: TrendingUp,
                color: 'text-pink-600',
                bg: 'bg-pink-50'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-gray-100 hover:border-primary-100 shadow-sm hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 group"
              >
                <div className={`${feature.bg} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Trusted by Travelers</h2>
            <p className="text-gray-600 text-lg">See what our community has to say about their journey with us.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative"
              >
                <div className="absolute top-8 right-8 text-primary-100">
                  <Heart className="h-10 w-10 fill-current" />
                </div>
                <p className="text-gray-600 text-lg mb-8 relative z-10 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-50" />
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[120px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>

        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Get the App for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">Exclusive Deals</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                Download the BusBook app to get 10% off your first booking, real-time trip updates, and exclusive mobile-only offers.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-primary-400" />
                  <span>Live Bus Tracking</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-primary-400" />
                  <span>Mobile-only discounts</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <CheckCircle className="h-5 w-5 text-primary-400" />
                  <span>Paperless boarding</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <button className="flex items-center gap-3 bg-white text-gray-900 px-6 py-3.5 rounded-xl hover:bg-gray-100 transition-colors transform hover:-translate-y-1">
                  <Smartphone className="h-6 w-6" />
                  <div className="text-left leading-tight">
                    <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Get it on</p>
                    <p className="text-sm font-bold">Google Play</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 bg-white/10 text-white px-6 py-3.5 rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm transform hover:-translate-y-1 border border-white/10">
                  <Smartphone className="h-6 w-6" />
                  <div className="text-left leading-tight">
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Download on the</p>
                    <p className="text-sm font-bold">App Store</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="relative z-10 transform rotate-[-5deg] hover:rotate-0 transition-transform duration-700">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-600 to-indigo-600 rounded-[3rem] blur-xl opacity-50"></div>
                <img
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="App Mockup"
                  className="w-[320px] rounded-[2.5rem] border-[8px] border-gray-800 shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 container-custom">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-gray-900/20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]"></div>

          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to start your journey?</h2>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Join millions of satisfied travelers who choose BusBook for their intercity travel needs. Safe, secure, and always on time.
            </p>
            {!isAuthenticated() && (
              <Link to="/register" className="inline-flex items-center gap-3 bg-white text-gray-900 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:scale-105 transition-all shadow-xl shadow-white/10 group">
                Create Free Account <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </section>
      {/* Featured Operators */}
      <section className="py-24 bg-white">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-primary-600 font-bold tracking-wider uppercase text-sm mb-2 block">Our Partners</span>
              <h2 className="text-4xl font-bold text-gray-900">Top Rated Operators</h2>
            </div>
            <p className="text-gray-500 max-w-md">We partner with the most reliable bus operators to ensure your journey is safe and comfortable.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              'VRL Travels', 'Zingbus', 'SRS Travels', 'Orange Travels', 'National Travels', 'Neeta Tours'
            ].map((name, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-primary-200 hover:bg-white hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                  <Bus className="h-6 w-6 text-gray-400 group-hover:text-primary-600" />
                </div>
                <span className="text-sm font-bold text-gray-700 text-center">{name}</span>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-[10px] font-bold text-gray-400">4.8</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-gray-50/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-100/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="container-custom relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Experience the Premium Way to Travel</h2>
            <p className="text-gray-600 text-lg">We don't just sell tickets; we provide a travel experience that's comfortable, safe, and reliable every single time.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Safety First', 
                desc: 'All our partners follow strict safety protocols and sanitization standards for every journey.',
                icon: ShieldCheck,
                color: 'bg-emerald-50 text-emerald-600'
              },
              { 
                title: 'Best Price Guarantee', 
                desc: 'Find a cheaper fare elsewhere and we will match it. No hidden charges, just honest pricing.',
                icon: Zap,
                color: 'bg-amber-50 text-amber-600'
              },
              { 
                title: 'Live Tracking', 
                desc: 'Keep your loved ones informed with real-time GPS tracking and expected arrival times.',
                icon: MapPin,
                color: 'bg-blue-50 text-blue-600'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
