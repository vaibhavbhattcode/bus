import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { User, Phone, Mail, Users, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import SeatSelection from './SeatSelection';
import CustomSelect from './CustomSelect';
import Modal from './Modal';

interface ProviderBookingModalProps {
  route: any;
  onClose: () => void;
}

export default function ProviderBookingModal({ route, onClose }: ProviderBookingModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: Seats, 2: Details
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    passengerName: '',
    passengerPhone: '',
    passengerEmail: '',
    passengerAge: '',
    passengerGender: 'male',
    status: 'CONFIRMED',
    paymentStatus: 'PAID', // Providers usually collect cash
  });
  const [errors, setErrors] = useState<string[]>([]);

  const createBookingMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (!payload.passengerEmail) {
        delete payload.passengerEmail;
      }
      return api.post('/bookings', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-routes'] });
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['seat-availability'] });
      toast.success('Booking created successfully');
      onClose();
    },
    onError: (error: any) => {
      setErrors([error.response?.data?.message || 'Failed to create booking']);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    if (selectedSeats.length === 0) {
      setErrors(['Please select at least one seat']);
      return;
    }

    if (!formData.passengerName || !formData.passengerPhone) {
      setErrors(['Name and Phone are required']);
      return;
    }

    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.passengerPhone)) {
      setErrors(['Please enter a valid 10-digit mobile number']);
      return;
    }

    // Email validation (if provided)
    if (formData.passengerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.passengerEmail)) {
      setErrors(['Please enter a valid email address']);
      return;
    }

    // Age validation
    const age = parseInt(formData.passengerAge);
    if (!age || age < 5 || age > 120) {
      setErrors(['Please enter a valid age between 5 and 120']);
      return;
    }

    const bookingData = {
      routeId: route.id,
      seats: selectedSeats.length,
      seatNumbers: selectedSeats,
      passengerName: formData.passengerName,
      passengerPhone: formData.passengerPhone,
      passengerEmail: formData.passengerEmail,
      passengerAge: parseInt(formData.passengerAge),
      passengerGender: formData.passengerGender,
      status: 'CONFIRMED', // Direct confirmation for provider bookings
      paymentStatus: formData.paymentStatus,
      paymentMethod: 'CASH', // Default for provider bookings
    };

    createBookingMutation.mutate(bookingData);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-lg font-bold text-gray-900">Book for Customer</h3>
          <p className="text-sm text-gray-500 font-normal">
            {route.fromCity} → {route.toCity} ({route.departureTime})
          </p>
        </div>
      }
    >
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex flex-col gap-1">
              {errors.map((e, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {e}
                </span>
              ))}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-2.5 bg-primary-50 rounded-xl">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Select Seats</h4>
                  <p className="text-sm text-gray-500">Choose seats for the passenger</p>
                </div>
              </div>
              
              <SeatSelection
                routeId={route.id}
                selectedSeats={selectedSeats}
                onSeatSelect={setSelectedSeats}
                maxSeats={route.availableSeats}
              />
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    if (selectedSeats.length > 0) setStep(2);
                    else toast.error('Please select at least one seat');
                  }}
                  className="btn btn-primary px-8 py-3 rounded-xl shadow-lg hover:shadow-primary-200 transition-all transform active:scale-[0.98]"
                  disabled={selectedSeats.length === 0}
                >
                  Next: Passenger Details
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      value={formData.passengerName}
                      onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                      required
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      value={formData.passengerPhone}
                      onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
                      maxLength={10}
                      required
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      value={formData.passengerEmail}
                      onChange={(e) => setFormData({ ...formData, passengerEmail: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Age *
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    value={formData.passengerAge}
                    onChange={(e) => setFormData({ ...formData, passengerAge: e.target.value })}
                    min="5"
                    max="120"
                    required
                    placeholder="Age"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Gender
                  </label>
                  <CustomSelect
                    value={formData.passengerGender}
                    onChange={(value) => setFormData({ ...formData, passengerGender: value })}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                    ]}
                    placeholder="Select Gender"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Payment Status
                  </label>
                  <div className="relative">
                    <CustomSelect
                      value={formData.paymentStatus}
                      onChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                      options={[
                        { value: 'PAID', label: 'Paid (Cash/UPI)' },
                        { value: 'PENDING', label: 'Pending (Pay later)' },
                      ]}
                      placeholder="Select Payment Status"
                      icon={<CreditCard className="w-4 h-4" />}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Selected Seats:</span>
                  <span className="font-bold text-gray-900">{selectedSeats.join(', ')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-primary-600">₹{route.price * selectedSeats.length}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-primary-600 text-white font-bold rounded-xl shadow-lg hover:bg-primary-700 hover:shadow-primary-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={createBookingMutation.isPending}
                >
                  {createBookingMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          )}
    </Modal>
  );
}
