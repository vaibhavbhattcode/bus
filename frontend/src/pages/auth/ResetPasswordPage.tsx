import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import AuthLayout from '../../components/AuthLayout';
import { ShieldCheck, KeyRound, Star } from 'lucide-react';

const rules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
];

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [showCPw, setShowCPw] = useState(false);

    useEffect(() => {
        if (!token) { toast.error('Invalid or missing reset token.'); navigate('/login'); }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
        if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        try {
            setLoading(true);
            await api.post('/auth/reset-password', { token, password });
            toast.success('Password reset successfully!');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) return null;

    const passwordOk = rules.every(r => r.test(password));
    const inputCls = 'w-full pl-10 pr-10 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm outline-none transition-all';

    return (
        <AuthLayout panel={{
            headline: 'Create a strong new password.',
            sub: 'Choose a password that\'s hard to guess but easy to remember.',
            features: [
                { icon: ShieldCheck, text: 'Hashed with bcrypt — never stored plaintext' },
                { icon: KeyRound, text: 'Reset link is single-use and expires in 1h' },
                { icon: Star, text: 'Use a mix of letters, numbers & symbols' },
            ],
        }}>
            <SEO title="Reset Password – BusBook" description="Create a new BusBook password." />

            <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 mb-1">New password</h2>
                <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type={showPw ? 'text' : 'password'} id="password" required placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)}
                            className={inputCls} />
                        <button type="button" onClick={() => setShowPw(p => !p)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* Live password strength indicators */}
                    {password.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            {rules.map(r => (
                                <div key={r.label} className="flex items-center gap-2">
                                    <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 transition-colors ${r.test(password) ? 'text-green-500' : 'text-gray-300'}`} />
                                    <span className={`text-xs transition-colors ${r.test(password) ? 'text-green-600' : 'text-gray-400'}`}>{r.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type={showCPw ? 'text' : 'password'} id="confirmPassword" required placeholder="••••••••"
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            className={`${inputCls} ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:ring-red-100' : ''}`} />
                        <button type="button" onClick={() => setShowCPw(p => !p)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showCPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                        <p className="mt-1 text-xs text-red-500">⚠ Passwords don't match</p>
                    )}
                </div>

                <button type="submit" disabled={loading || !passwordOk || !confirmPassword || password !== confirmPassword}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                    {loading
                        ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <>Reset Password <ArrowRight className="h-4 w-4" /></>}
                </button>

                <p className="text-center text-sm text-gray-500">
                    Remembered it?{' '}
                    <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link>
                </p>
            </form>
        </AuthLayout>
    );
}
