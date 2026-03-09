import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import AuthLayout from '../../components/AuthLayout';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Lock } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { toast.error('Please enter your email address'); return; }
        try {
            setLoading(true);
            await api.post('/auth/forgot-password', { email });
            setSuccess(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout panel={{
            headline: 'Locked out? We\'ve got you.',
            sub: 'Enter your email and we\'ll send you a secure link to reset your password in seconds.',
            features: [
                { icon: ShieldCheck, text: 'Secure one-time reset link' },
                { icon: Clock, text: 'Link expires in 1 hour for safety' },
                { icon: Lock, text: 'Your password is never stored in plain text' },
            ],
        }}>
            <SEO title="Forgot Password – BusBook" description="Reset your BusBook account password." />

            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>

            {success ? (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                    <div className="flex justify-center mb-5">
                        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Check your inbox!</h2>
                    <p className="text-gray-500 text-sm mb-1">We sent a password reset link to</p>
                    <p className="font-bold text-gray-900 mb-6">{email}</p>
                    <p className="text-xs text-gray-400 mb-8">Didn't get it? Check your spam folder, or{' '}
                        <button onClick={() => setSuccess(false)} className="text-primary-600 font-semibold hover:underline">try again</button>.
                    </p>
                    <Link to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 shadow-lg shadow-primary-500/30 hover:-translate-y-0.5 transition-all duration-300">
                        Back to sign in
                    </Link>
                </motion.div>
            ) : (
                <>
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-gray-900 mb-1">Reset password</h2>
                        <p className="text-sm text-gray-500">We'll email you a secure link to reset your password.</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input type="email" id="email" required placeholder="you@example.com"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-10 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm outline-none transition-all" />
                            </div>
                        </div>

                        <button type="submit" disabled={loading || !email}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                            {loading
                                ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><Send className="h-4 w-4" />Send reset link</>}
                        </button>
                    </form>
                </>
            )}
        </AuthLayout>
    );
}
