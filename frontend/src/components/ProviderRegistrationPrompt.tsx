import { useState } from 'react';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, ShieldCheck, Mail, Phone, MapPin, Navigation, UserCheck } from 'lucide-react';
import PincodeCityStateFields from './PincodeCityStateFields';
import toast from 'react-hot-toast';
import { handleApiError } from '../lib/errorHandler';
import { motion, AnimatePresence } from 'framer-motion';

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

  const inputClasses = (error?: string) => `
    w-full pl-11 pr-4 py-3 bg-gray-50 border-2 rounded-2xl font-bold text-sm
    transition-all duration-300 outline-none
    ${error 
      ? 'border-rose-100 focus:border-rose-500 bg-rose-50/30' 
      : 'border-transparent focus:border-primary-500 focus:bg-white'}
  `;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-2xl shadow-gray-200 border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
          <div className="h-20 w-20 rounded-[32px] bg-primary-50 flex items-center justify-center text-primary-600 shadow-inner">
            <Building2 className="h-10 w-10" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 mb-2">
               <ShieldCheck className="h-3 w-3" /> Secure Enrollment
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Organization Profile</h2>
            <p className="text-gray-500 font-medium">Finalize your structural credentials to unlock operational tools</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Legal Entity Name</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className={inputClasses(errors.companyName)}
                  value={formData.companyName}
                  onChange={(e) => { setFormData({ ...formData, companyName: e.target.value }); if (errors.companyName) setErrors((e) => ({ ...e, companyName: '' })); }}
                  placeholder="e.g. Paramount Express"
                />
              </div>
              <AnimatePresence>
                {errors.companyName && (
                  <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.companyName}</motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Authorized Signatory</label>
              <div className="relative">
                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className={inputClasses(errors.contactName)}
                  value={formData.contactName}
                  onChange={(e) => { setFormData({ ...formData, contactName: e.target.value }); if (errors.contactName) setErrors((e) => ({ ...e, contactName: '' })); }}
                  placeholder="Official Representative Name"
                />
              </div>
              {errors.contactName && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.contactName}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operations Contact</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  className={inputClasses(errors.contactPhone)}
                  value={formData.contactPhone}
                  onChange={(e) => { setFormData({ ...formData, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }); if (errors.contactPhone) setErrors((e) => ({ ...e, contactPhone: '' })); }}
                  placeholder="10-digit Primary Mobile"
                />
              </div>
              {errors.contactPhone && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.contactPhone}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Email <span className="text-gray-300 font-bold">(OPT)</span></label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  className={inputClasses(errors.contactEmail)}
                  value={formData.contactEmail}
                  onChange={(e) => { setFormData({ ...formData, contactEmail: e.target.value }); if (errors.contactEmail) setErrors((e) => ({ ...e, contactEmail: '' })); }}
                  placeholder="billing@company.com"
                />
              </div>
              {errors.contactEmail && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.contactEmail}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Primary Operations Base</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
              <textarea
                className={`${inputClasses(errors.address)} h-32 pt-4 resize-none`}
                value={formData.address}
                onChange={(e) => { setFormData({ ...formData, address: e.target.value }); if (errors.address) setErrors((e) => ({ ...e, address: '' })); }}
                placeholder="Complete Registered Address"
              />
            </div>
            {errors.address && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.address}</p>}
          </div>

          <div className="bg-gray-50/50 p-8 rounded-[32px] border border-gray-100 border-dashed">
            <div className="flex items-center gap-2 mb-6 ml-1">
               <Navigation className="h-3 w-3 text-primary-500" />
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Geographic Validation</p>
            </div>
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
              inputClass="w-full px-6 py-3.5 bg-white border-2 border-transparent focus:border-primary-500 rounded-2xl font-bold text-sm transition-all focus:bg-white outline-none shadow-sm"
              pincodeLabel="POSTAL CODE"
              cityLabel="CITY/METRO"
              stateLabel="STATE/REGION"
              pincodePlaceholder="000 000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gray-900 text-white rounded-[24px] text-sm font-black uppercase tracking-widest shadow-2xl shadow-gray-200 hover:bg-primary-600 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                Initializing Assets...
              </>
            ) : (
              <>
                Authorize & Initialize Profile
                <ShieldCheck className="h-4 w-4 group-hover:scale-125 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 flex items-center justify-center gap-8 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><ShieldCheck className="h-4 w-4" /> ISO-9001 Certified</div>
         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><ShieldCheck className="h-4 w-4" /> SSL-256 Bit Encryption</div>
         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><ShieldCheck className="h-4 w-4" /> PCI-DSS Compliant</div>
      </div>
    </motion.div>
  );
}
