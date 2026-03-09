import { Link } from 'react-router-dom';
import { Bus, Star, Shield, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
    children: React.ReactNode;
    panel?: {
        badge?: string;
        headline: string;
        sub: string;
        features?: { icon: React.ElementType; text: string }[];
    };
}

const defaultFeatures = [
    { icon: Shield, text: 'Bank-grade 256-bit SSL encryption' },
    { icon: Clock, text: 'Book in under 2 minutes' },
    { icon: MapPin, text: '500+ routes across India' },
    { icon: Star, text: '4.9 ★ rated by 50,000+ travellers' },
];

/** Floating background bus illustration (SVG paths) */
function BusIllustration() {
    return (
        <svg viewBox="0 0 480 320" className="w-full max-w-md opacity-90" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Road */}
            <rect x="20" y="250" width="440" height="40" rx="4" fill="white" fillOpacity="0.08" />
            <rect x="100" y="268" width="60" height="6" rx="3" fill="white" fillOpacity="0.25" />
            <rect x="210" y="268" width="60" height="6" rx="3" fill="white" fillOpacity="0.25" />
            <rect x="320" y="268" width="60" height="6" rx="3" fill="white" fillOpacity="0.25" />
            {/* Bus body */}
            <rect x="60" y="170" width="260" height="90" rx="14" fill="white" fillOpacity="0.18" />
            {/* Windows row */}
            <rect x="80" y="185" width="36" height="28" rx="6" fill="white" fillOpacity="0.4" />
            <rect x="128" y="185" width="36" height="28" rx="6" fill="white" fillOpacity="0.4" />
            <rect x="176" y="185" width="36" height="28" rx="6" fill="white" fillOpacity="0.4" />
            <rect x="224" y="185" width="36" height="28" rx="6" fill="white" fillOpacity="0.4" />
            <rect x="272" y="185" width="36" height="28" rx="6" fill="white" fillOpacity="0.35" />
            {/* Front */}
            <rect x="318" y="175" width="72" height="85" rx="10" fill="white" fillOpacity="0.22" />
            <rect x="328" y="188" width="48" height="32" rx="6" fill="white" fillOpacity="0.5" />
            {/* Wheels */}
            <circle cx="120" cy="258" r="18" fill="white" fillOpacity="0.25" />
            <circle cx="120" cy="258" r="9" fill="white" fillOpacity="0.4" />
            <circle cx="250" cy="258" r="18" fill="white" fillOpacity="0.25" />
            <circle cx="250" cy="258" r="9" fill="white" fillOpacity="0.4" />
            <circle cx="360" cy="258" r="18" fill="white" fillOpacity="0.25" />
            <circle cx="360" cy="258" r="9" fill="white" fillOpacity="0.4" />
            {/* Stars / dots */}
            <circle cx="420" cy="80" r="4" fill="white" fillOpacity="0.4" />
            <circle cx="50" cy="130" r="3" fill="white" fillOpacity="0.3" />
            <circle cx="440" cy="150" r="5" fill="white" fillOpacity="0.3" />
            <circle cx="30" cy="60" r="6" fill="white" fillOpacity="0.2" />
            {/* Route dots */}
            <circle cx="100" cy="110" r="5" fill="white" fillOpacity="0.5" />
            <line x1="100" y1="110" x2="200" y2="110" stroke="white" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="200" cy="110" r="5" fill="white" fillOpacity="0.5" />
            <line x1="200" y1="110" x2="340" y2="110" stroke="white" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="340" cy="110" r="5" fill="white" fillOpacity="0.5" />
            {/* Location pin */}
            <path d="M340 90 C340 82 350 75 360 75 C370 75 380 82 380 90 C380 102 360 118 360 118 C360 118 340 102 340 90Z" fill="white" fillOpacity="0.5" />
            <circle cx="360" cy="90" r="5" fill="white" fillOpacity="0.9" />
        </svg>
    );
}

export default function AuthLayout({ children, panel }: AuthLayoutProps) {
    const features = panel?.features ?? defaultFeatures;
    return (
        <div className="min-h-screen flex font-sans">

            {/* ── Left panel — gradient + illustration ────────────── */}
            <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-12 bg-gradient-to-br from-[#1e3a5f] via-[#1a4fa8] to-[#5c3df2] overflow-hidden shrink-0">
                {/* Background orbs */}
                <div className="absolute top-[-60px] right-[-60px] w-80 h-80 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute bottom-[-80px] left-[-40px] w-96 h-96 rounded-full bg-indigo-800/40 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-700/20 blur-3xl" />

                {/* Logo */}
                <Link to="/" className="relative flex items-center gap-3 group w-fit">
                    <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl border border-white/20 group-hover:bg-white/25 transition-colors">
                        <Bus className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-black text-white tracking-tight">BusBook</span>
                </Link>

                {/* Centre content */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="relative flex-1 flex flex-col justify-center gap-8 py-12"
                >
                    {panel?.badge && (
                        <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 w-fit">
                            <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
                            {panel.badge}
                        </span>
                    )}
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
                            {panel?.headline ?? 'Travel smarter, book faster.'}
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-sm">
                            {panel?.sub ?? 'Join millions of travellers who trust BusBook for safe, affordable, and comfortable journeys across India.'}
                        </p>
                    </div>

                    {/* Bus illustration */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <BusIllustration />
                    </motion.div>

                    {/* Feature list */}
                    <div className="grid grid-cols-1 gap-3">
                        {features.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/15 shrink-0">
                                        <Icon className="h-4 w-4 text-white/80" />
                                    </div>
                                    <span className="text-sm text-white/75">{f.text}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Bottom tagline */}
                <p className="relative text-xs text-white/40">
                    © 2025 BusBook. Safe & Secure Payments.
                </p>
            </div>

            {/* ── Right panel — form ────────────────────────────── */}
            <div className="flex-1 flex flex-col justify-center overflow-y-auto bg-white relative">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 pb-2">
                    <div className="bg-gradient-to-tr from-primary-600 to-indigo-600 p-2 rounded-xl">
                        <Bus className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xl font-black text-gray-900">BusBook</span>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="w-full max-w-md xl:max-w-lg mx-auto px-6 sm:px-10 py-10"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
}
