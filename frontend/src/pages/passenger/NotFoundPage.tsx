import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import SEO from '../../components/SEO';

export default function NotFoundPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const dashboardPath =
        user?.role === 'ADMIN'
            ? '/admin/dashboard'
            : user?.role === 'PROVIDER'
                ? '/provider/dashboard'
                : '/';

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans">
            <SEO
                title="404 — Page Not Found | BusBook"
                description="Sorry, we couldn't find the page you were looking for."
            />

            {/* Ambient background shapes */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[100px] opacity-40 translate-x-1/4 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] opacity-40 -translate-x-1/4 translate-y-1/4" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center max-w-md w-full"
            >
                {/* Giant 404 */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'backOut', delay: 0.1 }}
                    className="relative inline-block mb-6"
                >
                    <span className="text-[10rem] leading-none font-black bg-gradient-to-br from-primary-500 to-indigo-600 bg-clip-text text-transparent select-none">
                        404
                    </span>
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                        className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                    >
                        Oops!
                    </motion.div>
                </motion.div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                    Page not found
                </h1>
                <p className="text-gray-500 leading-relaxed mb-10">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 justify-center px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all duration-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </motion.button>

                    <Link to="/search">
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-flex items-center gap-2 justify-center px-6 py-3 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-lg shadow-primary-500/30 transition-all duration-200"
                        >
                            <Search className="h-4 w-4" />
                            Search Routes
                        </motion.div>
                    </Link>

                    <Link to={dashboardPath}>
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-flex items-center gap-2 justify-center px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200"
                        >
                            <Home className="h-4 w-4" />
                            Home
                        </motion.div>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
