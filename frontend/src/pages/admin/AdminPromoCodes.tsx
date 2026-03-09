import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import {
  Plus, Trash2, Tag, Percent, IndianRupee,
  Copy, CheckCircle, Clock, XCircle, TrendingUp,
  BarChart2, RefreshCw, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CreatePromoCodeModal from '../../components/CreatePromoCodeModal';
import { motion } from 'framer-motion';

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

function StatusBadge({ promo }: { promo: any }) {
  const now = new Date();
  const from = new Date(promo.validFrom);
  const until = new Date(promo.validUntil);
  const exhausted = promo.maxUses != null && promo.usedCount >= promo.maxUses;

  if (exhausted) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200"><BarChart2 className="h-3 w-3" />Exhausted</span>;
  if (now < from) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="h-3 w-3" />Upcoming</span>;
  if (now > until) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200"><XCircle className="h-3 w-3" />Expired</span>;
  if (promo.status === 'ACTIVE') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="h-3 w-3" />Active</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle className="h-3 w-3" />Inactive</span>;
}

export default function AdminPromoCodes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: promoCodes, isLoading, isFetching, refetch } = useQuery<any[]>({
    queryKey: ['admin-promo-codes'],
    queryFn: () => api.get<any[]>('/promo-codes'),
    staleTime: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/promo-codes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] }); toast.success('Promo code deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      toast.success(`Copied "${code}"`);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Summary stats
  const now = new Date();
  const active = (promoCodes ?? []).filter(p => p.status === 'ACTIVE' && new Date(p.validFrom) <= now && new Date(p.validUntil) >= now);
  const expired = (promoCodes ?? []).filter(p => new Date(p.validUntil) < now);
  const totalUsed = (promoCodes ?? []).reduce((a, p) => a + (p.usedCount || 0), 0);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Promo Codes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {promoCodes?.length != null ? `${promoCodes.length} total` : '—'}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· refreshing</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Plus className="h-4 w-4" /> Create Code
          </button>
        </div>
      </motion.div>

      {/* ── Summary stats ── */}
      <motion.div variants={fadeUpVariant} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Codes', value: promoCodes?.length ?? 0, cls: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700', icon: Tag },
          { label: 'Active', value: active.length, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700', icon: CheckCircle },
          { label: 'Expired', value: expired.length, cls: 'from-red-50 to-red-100 border-red-200 text-red-700', icon: XCircle },
          { label: 'Total Uses', value: totalUsed, cls: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700', icon: TrendingUp },
        ].map((k) => (
          <motion.div
            key={k.label}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`p-4 rounded-2xl border bg-gradient-to-br ${k.cls} flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-300`}
          >
            <k.icon className="h-6 w-6 opacity-70 shrink-0" />
            <div>
              <p className="text-xs font-medium opacity-70">{k.label}</p>
              <p className="text-2xl font-black">{k.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Table ── */}
      <motion.div variants={fadeUpVariant} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Code', 'Discount', 'Usage', 'Validity', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : promoCodes?.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Tag className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold">No promo codes yet</p>
                  <p className="text-gray-400 text-xs mt-1">Create your first one to get started</p>
                </td></tr>
              ) : (
                promoCodes?.map((promo: any, i: number) => {
                  const progress = promo.maxUses ? Math.min((promo.usedCount / promo.maxUses) * 100, 100) : null;
                  return (
                    <motion.tr
                      key={promo.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-gray-900 tracking-wider bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-sm border border-indigo-100">
                            {promo.code}
                          </span>
                          <button onClick={() => copyCode(promo.code)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors" title="Copy code">
                            {copied === promo.code ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        {promo.description && <p className="text-xs text-gray-400 mt-1">{promo.description}</p>}
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 font-bold text-emerald-600 text-base">
                          {promo.type === 'PERCENTAGE' ? (
                            <><Percent className="h-4 w-4" />{promo.value}%</>
                          ) : (
                            <><IndianRupee className="h-4 w-4" />{promo.value}</>
                          )}
                        </div>
                        {promo.minAmount > 0 && <p className="text-xs text-gray-400 mt-0.5">Min ₹{promo.minAmount}</p>}
                        {promo.maxDiscount > 0 && promo.type === 'PERCENTAGE' && (
                          <p className="text-xs text-gray-400">Max ₹{promo.maxDiscount}</p>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{promo.usedCount}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500">{promo.maxUses ?? '∞'}</span>
                        </div>
                        {progress !== null && (
                          <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 w-24">
                            <div className={`h-1.5 rounded-full ${progress >= 100 ? 'bg-red-400' : progress >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="px-5 py-4 text-xs text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          <span>From {format(new Date(promo.validFrom), 'dd MMM yyyy')}</span>
                          <span className="text-gray-400">To {format(new Date(promo.validUntil), 'dd MMM yyyy')}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4"><StatusBadge promo={promo} /></td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <button onClick={() => {
                          if (confirm(`Delete promo code "${promo.code}"?`)) deleteMutation.mutate(promo.id);
                        }}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <CreatePromoCodeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </motion.div>
  );
}
