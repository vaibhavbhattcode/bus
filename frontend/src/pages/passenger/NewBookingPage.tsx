import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { MapPin, Clock, Users, User, Phone, Mail, CreditCard, ShieldCheck, CheckCircle2, Tag, ArrowRight, Zap, Bus, Star, Timer } from 'lucide-react';
import { Route } from '../../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorMessage from '../../components/ErrorMessage';
import SeatSelection from '../../components/SeatSelection';
import { useAuthStore } from '../../store/auth';
import SEO from '../../components/SEO';

const BookingTimer = ({ duration = 600, onExpire }: { duration?: number, onExpire?: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (timeLeft <= 0) {
            onExpire?.();
            return;
        }
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, onExpire]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full text-amber-700 font-bold text-sm animate-pulse">
            <Timer className="h-4 w-4" />
            <span>Seats held for: {minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
    );
};

export default function NewBookingPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const routeId = searchParams.get('routeId');
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        seats: 1,
        seatNumbers: [] as string[],
        passengerName: user?.name || '',
        passengerPhone: user?.phone || '',
        passengerEmail: user?.email || '',
        passengerAge: '',
        passengerGender: '',
        pickupLocation: '',
        dropLocation: '',
        paymentMethod: 'pay_later' as 'online' | 'pay_later',
        insurance: false,
        agreeTerms: false,
    });

    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);


    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => {
                resolve(true);
            };
            script.onerror = () => {
                resolve(false);
            };
            document.body.appendChild(script);
        });
    };

    const handlePayment = async (booking: any) => {
        try {
            const res = await loadRazorpayScript();

            if (!res) {
                toast.dismiss('payment-init');
                toast.error('Razorpay SDK failed to load. Are you online?');
                navigate(`/bookings/${booking.id}`);
                return;
            }

            // Create Order
            const orderData = await api.post<any>('/payments/create-order', {
                bookingId: booking.id,
                amount: booking.totalAmount
            });

            console.log('Order created:', orderData);

            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Bus Booking System",
                description: `Booking #${booking.id}`,
                order_id: orderData.orderId,
                handler: async function (response: any) {
                    try {
                        await api.post('/payments/verify', {
                            bookingId: booking.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        toast.success('Payment successful!');
                        navigate(`/bookings/${booking.id}`);
                    } catch (err) {
                        console.error(err);
                        toast.error('Payment verification failed');
                        navigate(`/bookings/${booking.id}`);
                    }
                },
                prefill: {
                    name: formData.passengerName,
                    email: formData.passengerEmail,
                    contact: formData.passengerPhone
                },
                theme: {
                    color: "#2563eb"
                },
                modal: {
                    ondismiss: function () {
                        toast('Payment cancelled');
                        navigate(`/bookings/${booking.id}`);
                    }
                }
            };

            if (!(window as any).Razorpay) {
                toast.dismiss('payment-init');
                toast.error('Razorpay SDK not loaded');
                navigate(`/bookings/${booking.id}`);
                return;
            }

            const paymentObject = new (window as any).Razorpay(options);

            paymentObject.on('payment.failed', function (response: any) {
                toast.error(response.error.description);
                navigate(`/bookings/${booking.id}`);
            });

            toast.dismiss('payment-init');
            paymentObject.open();

        } catch (error) {
            console.error('Payment initialization error:', error);
            toast.dismiss('payment-init');
            toast.error('Payment initialization failed. Please try from booking details.');
            // Make sure we navigate to booking details even on error so user isn't stuck
            navigate(`/bookings/${booking.id}`);
        }
    };

    // Fetch route details
    const { data: route, isLoading: routeLoading, error: routeError } = useQuery<Route>({
        queryKey: ['route', routeId],
        queryFn: () => api.get(`/routes/${routeId}`),
        enabled: !!routeId,
    });

    const finalSeatCount = selectedSeats.length > 0 ? selectedSeats.length : Number(formData.seats);

    // Reset promo when seat count changes
    useEffect(() => {
        if (appliedPromo) {
            setAppliedPromo(null);
            setPromoCode(''); // Clear input as well
            toast('Promo code removed due to selection change', { icon: 'ℹ️' });
        }
    }, [finalSeatCount, routeId]);

    const handleApplyPromo = async () => {
        if (!promoCode || !route) return;

        setIsApplyingPromo(true);
        try {
            const bookingAmount = route.price * finalSeatCount;
            const response = await api.post('/promo-codes/apply', {
                code: promoCode,
                bookingAmount,
                routeId: route.id
            });
            setAppliedPromo(response);
            toast.success('Promo code applied successfully');
        } catch (error) {
            setAppliedPromo(null);
            toast.error(api.getErrorMessage(error));
        } finally {
            setIsApplyingPromo(false);
        }
    };

    // Create booking mutation
    const createBookingMutation = useMutation({
        mutationFn: (data: any) => {
            const payload = { ...data };
            if (!payload.passengerEmail) {
                delete payload.passengerEmail;
            }
            return api.post('/bookings', payload);
        },
        onSuccess: async (booking: any) => {
            if (formData.paymentMethod === 'online') {
                toast.loading('Initializing payment...', { id: 'payment-init' });
                await handlePayment(booking);
            } else {
                toast.success('Booking created successfully!');
                navigate(`/bookings/${booking.id}`);
            }
        },
        onError: (error: any) => {
            const errorMessage = api.getErrorMessage(error);
            setErrors([errorMessage]);

            // If seats are already booked, refresh the seat map immediately
            if (errorMessage.includes('booked') || errorMessage.includes('available')) {
                queryClient.invalidateQueries({ queryKey: ['seat-availability', routeId] });
                queryClient.invalidateQueries({ queryKey: ['route', routeId] });
                toast.error(errorMessage, { duration: 5000 });
                // Optional: Clear selected seats that are in conflict? 
                // For now, let the user see the error and the updated map (which will show booked seats in red)
            }

            if (error.response?.data?.errors) {
                const validationErrors = Object.entries(error.response.data.errors).flatMap(
                    ([field, messages]: [string, any]) =>
                        Array.isArray(messages) ? messages.map((msg) => `${field}: ${msg}`) : [`${field}: ${messages}`]
                );
                setErrors(validationErrors);
            }
        },
    });

    useEffect(() => {
        if (!routeId) {
            toast.error('Route ID is missing');
            navigate('/search');
        }
    }, [routeId, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        if (!routeId) {
            setErrors(['Route ID is missing']);
            return;
        }

        if (!route) {
            setErrors(['Route details not found']);
            return;
        }

        if (!formData.passengerName || !formData.passengerPhone || !formData.passengerAge || !formData.passengerGender) {
            setErrors(['Please fill in all required passenger details']);
            return;
        }

        if (!formData.agreeTerms) {
            setErrors(['You must agree to the Terms & Conditions']);
            return;
        }

        if (!formData.pickupLocation) {
            setErrors(['Please select a pickup point']);
            return;
        }

        if (!formData.dropLocation) {
            setErrors(['Please select a drop point']);
            return;
        }

        if (formData.seats < 1) {
            setErrors(['Please select at least 1 seat']);
            return;
        }

        if (route && finalSeatCount > route.availableSeats) {
            setErrors([`Only ${route.availableSeats} seats available`]);
            return;
        }

        // Time validation: Booking allowed up to 30 mins before departure
        try {
            const dateStr = format(new Date(route.date), 'yyyy-MM-dd');
            const departureDateTime = new Date(`${dateStr}T${route.departureTime}`);
            const now = new Date();

            const diffInMinutes = (departureDateTime.getTime() - now.getTime()) / (1000 * 60);

            if (diffInMinutes < 30) {
                setErrors(['Booking closed. Tickets must be booked at least 30 minutes before departure.']);
                return;
            }
        } catch (e) {
            console.error('Date validation error:', e);
            // Fallback: allow booking if date parsing fails to avoid blocking users due to technical error
        }

        // Phone validation
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.passengerPhone)) {
            setErrors(['Please enter a valid 10-digit mobile number starting with 6-9']);
            return;
        }

        // Email validation
        if (formData.passengerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.passengerEmail)) {
                setErrors(['Please enter a valid email address']);
                return;
            }
        }

        // Age validation
        const age = parseInt(formData.passengerAge);
        if (isNaN(age) || age < 5 || age > 120) {
            setErrors(['Please enter a valid age between 5 and 120']);
            return;
        }

        if (selectedSeats.length > 0 && selectedSeats.length !== finalSeatCount) {
            setErrors(['Number of selected seats must match the seat count']);
            return;
        }

        const bookingData = {
            routeId,
            seats: finalSeatCount,
            ...(selectedSeats.length > 0 && { seatNumbers: selectedSeats }),
            passengerName: formData.passengerName.trim(),
            passengerPhone: formData.passengerPhone.trim(),
            ...(formData.passengerEmail && { passengerEmail: formData.passengerEmail.trim() }),
            ...(formData.pickupLocation && { pickupLocation: formData.pickupLocation.trim() }),
            ...(formData.dropLocation && { dropLocation: formData.dropLocation.trim() }),
            ...(formData.paymentMethod && { paymentMethod: formData.paymentMethod }),
            ...(appliedPromo && {
                promoCodeId: appliedPromo.promoCodeId,
                promoCode: appliedPromo.code
            }),
            passengerAge: formData.passengerAge,
            passengerGender: formData.passengerGender,
            hasInsurance: formData.insurance,
        };

        createBookingMutation.mutate(bookingData);
    };

    // Calculate duration helper
    const calculateDuration = (dep: string, arr?: string) => {
        if (!dep || !arr) return 'N/A';
        const [depH, depM] = dep.split(':').map(Number);
        const [arrH, arrM] = arr.split(':').map(Number);

        let diffMins = (arrH * 60 + arrM) - (depH * 60 + depM);
        if (diffMins < 0) diffMins += 24 * 60; // Assume next day if arrival is earlier

        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return `${h}h ${m}m`;
    };

    if (routeLoading) {
        return (
            <div className="min-h-screen bg-gray-50/50 pb-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="animate-pulse space-y-8">
                        {/* Stepper Skeleton */}
                        <div className="flex justify-between max-w-3xl mx-auto mb-12">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </div>
                            ))}
                        </div>
                        {/* Header Skeleton */}
                        <div className="space-y-3">
                            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        {/* Card Skeleton */}
                        <div className="h-64 bg-gray-200 rounded-2xl"></div>
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl"></div>
                            <div className="h-96 bg-gray-200 rounded-2xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (routeError || !route) {
        return (
            <div className="card text-center py-12">
                <ErrorMessage
                    message="Route not found"
                    details={routeError ? [api.getErrorMessage(routeError)] : undefined}
                    onDismiss={() => navigate('/search')}
                />
                <button onClick={() => navigate('/search')} className="btn btn-primary mt-4">
                    Back to Search
                </button>
            </div>
        );
    }

    const insuranceCost = formData.insurance ? 15 * finalSeatCount : 0;
    const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
    const totalAmount = Math.max(0, (route.price * finalSeatCount) + insuranceCost - discountAmount);

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 animate-fadeIn relative overflow-hidden">
            <SEO
                title={route ? `Book Bus – ${route.fromCity} to ${route.toCity}` : 'New Booking'}
                description={route ? `Book your bus seat from ${route.fromCity} to ${route.toCity} on ${format(new Date(route.date), 'dd MMM yyyy')}. Secure payment, instant e-ticket.` : 'Complete your bus booking on BusBook.'}
                noIndex={true}
            />
            {/* Abstract Background Shapes */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-50/50 rounded-full blur-3xl opacity-30 translate-x-1/4 -translate-y-1/4"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl opacity-30 -translate-x-1/4 translate-y-1/4"></div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Progress Stepper */}
                <div className="mb-12">
                    <div className="flex items-center justify-between max-w-3xl mx-auto relative">
                        {/* Line Background */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 -z-10"></div>
                        <div
                            className="absolute top-1/2 left-0 h-0.5 bg-primary-600 -translate-y-1/2 -z-10 transition-all duration-500"
                            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                        ></div>

                        {[
                            { step: 1, label: 'Seat Selection', icon: Users },
                            { step: 2, label: 'Passenger Details', icon: User },
                            { step: 3, label: 'Payment', icon: CreditCard },
                        ].map((item) => (
                            <div key={item.step} className="flex flex-col items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${currentStep >= item.step
                                    ? 'bg-primary-600 border-primary-100 text-white shadow-lg shadow-primary-500/30'
                                    : 'bg-white border-gray-100 text-gray-400'
                                    }`}>
                                    {currentStep > item.step ? <CheckCircle2 className="h-6 w-6" /> : <item.icon className="h-5 w-5" />}
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${currentStep >= item.step ? 'text-primary-600' : 'text-gray-400'
                                    }`}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Complete Your Booking</h2>
                        <p className="text-gray-500 mt-2">Review your route details and fill in passenger information</p>
                    </div>
                    {selectedSeats.length > 0 && (
                        <BookingTimer
                            duration={600}
                            onExpire={() => {
                                toast.error('Seat hold expired. Please select seats again.');
                                window.location.reload();
                            }}
                        />
                    )}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Route Summary Card */}
                        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-primary-500/20 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                            <div className="p-6 md:p-8 relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold opacity-90 flex items-center gap-2">
                                        <Bus className="h-5 w-5" /> Journey Details
                                    </h3>
                                    <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                                        Booking ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl font-bold">{route.fromCity}</div>
                                        <div className="flex flex-col items-center px-2">
                                            <span className="text-xs opacity-70 mb-1">{calculateDuration(route.departureTime, route.arrivalTime)}</span>
                                            <div className="w-16 h-px bg-white/40 relative">
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold">{route.toCity}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm opacity-80">Departure</div>
                                        <div className="text-xl font-bold">{format(new Date(route.date), 'EEE, MMM dd')} • {route.departureTime}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10">
                                    <div>
                                        <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">Bus Type</p>
                                        <div className="font-medium">AC Sleeper (2+1)</div>
                                    </div>
                                    <div>
                                        <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">Seat Availability</p>
                                        <div className="font-medium">{route.availableSeats} Seats Left</div>
                                    </div>
                                    <div>
                                        <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">Arrival</p>
                                        <div className="font-medium">{route.arrivalTime || '--:--'}</div>
                                    </div>
                                    <div>
                                        <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">Rating</p>
                                        <div className="flex items-center gap-1 font-medium">
                                            <Star className="h-3.5 w-3.5 fill-current" /> 4.5/5
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conditional Rendering based on currentStep */}
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 md:p-8 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                                                    <Users className="h-6 w-6" />
                                                </div>
                                                Select Seats
                                            </h3>
                                            <div className="text-sm font-bold text-primary-600 bg-primary-50 px-4 py-2 rounded-xl border border-primary-100 shadow-sm">
                                                {selectedSeats.length} Seats Selected
                                            </div>
                                        </div>

                                        <SeatSelection
                                            routeId={routeId!}
                                            selectedSeats={selectedSeats}
                                            onSeatSelect={(seats) => {
                                                setSelectedSeats(seats);
                                                setFormData({ ...formData, seats: seats.length || formData.seats });
                                            }}
                                            maxSeats={route.availableSeats}
                                        />

                                        <div className="mt-10 pt-8 border-t border-gray-100 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    if (selectedSeats.length === 0) {
                                                        toast.error('Please select at least one seat');
                                                        return;
                                                    }
                                                    setCurrentStep(2);
                                                }}
                                                className="btn btn-primary px-10 py-4 text-lg group shadow-lg shadow-primary-500/30 rounded-2xl hover:shadow-primary-500/50 hover:-translate-y-0.5 transition-all"
                                            >
                                                Next: Passenger Details
                                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-2 inline-block" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-8"
                                >
                                    {/* Passenger Information */}
                                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 md:p-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-8">
                                                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 text-primary-600 rounded-xl">
                                                        <User className="h-6 w-6" />
                                                    </div>
                                                    Passenger Information
                                                </h3>
                                                <button
                                                    onClick={() => setCurrentStep(1)}
                                                    className="text-sm font-bold text-gray-400 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 px-4 py-2 rounded-xl transition-colors"
                                                >
                                                    Change Seats
                                                </button>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Full Name</label>
                                                    <div className="relative">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                            placeholder="As per ID proof"
                                                            value={formData.passengerName}
                                                            onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Mobile Number</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                        <input
                                                            type="tel"
                                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                            placeholder="10-digit mobile"
                                                            value={formData.passengerPhone}
                                                            onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-gray-700">Email Address (Optional)</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                        <input
                                                            type="email"
                                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                            placeholder="For e-ticket"
                                                            value={formData.passengerEmail}
                                                            onChange={(e) => setFormData({ ...formData, passengerEmail: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-gray-700">Age</label>
                                                        <input
                                                            type="number"
                                                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                            placeholder="Age"
                                                            value={formData.passengerAge}
                                                            onChange={(e) => setFormData({ ...formData, passengerAge: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-bold text-gray-700">Gender</label>
                                                        <select
                                                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                            value={formData.passengerGender}
                                                            onChange={(e) => setFormData({ ...formData, passengerGender: e.target.value })}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="male">Male</option>
                                                            <option value="female">Female</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Boarding & Drop Points */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                                <MapPin className="h-5 w-5 text-primary-600" /> Boarding & Drop Points
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-sm font-bold text-gray-700">Pickup Point</label>
                                                    <div className="space-y-3">
                                                        {(route.pickupPoints || []).map((point: string) => (
                                                            <label key={point} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.pickupLocation === point ? 'border-primary-600 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                                                                }`}>
                                                                <input
                                                                    type="radio"
                                                                    name="pickup"
                                                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                                                                    checked={formData.pickupLocation === point}
                                                                    onChange={() => setFormData({ ...formData, pickupLocation: point })}
                                                                />
                                                                <span className="font-medium text-gray-900">{point}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-sm font-bold text-gray-700">Drop Point</label>
                                                    <div className="space-y-3">
                                                        {(route.dropPoints || []).map((point: string) => (
                                                            <label key={point} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.dropLocation === point ? 'border-primary-600 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                                                                }`}>
                                                                <input
                                                                    type="radio"
                                                                    name="drop"
                                                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                                                                    checked={formData.dropLocation === point}
                                                                    onChange={() => setFormData({ ...formData, dropLocation: point })}
                                                                />
                                                                <span className="font-medium text-gray-900">{point}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-4">
                                            <button
                                                onClick={() => setCurrentStep(1)}
                                                className="text-gray-500 font-bold hover:text-gray-700"
                                            >
                                                Back to Seats
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!formData.passengerName || !formData.passengerPhone || !formData.passengerAge || !formData.passengerGender || !formData.pickupLocation || !formData.dropLocation) {
                                                        toast.error('Please fill in all details');
                                                        return;
                                                    }
                                                    setCurrentStep(3);
                                                }}
                                                className="btn btn-primary px-10 py-4 text-lg group shadow-[0_8px_30px_rgb(37,99,235,0.3)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.5)] rounded-2xl hover:-translate-y-0.5 transition-all"
                                            >
                                                Next: Review & Pay
                                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-2 inline-block" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-8"
                                >
                                    {/* Insurance */}
                                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 md:p-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                                    <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                                                        <ShieldCheck className="h-6 w-6" />
                                                    </div>
                                                    Travel Insurance
                                                </h3>
                                                <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg shadow-sm">RECOMMENDED</span>
                                            </div>
                                            <div className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${formData.insurance ? 'border-primary-600 bg-primary-50/50 shadow-md shadow-primary-500/10' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50'
                                                }`} onClick={() => setFormData({ ...formData, insurance: !formData.insurance })}>
                                                <div className="flex items-start gap-5">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${formData.insurance ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'
                                                        }`}>
                                                        {formData.insurance && <CheckCircle2 className="h-4 w-4" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <p className="text-lg font-bold text-gray-900">Secure your trip for just ₹15 / person</p>
                                                            <p className="text-lg font-black text-primary-600">₹{15 * finalSeatCount}</p>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">Coverage up to ₹5,00,000 for accidents, hospitalization, and loss of baggage.</p>
                                                        <div className="grid grid-cols-2 bg-white rounded-xl p-4 gap-4 border border-gray-50">
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Accidental Cover</div>
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Emergency Medical</div>
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Baggage Loss</div>
                                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Trip Cancellation</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 md:p-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                                    <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                                                        <CreditCard className="h-6 w-6" />
                                                    </div>
                                                    Payment Method
                                                </h3>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <label className={`flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'online' ? 'border-primary-600 bg-primary-50/50 shadow-md shadow-primary-500/10' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50'
                                                    }`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className={`p-3 rounded-xl shadow-sm ${formData.paymentMethod === 'online' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                            <Zap className="h-6 w-6" />
                                                        </div>
                                                        <input
                                                            type="radio"
                                                            name="payment"
                                                            className="h-5 w-5 text-primary-600 focus:ring-primary-500"
                                                            checked={formData.paymentMethod === 'online'}
                                                            onChange={() => setFormData({ ...formData, paymentMethod: 'online' })}
                                                        />
                                                    </div>
                                                    <p className="font-bold text-gray-900 text-lg">Pay Online Now</p>
                                                    <p className="text-sm text-gray-500 mt-1">UPI, Cards, Netbanking</p>
                                                </label>
                                                <label className={`flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'pay_later' ? 'border-primary-600 bg-primary-50/50 shadow-md shadow-primary-500/10' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50'
                                                    }`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className={`p-3 rounded-xl shadow-sm ${formData.paymentMethod === 'pay_later' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                            <Clock className="h-6 w-6" />
                                                        </div>
                                                        <input
                                                            type="radio"
                                                            name="payment"
                                                            className="h-5 w-5 text-primary-600 focus:ring-primary-500"
                                                            checked={formData.paymentMethod === 'pay_later'}
                                                            onChange={() => setFormData({ ...formData, paymentMethod: 'pay_later' })}
                                                        />
                                                    </div>
                                                    <p className="font-bold text-gray-900 text-lg">Reserve & Pay Later</p>
                                                    <p className="text-sm text-gray-500 mt-1">Pay at the boarding point</p>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4">
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="text-gray-500 font-bold hover:text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            Back to Details
                                        </button>
                                        <form onSubmit={handleSubmit}>
                                            <label className="flex items-center gap-3 mb-6 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                    checked={formData.agreeTerms}
                                                    onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                                                />
                                                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                                                    I agree to the <span className="text-primary-600 font-bold">Terms & Conditions</span> and privacy policy
                                                </span>
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={createBookingMutation.isPending}
                                                className="w-full btn btn-primary px-12 py-5 text-xl shadow-[0_8px_30px_rgb(37,99,235,0.3)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.5)] rounded-2xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                            >
                                                {createBookingMutation.isPending ? 'Processing...' : `Confirm Booking • ₹${totalAmount.toFixed(2)}`}
                                            </button>
                                        </form>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Sidebar Summary */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Price Breakdown</h3>

                            {/* Promo Code Section */}
                            <div className="space-y-3 mb-6">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="ENTER CODE"
                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm uppercase font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                        disabled={!!appliedPromo || isApplyingPromo}
                                    />
                                    {appliedPromo ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAppliedPromo(null);
                                                setPromoCode('');
                                                toast.success('Promo code removed');
                                            }}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Remove
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleApplyPromo}
                                            disabled={!promoCode || isApplyingPromo}
                                            className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {isApplyingPromo ? '...' : 'Apply'}
                                        </button>
                                    )}
                                </div>
                                {appliedPromo && (
                                    <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 flex items-center gap-2 font-medium border border-green-100">
                                        <Tag className="h-3.5 w-3.5" />
                                        Code {appliedPromo.code} applied successfully
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pb-6 border-b border-gray-100">
                                <div className="flex justify-between text-gray-600">
                                    <span>Seat Price (x{finalSeatCount})</span>
                                    <span className="font-medium text-gray-900">₹{(route.price * finalSeatCount).toFixed(2)}</span>
                                </div>

                                {/* Travel Insurance Option */}
                                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-primary-200 hover:bg-primary-50/30 transition-all group">
                                    <div className="pt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={formData.insurance}
                                            onChange={(e) => setFormData({ ...formData, insurance: e.target.checked })}
                                            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 flex items-center gap-1.5 text-sm">
                                            <ShieldCheck className="h-4 w-4 text-green-600" />
                                            Travel Insurance
                                        </div>
                                        <p className="text-gray-500 text-xs mt-0.5 group-hover:text-gray-600">Secure your trip for just ₹15/person</p>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">₹{15 * finalSeatCount}</span>
                                </label>

                                {formData.insurance && (
                                    <div className="flex justify-between text-gray-600 text-sm pl-2">
                                        <span>Insurance Premium</span>
                                        <span className="font-medium">₹{(15 * finalSeatCount).toFixed(2)}</span>
                                    </div>
                                )}

                                {appliedPromo && (
                                    <div className="flex justify-between text-green-600 text-sm font-medium">
                                        <span>Discount ({appliedPromo.code})</span>
                                        <span>-₹{appliedPromo.discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center py-4">
                                <span className="text-lg font-bold text-gray-900">Total Payable</span>
                                <span className="text-2xl font-bold text-primary-600">₹{totalAmount.toFixed(2)}</span>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="space-y-4 pt-2">
                                <p className="text-sm font-bold text-gray-900">Payment Method</p>
                                <div className="space-y-3">
                                    <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'online' ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="online"
                                            checked={formData.paymentMethod === 'online'}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                                            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                            <span className="font-medium text-gray-900">Pay Online</span>
                                            <div className="flex gap-1.5">
                                                <div className="w-8 h-5 bg-blue-600 rounded"></div>
                                                <div className="w-8 h-5 bg-red-500 rounded"></div>
                                                <div className="w-8 h-5 bg-yellow-500 rounded"></div>
                                            </div>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'pay_later' ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="pay_later"
                                            checked={formData.paymentMethod === 'pay_later'}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                                            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                        />
                                        <div className="flex-1">
                                            <span className="font-medium text-gray-900">Pay on Boarding</span>
                                            <p className="text-xs text-gray-500 mt-0.5">Pay cash when you board the bus</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {errors.length > 0 && (
                                <ErrorMessage
                                    message="Please fix the following errors:"
                                    details={errors}
                                    onDismiss={() => setErrors([])}
                                />
                            )}

                            <div className="pt-2">
                                <label className="flex gap-3 items-start text-xs text-gray-500 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.agreeTerms}
                                        onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                                        className="mt-0.5 rounded text-primary-600 border-gray-300 focus:ring-primary-500"
                                    />
                                    <span className="group-hover:text-gray-700 transition-colors">
                                        I agree to the <span className="text-primary-600 underline font-medium">Terms & Conditions</span> and <span className="text-primary-600 underline font-medium">Privacy Policy</span>.
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                form="booking-form"
                                className="w-full btn btn-primary py-4 text-lg font-bold shadow-lg shadow-primary-500/30 rounded-xl hover:shadow-primary-500/50 hover:-translate-y-0.5 transition-all"
                                disabled={createBookingMutation.isPending}
                            >
                                {createBookingMutation.isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Processing...
                                    </span>
                                ) : (
                                    <span>Proceed to Pay ₹{totalAmount.toFixed(2)}</span>
                                )}
                            </button>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> 100% Safe & Secure Payment
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
