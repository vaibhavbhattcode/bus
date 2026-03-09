import { useState } from 'react';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, AlertCircle } from 'lucide-react';
import PincodeCityStateFields from './PincodeCityStateFields';
import toast from 'react-hot-toast';
import { handleApiError } from '../lib/errorHandler';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^\d{6}$/;

interface ProviderRegistrationPromptProps {
  onComplete?: () => void;
}

export default function ProviderRegistrationPrompt({ onComplete }: ProviderRegistrationPromptProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.companyName.trim()) errs.companyName = 'Company name is required';
    if (!formData.contactName.trim()) errs.contactName = 'Contact name is required';
    if (!formData.contactPhone.trim()) errs.contactPhone = 'Contact phone is required';
    else if (!PHONE_REGEX.test(formData.contactPhone.replace(/\s/g, '')))
      errs.contactPhone = 'Enter a valid 10-digit Indian mobile number';
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail))
      errs.contactEmail = 'Enter a valid email address';
    if (!formData.address.trim()) errs.address = 'Address is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.state.trim()) errs.state = 'State is required';
    if (!formData.pincode.trim()) errs.pincode = 'Pincode is required';
    else if (!PINCODE_REGEX.test(formData.pincode))
      errs.pincode = 'Pincode must be 6 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;
    setLoading(true);

    try {
      await api.post('/providers/register', {
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone.replace(/\s/g, ''),
        contactEmail: formData.contactEmail.trim() || undefined,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      });
      toast.success('Provider profile created successfully!');
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      queryClient.invalidateQueries({ queryKey: ['provider-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['provider-routes'] });
      if (onComplete) {
        onComplete();
      }
    } catch (error: unknown) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto animate-fadeIn">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary-50 rounded-2xl">
          <Building2 className="h-8 w-8 text-primary-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Complete Registration</h2>
          <p className="text-gray-500">Set up your provider profile to start managing your fleet</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-8 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-bold mb-1">Provider Profile Required</p>
          <p className="leading-relaxed">You have a provider account, but you need to complete your provider profile to access provider features like managing vehicles and routes.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${errors.companyName ? 'border-red-500' : 'border-gray-200'}`}
              value={formData.companyName}
              onChange={(e) => { setFormData({ ...formData, companyName: e.target.value }); if (errors.companyName) setErrors((e) => ({ ...e, companyName: '' })); }}
              placeholder="e.g. Blue Bus Travels"
              maxLength={150}
            />
            {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${errors.contactName ? 'border-red-500' : 'border-gray-200'}`}
              value={formData.contactName}
              onChange={(e) => { setFormData({ ...formData, contactName: e.target.value }); if (errors.contactName) setErrors((e) => ({ ...e, contactName: '' })); }}
              placeholder="Full Name"
              maxLength={100}
            />
            {errors.contactName && <p className="mt-1 text-sm text-red-500">{errors.contactName}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Contact Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${errors.contactPhone ? 'border-red-500' : 'border-gray-200'}`}
              value={formData.contactPhone}
              onChange={(e) => { setFormData({ ...formData, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }); if (errors.contactPhone) setErrors((e) => ({ ...e, contactPhone: '' })); }}
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            {errors.contactPhone && <p className="mt-1 text-sm text-red-500">{errors.contactPhone}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Contact Email <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none ${errors.contactEmail ? 'border-red-500' : 'border-gray-200'}`}
              value={formData.contactEmail}
              onChange={(e) => { setFormData({ ...formData, contactEmail: e.target.value }); if (errors.contactEmail) setErrors((e) => ({ ...e, contactEmail: '' })); }}
              placeholder="e.g. ops@yourcompany.com"
            />
            {errors.contactEmail && <p className="mt-1 text-sm text-red-500">{errors.contactEmail}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            className={`w-full px-4 py-2 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none ${errors.address ? 'border-red-500' : 'border-gray-200'}`}
            rows={3}
            value={formData.address}
            onChange={(e) => { setFormData({ ...formData, address: e.target.value }); if (errors.address) setErrors((e) => ({ ...e, address: '' })); }}
            placeholder="Office Address"
            maxLength={300}
          />
          {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
        </div>

        <div>
          <p className="block text-sm font-bold text-gray-700 mb-2">
            Enter pincode to auto-fill city & state <span className="text-red-500">*</span>
          </p>
          <PincodeCityStateFields
            pincodeValue={formData.pincode}
            onPincodeChange={(v) => {
              setFormData((prev) => ({ ...prev, pincode: v }));
              if (errors.pincode) setErrors((e) => ({ ...e, pincode: '' }));
            }}
            pincodeError={errors.pincode}
            cityValue={formData.city}
            onCityChange={(v) => { setFormData((prev) => ({ ...prev, city: v })); if (errors.city) setErrors((e) => ({ ...e, city: '' })); }}
            cityError={errors.city}
            stateValue={formData.state}
            onStateChange={(v) => { setFormData((prev) => ({ ...prev, state: v })); if (errors.state) setErrors((e) => ({ ...e, state: '' })); }}
            stateError={errors.state}
            pincodeFirst
            inputClass="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
            pincodeLabel="Pincode *"
            cityLabel="City *"
            stateLabel="State *"
            pincodePlaceholder="6 digits"
            cityPlaceholder="City / District"
            statePlaceholder="State"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-3 text-base font-bold rounded-xl shadow-lg hover:shadow-primary-200 transition-all transform active:scale-[0.98]"
        >
          {loading ? 'Creating Profile...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
}
