import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';
import { ArrowRight, Lock, Mail, Eye, EyeOff, Phone, MessageSquare } from 'lucide-react';
import { showSuccess } from '../../lib/errorHandler';
import ErrorMessage from '../../components/ErrorMessage';
import SEO from '../../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '../../components/AuthLayout';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ emailOrPhone: '', password: '', phone: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (loginMode === 'password') {
        const response = await api.post('/auth/login', { emailOrPhone: formData.emailOrPhone, password: formData.password });
        handleSuccess(response);
      } else {
        if (!otpSent) {
          await api.post('/otp/send', { phone: formData.phone });
          setOtpSent(true);
          showSuccess('OTP sent to ' + formData.phone);
        } else {
          const response = await api.post('/otp/verify', { phone: formData.phone, code: formData.otp });
          showSuccess('OTP Verified. Welcome back!');
          handleSuccess(response);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (data: any) => {
    setAuth(data.user, data.access_token || data.accessToken);
    if (keepSignedIn) {
      localStorage.setItem('keepSignedIn', '1');
    }
    navigate(data.user.role === 'ADMIN' ? '/admin/dashboard' : data.user.role === 'PROVIDER' ? '/provider/dashboard' : '/');
  };

  const inputCls = (hasErr?: boolean) =>
    `w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none bg-gray-50 focus:bg-white ${hasErr
      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
      : 'border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`;

  return (
    <AuthLayout panel={{ badge: 'Trusted by 50,000+ travellers', headline: 'Welcome back! Ready for your next journey?', sub: 'Sign in to access your bookings, track buses, and get exclusive deals.' }}>
      <SEO title="Login – BusBook" description="Sign in to your BusBook account." />

      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900 mb-1">Sign in</h2>
        <p className="text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">Create one free →</Link>
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6 gap-1">
        {(['password', 'otp'] as const).map(mode => (
          <button key={mode} type="button"
            onClick={() => { setLoginMode(mode); setError(null); setOtpSent(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${loginMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {mode === 'password' ? <><Lock className="h-3.5 w-3.5" />Password</> : <><Phone className="h-3.5 w-3.5" />OTP Login</>}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} onDismiss={() => setError(null)} /></div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div key={loginMode + otpSent}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }} className="space-y-4">

            {loginMode === 'password' ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email or Phone</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" id="emailOrPhone" placeholder="Enter email or phone" required
                      value={formData.emailOrPhone} onChange={set('emailOrPhone')}
                      className={`${inputCls()} pl-10`} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-gray-700">Password</label>
                    <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} id="password" placeholder="Enter password" required
                      value={formData.password} onChange={set('password')}
                      className={`${inputCls()} pl-10 pr-10`} />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                  <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="remember" checked={keepSignedIn} onChange={e => setKeepSignedIn(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <label htmlFor="remember" className="text-sm text-gray-600">Keep me signed in</label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <div className="flex">
                    <span className="flex items-center px-3.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm font-semibold text-gray-600">+91</span>
                    <input type="tel" id="phone" placeholder="10-digit mobile number" required disabled={otpSent}
                      value={formData.phone}
                      onChange={e => setFormData(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      className="flex-1 px-4 py-3 rounded-r-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm outline-none transition-all disabled:opacity-60 font-mono tracking-wider" />
                  </div>
                </div>
                {otpSent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enter OTP</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" id="otp" placeholder="6-digit OTP" required
                        value={formData.otp}
                        onChange={e => setFormData(f => ({ ...f, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        className={`${inputCls()} pl-10 text-center text-xl font-mono tracking-[0.5em]`} />
                    </div>
                    <p className="mt-2 text-xs text-center text-gray-500">
                      Didn't receive it?{' '}
                      <button type="button" onClick={() => { setOtpSent(false); setFormData(f => ({ ...f, otp: '' })); }}
                        className="text-primary-600 font-semibold hover:underline">Change number or resend</button>
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <button type="submit" disabled={loading || (loginMode === 'otp' && !otpSent && formData.phone.length !== 10)}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-2">
          {loading
            ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <>{loginMode === 'password' ? 'Sign in' : !otpSent ? 'Send OTP' : 'Verify & Login'}<ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <p className="mt-8 text-xs text-center text-gray-400">
        By signing in you agree to our{' '}
        <Link to="/terms" className="text-primary-600 hover:underline">Terms</Link> &{' '}
        <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  );
}
