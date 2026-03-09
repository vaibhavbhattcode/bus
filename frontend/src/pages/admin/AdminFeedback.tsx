import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import {
  Star, User, MessageSquare, Reply, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, RefreshCw, Search, X, Filter,
  ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

function useDebounce<T>(value: T, ms = 400): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${s} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  );
}

const TYPE_CFG: Record<string, string> = {
  PROVIDER: 'bg-blue-50 text-blue-700 border-blue-200',
  ROUTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BOOKING: 'bg-purple-50 text-purple-700 border-purple-200',
  GENERAL: 'bg-gray-100 text-gray-600 border-gray-200',
};

const RATING_LABEL = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const RATING_COLOR = ['', 'text-red-500', 'text-orange-500', 'text-amber-500', 'text-lime-600', 'text-emerald-600'];

export default function AdminFeedback() {
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0); // 0 = all
  const [typeFilter, setTypeFilter] = useState('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 400);
  useEffect(() => setPage(1), [debouncedSearch, ratingFilter, typeFilter]);

  const { data: feedbackData, isLoading, isFetching, refetch } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-feedbacks', page, limit, debouncedSearch, ratingFilter, typeFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (ratingFilter) p.set('rating', String(ratingFilter));
      if (typeFilter !== 'all') p.set('type', typeFilter);
      return api.get<{ data: any[]; meta: any }>(`/feedback/all?${p}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const feedbacks = feedbackData?.data ?? [];
  const meta = feedbackData?.meta ?? {};

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => api.post(`/feedback/${id}/reply`, { reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      toast.success('Reply sent!');
      setSelectedFeedback(null);
      setReplyText('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send reply'),
  });

  // avg rating
  const avgRating = feedbacks.length
    ? (feedbacks.reduce((a: number, f: any) => a + f.rating, 0) / feedbacks.length).toFixed(1)
    : '—';
  const repliedCount = feedbacks.filter((f: any) => f.adminReply).length;
  const unrepliedCount = feedbacks.length - repliedCount;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200"
          >
            <MessageSquare className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Feedback & Reviews</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {meta.total != null ? `${meta.total} total` : '—'}
              {meta.total > 0 && <span className="ml-2">· avg <span className="text-amber-500 font-semibold">★ {avgRating}</span></span>}
              {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· refreshing</span>}
            </p>
          </div>
        </div>
        <button onClick={() => refetch()}
          className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </motion.div>

      {/* ── Summary Stats ── */}
      <motion.div variants={fadeUpVariant} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: meta.total ?? 0, cls: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700', icon: MessageSquare },
          { label: 'Avg Rating', value: avgRating, cls: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700', icon: Star },
          { label: 'Replied', value: repliedCount, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700', icon: ThumbsUp },
          { label: 'Pending Reply', value: unrepliedCount, cls: 'from-red-50 to-red-100 border-red-200 text-red-700', icon: ThumbsDown },
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

      {/* ── Controls ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search subject, user…"
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          {search && <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'PROVIDER', 'ROUTE', 'BOOKING', 'GENERAL'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${typeFilter === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}>
              {t === 'all' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Rating filter */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          {[0, 1, 2, 3, 4, 5].map(r => (
            <button key={r} onClick={() => setRatingFilter(r === ratingFilter ? 0 : r)}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${ratingFilter === r ? 'bg-amber-400 text-white' : 'text-gray-500 hover:text-amber-500'
                }`}>
              {r === 0 ? '★ All' : `${r}★`}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : feedbacks.length === 0 ? (
        <motion.div variants={fadeUpVariant} className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <MessageSquare className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-semibold">No feedback found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {feedbacks.map((fb: any, i: number) => {
              const typeCls = TYPE_CFG[fb.type] ?? TYPE_CFG.GENERAL;
              const createdAt = fb.createdAt ? new Date(fb.createdAt) : null;
              return (
                <motion.div
                  key={fb.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0"
                    >
                      <User className="h-5 w-5 text-indigo-500" />
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      {/* Row 1 */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{fb.user?.name || 'Anonymous'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeCls}`}>{fb.type}</span>
                        {fb.isPublic ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="h-3.5 w-3.5" />Public</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="h-3.5 w-3.5" />Private</span>
                        )}
                        {createdAt && !isNaN(createdAt.getTime()) && (
                          <span className="text-xs text-gray-400 ml-auto">{format(createdAt, 'MMM d, yyyy')}</span>
                        )}
                      </div>

                      {/* Row 2: Stars + rating label */}
                      <div className="flex items-center gap-2 mb-2">
                        <Stars rating={fb.rating} />
                        <span className={`text-xs font-bold ${RATING_COLOR[fb.rating] || ''}`}>
                          {RATING_LABEL[fb.rating] || ''}
                        </span>
                      </div>

                      {/* Subject + Message */}
                      {fb.subject && <p className="text-sm font-semibold text-gray-800 mb-1">{fb.subject}</p>}
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{fb.message}</p>

                      {/* Admin reply */}
                      {fb.adminReply && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Reply className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs font-bold text-indigo-700">Admin Reply</span>
                            {fb.repliedAt && !isNaN(new Date(fb.repliedAt).getTime()) && (
                              <span className="text-xs text-indigo-400 ml-auto">{format(new Date(fb.repliedAt), 'MMM d')}</span>
                            )}
                          </div>
                          <p className="text-sm text-indigo-800">{fb.adminReply}</p>
                        </motion.div>
                      )}

                      {/* Actions */}
                      {!fb.adminReply && (
                        <motion.button
                          onClick={() => { setSelectedFeedback(fb); setReplyText(''); }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                        >
                          <Reply className="h-3.5 w-3.5" /> Reply
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ── Pagination ── */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reply Modal ── */}
      <Modal isOpen={!!selectedFeedback} onClose={() => { setSelectedFeedback(null); setReplyText(''); }}
        title="Reply to Feedback" maxWidth="max-w-2xl">
        {selectedFeedback && (
          <div className="space-y-4">
            {/* Original feedback preview */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-sm">{selectedFeedback.user?.name || 'Anonymous'}</span>
                <Stars rating={selectedFeedback.rating} size="sm" />
              </div>
              {selectedFeedback.subject && <p className="text-sm font-semibold text-gray-800 mb-1">{selectedFeedback.subject}</p>}
              <p className="text-sm text-gray-600">{selectedFeedback.message}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Your Reply</label>
              <textarea rows={5} value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder="Write a helpful, professional reply…"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all" />
              <p className="text-xs text-gray-400 mt-1">{replyText.length} chars</p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setSelectedFeedback(null); setReplyText(''); }}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={() => { if (replyText.trim()) replyMutation.mutate({ id: selectedFeedback.id, reply: replyText }); else toast.error('Reply cannot be empty'); }}
                disabled={replyMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
                <Reply className="h-4 w-4" />
                {replyMutation.isPending ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
