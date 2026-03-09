import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import SEO from '../../components/SEO';
import {
    Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp,
    Loader2, CreditCard, Clock
} from 'lucide-react';

interface WalletData {
    id: string;
    balance: number;
    totalCredit: number;
    totalDebit: number;
    transactions: WalletTransaction[];
}

interface WalletTransaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    description: string;
    bookingId?: string;
    createdAt: string;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function WalletPage() {
    const { data: wallet, isLoading } = useQuery<WalletData>({
        queryKey: ['wallet'],
        queryFn: () => api.get('/wallet'),
    });

    const { data: txData } = useQuery<{ transactions: WalletTransaction[]; total: number }>({
        queryKey: ['wallet-transactions'],
        queryFn: () => api.get('/wallet/transactions?page=1&limit=50'),
        enabled: !!wallet,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
        );
    }

    const transactions = txData?.transactions || wallet?.transactions || [];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <SEO title="My Wallet" description="View your BusBook wallet balance and transaction history." />

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary-600" />
                    My Wallet
                </h1>
                <p className="text-gray-500 text-sm mt-1">Your balance and transaction history</p>
            </div>

            {/* Balance + stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Balance card */}
                <div className="sm:col-span-1 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary-600 via-indigo-600 to-violet-700 shadow-xl shadow-primary-500/30">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                    <div className="absolute bottom-0 left-0 h-20 w-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
                    <div className="relative">
                        <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                            <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-white/70 text-sm font-medium mb-1">Available Balance</p>
                        <p className="text-3xl font-black text-white tracking-tight">
                            {wallet ? formatCurrency(wallet.balance) : '₹0'}
                        </p>
                    </div>
                </div>

                {/* Total credit */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
                    <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                        <ArrowDownLeft className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Total Credits</p>
                        <p className="text-2xl font-bold text-green-600">{wallet ? formatCurrency(wallet.totalCredit) : '₹0'}</p>
                    </div>
                </div>

                {/* Total debit */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
                    <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center mb-3">
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Total Debits</p>
                        <p className="text-2xl font-bold text-red-500">{wallet ? formatCurrency(wallet.totalDebit) : '₹0'}</p>
                    </div>
                </div>
            </div>

            {/* Info banner */}
            {wallet && wallet.balance === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-blue-800">Your wallet is empty</p>
                        <p className="text-xs text-blue-600 mt-0.5">Wallet balance is credited on refunds and admin credits. Use it for future bookings.</p>
                    </div>
                </div>
            )}

            {/* Transactions */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    Transaction History
                </h2>

                {transactions.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <CreditCard className="h-7 w-7 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-semibold">No transactions yet</p>
                        <p className="text-gray-400 text-sm mt-1">Your transaction history will appear here.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {transactions.map((tx) => {
                                const isCredit = tx.type === 'CREDIT';
                                return (
                                    <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/60 transition-colors">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                                            {isCredit
                                                ? <ArrowDownLeft className="h-5 w-5 text-green-600" />
                                                : <ArrowUpRight className="h-5 w-5 text-red-500" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{tx.description}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                                {tx.status !== 'COMPLETED' && (
                                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${tx.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                                        {tx.status}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                                {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
