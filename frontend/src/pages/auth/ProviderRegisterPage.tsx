import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';
import { User, Mail, Phone, Lock, Building2, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { showSuccess } from '../../lib/errorHandler';
import ErrorMessage from '../../components/ErrorMessage';
import SEO from '../../components/SEO';
import PincodeCityStateFields from '../../components/PincodeCityStateFields';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import AuthLayout from '../../components/AuthLayout';
import { BarChart2, Shield, TrendingUp } from 'lucide-react';

const PASSWORD_MIN = 8;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^\d{6}$/;

const Field = ({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">⚠ {error}</p>}
  </div>
);

const inputCls = (err?: string) =>
  `w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none bg-gray-50 focus:bg-white ${err
    ? 'border-red-400 focus:ring-2 focus:ring-red-100'
    : 'border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
      <span className="flex-1 h-px bg-gray-100" />
      {title}
      <span className="flex-1 h-px bg-gray-100" />
    </h3>
    {children}
  </div>
);

export default function ProviderRegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    companyName: '', contactName: '', contactPhone: '', contactEmail: '',
    address: '', city: '', state: '', pincode: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (key: string, transform?: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = transform ? transform(e.target.value) : e.target.value;
      setFormData(f => ({ ...f, [key]: v }));
      if (fieldErrors[key]) setFieldErrors(fe => ({ ...fe, [key]: '' }));
    };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    else if (!PHONE_REGEX.test(formData.phone)) errs.phone = 'Enter valid 10-digit Indian mobile';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < PASSWORD_MIN) errs.password = `Min ${PASSWORD_MIN} characters`;
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) errs.password = 'Include uppercase, lowercase and a number';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!formData.companyName.trim()) errs.companyName = 'Company name is required';
    if (!formData.contactName.trim()) errs.contactName = 'Contact person name is required';
    if (!formData.contactPhone.trim()) errs.contactPhone = 'Contact phone is required';
    else if (!PHONE_REGEX.test(formData.contactPhone)) errs.contactPhone = 'Enter valid 10-digit mobile';
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) errs.contactEmail = 'Enter a valid email';
    if (formData.pincode && !PINCODE_REGEX.test(formData.pincode)) errs.pincode = 'Pincode must be 6 digits';
    if (!agreeTerms) errs.terms = 'Please accept the Terms and Privacy Policy';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setValidationErrors([]);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
      };
      const response = await api.post<any>('/auth/register/provider', payload);
      const accessToken = response.access_token ?? response.accessToken;
      if (response.user && accessToken) setAuth(response.user, accessToken);
      showSuccess('Provider account created successfully!');
      navigate('/provider/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) setValidationErrors(msg);
      else setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout panel={{
      badge: 'Join 1,200+ bus operators',
      headline: 'Grow your bus business with BusBook.',
      sub: 'List your routes, fill more seats, and manage everything from one powerful dashboard.',
      features: [
        { icon: BarChart2, text: 'Real-time booking analytics & reports' },
        { icon: TrendingUp, text: 'Automated payouts to your account' },
        { icon: Shield, text: 'Verified operator badge builds trust' },
      ],
    }}>
      <SEO title="Bus Operator Sign Up – BusBook" description="Register as a bus operator on BusBook." />

      <div className="mb-6">
        <Link to="/register" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h2 className="text-3xl font-black text-gray-900 mb-1">Operator sign up</h2>
        <p className="text-sm text-gray-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in →</Link>
        </p>
      </div>

      {(error || validationErrors.length > 0) && (
        <div className="mb-4">
          <ErrorMessage message={error || 'Please fix the errors below'} details={validationErrors.length > 0 ? validationErrors : undefined}
            onDismiss={() => { setError(null); setValidationErrors([]); }} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Account credentials ── */}
        <Section title="Your account">
          <Field label="Full name" required error={fieldErrors.name}>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Your full name" value={formData.name} onChange={set('name')} maxLength={100}
                className={`${inputCls(fieldErrors.name)} pl-10`} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" required error={fieldErrors.email}>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" placeholder="you@company.com" value={formData.email} onChange={set('email')}
                  className={`${inputCls(fieldErrors.email)} pl-10`} />
              </div>
            </Field>
            <Field label="Phone" required error={fieldErrors.phone}>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="tel" placeholder="10-digit" value={formData.phone}
                  onChange={set('phone', v => v.replace(/\D/g, '').slice(0, 10))}
                  className={`${inputCls(fieldErrors.phone)} pl-10`} />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Password" required error={fieldErrors.password}>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type={showPw ? 'text' : 'password'} placeholder="Min 8 chars" value={formData.password} onChange={set('password')} autoComplete="new-password"
                  className={`${inputCls(fieldErrors.password)} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm" required error={fieldErrors.confirmPassword}>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type={showCPw ? 'text' : 'password'} placeholder="Re-enter" value={formData.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password"
                  className={`${inputCls(fieldErrors.confirmPassword)} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowCPw(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
        </Section>

        {/* ── Business details ── */}
        <Section title="Business details">
          <Field label="Company / Business name" required error={fieldErrors.companyName}>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="e.g. Blue Star Travels" value={formData.companyName} onChange={set('companyName')} maxLength={150}
                className={`${inputCls(fieldErrors.companyName)} pl-10`} />
            </div>
          </Field>

          <Field label="Contact person name" required error={fieldErrors.contactName}>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Authorised contact" value={formData.contactName} onChange={set('contactName')} maxLength={100}
                className={`${inputCls(fieldErrors.contactName)} pl-10`} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact phone" required error={fieldErrors.contactPhone}>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="tel" placeholder="10-digit" value={formData.contactPhone}
                  onChange={set('contactPhone', v => v.replace(/\D/g, '').slice(0, 10))}
                  className={`${inputCls(fieldErrors.contactPhone)} pl-10`} />
              </div>
            </Field>
            <Field label="Contact email" error={fieldErrors.contactEmail}>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" placeholder="ops@company.com" value={formData.contactEmail} onChange={set('contactEmail')}
                  className={`${inputCls(fieldErrors.contactEmail)} pl-10`} />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── Business address ── */}
        <Section title="Business address">
          <AddressAutocomplete label="" value={formData.address}
            onChange={v => setFormData(f => ({ ...f, address: v }))}
            onSelect={r => {
              const a = r.address;
              setFormData(f => ({
                ...f,
                city: a.city || a.town || a.village || f.city,
                state: a.state || f.state,
                pincode: a.postcode || f.pincode,
              }));
            }}
            placeholder="Office / registered address" className="w-full" />

          <PincodeCityStateFields
            pincodeValue={formData.pincode}
            onPincodeChange={v => { setFormData(f => ({ ...f, pincode: v })); if (fieldErrors.pincode) setFieldErrors(fe => ({ ...fe, pincode: '' })); }}
            pincodeError={fieldErrors.pincode}
            cityValue={formData.city} onCityChange={v => setFormData(f => ({ ...f, city: v }))}
            stateValue={formData.state} onStateChange={v => setFormData(f => ({ ...f, state: v }))}
            pincodeFirst pincodePlaceholder="6-digit pincode" cityPlaceholder="City" statePlaceholder="State"
          />
        </Section>

        {/* Terms */}
        <div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={agreeTerms}
              onChange={e => { setAgreeTerms(e.target.checked); if (fieldErrors.terms) setFieldErrors(fe => ({ ...fe, terms: '' })); }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <Link to="/terms" className="text-primary-600 hover:underline font-medium">Terms</Link>{' & '}
              <Link to="/privacy" className="text-primary-600 hover:underline font-medium">Privacy Policy</Link>
            </span>
          </label>
          {fieldErrors.terms && <p className="mt-1 text-xs text-red-500">⚠ {fieldErrors.terms}</p>}
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
          {loading
            ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <>Create operator account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </AuthLayout>
  );
}
