import { useQuery } from '@tanstack/react-query';
import SEO from '../../components/SEO';
import {
    Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp,
    CreditCard, Clock, Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';
import { userService } from '../../services/user.service';
import { queryKeys } from '../../lib/queryKeys';
import { motion, type Variants } from 'framer-motion';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const stagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } }
};

export default function WalletPage() {
    const { data: wallet, isLoading, refetch, isFetching } = useQuery({
        queryKey: queryKeys.users.wallet,
        queryFn: () => userService.getWallet(1, 50),
        staleTime: 30_000,
    });

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-36 bg-gray-100 rounded-3xl animate-pulse" />)}
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    const transactions = wallet?.transactions ?? [];
    const hasBalance = wallet && wallet.balance > 0;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 relative overflow-hidden">
            <SEO title="My Wallet" description="View your BusBook wallet balance and transaction history." />

            {/* Background blobs */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/8 rounded-full blur-[100px] translate-x-1/4 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Header */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible"
                    className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl shadow-lg shadow-primary-500/30">
                                <Wallet className="h-6 w-6 text-white" />
                            </div>
                            My Wallet
                        </h1>
                        <p className="text-gray-500 mt-1.5 ml-1">Balance & transaction history</p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </motion.div>

                {/* Stats Grid */}
                <motion.div variants={stagger} initial="hidden" animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Balance Card */}
                    <motion.div variants={fadeUp}
                        className="sm:col-span-1 relative overflow-hidden rounded-3xl p-6 shadow-2xl shadow-primary-500/20">
                        {/* Gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-indigo-600 to-violet-700" />
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 h-40 w-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
                        <div className="absolute bottom-0 left-0 h-24 w-24 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

                        <div className="relative">
                            <div className="flex items-center justify-between mb-5">
                                <div className="h-11 w-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <Wallet className="h-5 w-5 text-white" />
                                </div>
                                {hasBalance && (
                                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                        <Sparkles className="h-3 w-3 text-yellow-300" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Active</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-white/70 text-sm font-medium mb-1">Available Balance</p>
                            <p className="text-4xl font-black text-white tracking-tight tabular-nums">
                                {wallet ? formatCurrency(wallet.balance) : '₹0'}
                            </p>
                            {hasBalance && (
                                <p className="text-white/60 text-xs mt-2">Ready to use on your next booking</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Total Credits */}
                    <motion.div variants={fadeUp}
                        className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-11 w-11 bg-green-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <ArrowDownLeft className="h-5 w-5 text-green-600" />
                            </div>
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-wider">Credits</span>
                        </div>
                        <p className="text-gray-500 text-sm mb-1">Total Received</p>
                        <p className="text-2xl font-black text-green-600 tabular-nums">
                            {wallet ? formatCurrency(wallet.totalCredit) : '₹0'}
                        </p>
                        <div className="mt-3 h-1 bg-green-50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                                style={{ width: wallet && wallet.totalCredit > 0 ? '100%' : '0%', transition: 'width 1s ease' }} />
                        </div>
                    </motion.div>

                    {/* Total Debits */}
                    <motion.div variants={fadeUp}
                        className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-11 w-11 bg-red-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <ArrowUpRight className="h-5 w-5 text-red-500" />
                            </div>
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase tracking-wider">Debits</span>
                        </div>
                        <p className="text-gray-500 text-sm mb-1">Total Spent</p>
                        <p className="text-2xl font-black text-red-500 tabular-nums">
                            {wallet ? formatCurrency(wallet.totalDebit) : '₹0'}
                        </p>
                        <div className="mt-3 h-1 bg-red-50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full"
                                style={{ width: wallet && wallet.totalDebit > 0 ? '100%' : '0%', transition: 'width 1s ease' }} />
                        </div>
                    </motion.div>
                </motion.div>

                {/* Info Banner */}
                {wallet && wallet.balance === 0 && (
                    <motion.div variants={fadeUp} initial="hidden" animate="visible"
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-blue-900">Your wallet is empty</p>
                            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                                Wallet balance is credited on refunds and admin credits. It will be automatically applied to future bookings.
                            </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    </motion.div>
                )}

                {/* Transactions */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                            <Clock className="h-5 w-5 text-gray-400" />
                            Transaction History
                        </h2>
                        {transactions.length > 0 && (
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                                {transactions.length} transactions
                            </span>
                        )}
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="h-16 w-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <CreditCard className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="text-gray-700 font-bold text-lg mb-1">No transactions yet</p>
                            <p className="text-gray-400 text-sm">Your transaction history will appear here.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Table Header */}
                            <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>Type</span>
                                <span>Description</span>
                                <span className="text-right">Amount</span>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {transactions.map((tx, i) => {
                                    const isCredit = tx.type === 'CREDIT';
                                    return (
                                        <motion.div
                                            key={tx.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04, duration: 0.3 }}
                                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                                        >
                                            {/* Icon */}
                                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${isCredit ? 'bg-green-50' : 'bg-red-50'}`}>
                                                {isCredit
                                                    ? <ArrowDownLeft className="h-5 w-5 text-green-600" />
                                                    : <ArrowUpRight className="h-5 w-5 text-red-500" />
                                                }
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{tx.description}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                    {tx.status !== 'COMPLETED' && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                                            {tx.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="text-right shrink-0">
                                                <p className={`text-base font-black tabular-nums ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                                    {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
                                                    {isCredit ? 'Credit' : 'Debit'}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
