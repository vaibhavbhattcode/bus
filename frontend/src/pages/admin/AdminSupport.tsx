import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import {
  Ticket, User, MessageSquare, Calendar, AlertCircle, CheckCircle,
  Clock, XCircle, Send, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import Modal from '../../components/Modal';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth';
import { motion, AnimatePresence } from 'framer-motion';

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

/* ── status/priority configs ──────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { cls: string; icon: any; dot: string; label: string }> = {
  OPEN: { cls: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle, dot: 'bg-red-400', label: 'Open' },
  IN_PROGRESS: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, dot: 'bg-amber-400', label: 'In Progress' },
  RESOLVED: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, dot: 'bg-emerald-400', label: 'Resolved' },
  CLOSED: { cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle, dot: 'bg-gray-400', label: 'Closed' },
};
const PRIORITY_CFG: Record<string, { cls: string }> = {
  URGENT: { cls: 'bg-red-100 text-red-700' },
  HIGH: { cls: 'bg-orange-100 text-orange-700' },
  MEDIUM: { cls: 'bg-amber-100 text-amber-700' },
  LOW: { cls: 'bg-gray-100 text-gray-500' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.OPEN;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  );
}

const STATUS_TABS = ['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const STATUS_LABELS: Record<string, string> = { all: 'All', OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };

export default function AdminSupport() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── WebSocket ── */
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const socket = io(`${apiUrl.replace(/\/api$/, '')}/support`, { auth: { token: accessToken } });
    socketRef.current = socket;
    socket.on('ticket_activity', (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast(`New activity on ticket #${data.ticketId.slice(-6)}`, { icon: '💬' });
    });
    return () => { socket.disconnect(); };
  }, [accessToken, queryClient]);

  useEffect(() => {
    if (selectedTicket && socketRef.current) {
      socketRef.current.emit('join_ticket', { ticketId: selectedTicket.id });
      setReplies(selectedTicket.replies || []);
      const handle = (reply: any) => {
        setReplies(prev => prev.find(r => r.id === reply.id) ? prev : [...prev, reply]);
        scrollToBottom();
      };
      socketRef.current.on('new_message', handle);
      return () => { socketRef.current?.off('new_message', handle); };
    }
  }, [selectedTicket]);

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 80);

  /* ── Queries ── */
  const { data: ticketsData, isLoading, isFetching, refetch } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-tickets', selectedStatus, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: '10' });
      if (selectedStatus !== 'all') p.set('status', selectedStatus);
      return api.get<{ data: any[]; meta: any }>(`/support/all-tickets?${p}`);
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const { data: ticketStats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => api.get<any>('/support/stats'),
    staleTime: 30000,
  });

  const tickets = ticketsData?.data ?? [];
  const meta = ticketsData?.meta ?? {};

  /* ── Mutations ── */
  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/support/tickets/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
      toast.success('Ticket resolved');
      setSelectedTicket(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket || !socketRef.current) return;
    socketRef.current.emit('send_message', { ticketId: selectedTicket.id, message: replyText.trim() });
    setReplyText('');
    textareaRef.current?.focus();
  };

  const openTicket = async (ticket: any) => {
    const data = await api.get<any>(`/support/tickets/${ticket.id}`);
    setSelectedTicket(data);
  };

  // Stats for quick summary
  const statItems = [
    { label: 'Open', value: ticketStats?.open ?? 0, cls: 'from-red-50 to-red-100 border-red-200 text-red-700', icon: AlertCircle },
    { label: 'In Progress', value: ticketStats?.inProgress ?? 0, cls: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700', icon: Clock },
    { label: 'Resolved', value: ticketStats?.resolved ?? 0, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700', icon: CheckCircle },
    { label: 'Total', value: ticketStats?.total ?? 0, cls: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700', icon: Ticket },
  ];

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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {meta.total != null ? `${meta.total} tickets` : '—'}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· live</span>}
          </p>
        </div>
        <button onClick={() => refetch()}
          className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </motion.div>

      {/* ── Stats ── */}
      {ticketStats && (
        <motion.div variants={fadeUpVariant} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statItems.map(s => (
            <motion.div
              key={s.label}
              whileHover={{ y: -4, scale: 1.02 }}
              className={`p-4 rounded-2xl border bg-gradient-to-br ${s.cls} flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-300`}
            >
              <s.icon className="h-6 w-6 opacity-60 shrink-0" />
              <div>
                <p className="text-xs font-medium opacity-70">{s.label}</p>
                <p className="text-2xl font-black">{s.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Category breakdown ── */}
      {ticketStats?.categories?.length > 0 && (
        <motion.div variants={fadeUpVariant} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-300">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Issue Categories</h3>
          <div className="flex flex-wrap gap-3">
            {ticketStats.categories.map((cat: any, i: number) => (
              <div key={i} className="flex-1 min-w-[120px] bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wide mb-1">{cat.name}</p>
                <p className="text-xl font-black text-gray-900">{cat.count}</p>
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((cat.count / ticketStats.total) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Status tabs ── */}
      <motion.div variants={fadeUpVariant} className="flex flex-wrap gap-2 bg-gray-50/80 rounded-2xl p-2 border border-gray-100">
        {STATUS_TABS.map(s => {
          const cfg = STATUS_CFG[s];
          return (
            <button key={s} onClick={() => { setSelectedStatus(s); setPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedStatus === s ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-gray-100'
                }`}>
              {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </motion.div>

      {/* ── Tickets list ── */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : tickets.length === 0 ? (
        <motion.div variants={fadeUpVariant} className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Ticket className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-semibold">No tickets found</p>
          <p className="text-gray-400 text-sm mt-1">No {selectedStatus !== 'all' ? STATUS_LABELS[selectedStatus].toLowerCase() : ''} tickets</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {tickets.map((ticket: any, i: number) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openTicket(ticket)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 p-5 cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${STATUS_CFG[ticket.status]?.cls.split(' ')[0] ?? 'bg-gray-100'} border ${STATUS_CFG[ticket.status]?.cls.split(' ')[3] ?? ''}`}>
                    <Ticket className={`h-5 w-5 ${STATUS_CFG[ticket.status]?.cls.split(' ')[1] ?? 'text-gray-500'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1 */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 truncate">{ticket.subject}</span>
                      <StatusBadge status={ticket.status} />
                      {ticket.priority && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_CFG[ticket.priority]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                          {ticket.priority}
                        </span>
                      )}
                    </div>

                    {/* Message preview */}
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">{ticket.message}</p>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{ticket.user?.name || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{ticket._count?.replies ?? 0} replies</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>


          {/* ── Pagination ── */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">Page {page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 shadow-sm">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button onClick={e => { e.stopPropagation(); setPage(p => Math.min(meta.totalPages, p + 1)); }} disabled={page === meta.totalPages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 shadow-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Ticket Detail Modal ── */}
      <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} maxWidth="max-w-4xl"
        title={selectedTicket ? (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${STATUS_CFG[selectedTicket.status]?.cls ?? 'bg-gray-100'}`}>
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base line-clamp-1">{selectedTicket.subject}</p>
              <div className="flex gap-2 mt-0.5">
                <StatusBadge status={selectedTicket.status} />
                {selectedTicket.priority && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_CFG[selectedTicket.priority]?.cls}`}>{selectedTicket.priority}</span>
                )}
                {selectedTicket.category && <span className="text-xs text-gray-400 self-center">{selectedTicket.category}</span>}
              </div>
            </div>
          </div>
        ) : undefined}>
        {selectedTicket && (
          <div className="space-y-4 pb-2">
            {/* User info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedTicket.user?.name || 'Unknown'}</p>
                {selectedTicket.user?.email && <p className="text-xs text-gray-400">{selectedTicket.user.email}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>

            {/* Conversation */}
            <div>
              <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Conversation ({replies.length})</p>
              <div ref={scrollRef} className="space-y-3 max-h-80 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-100 scroll-smooth">
                {replies.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No messages yet — start the conversation</p>
                ) : replies.map((reply: any, idx: number) => (
                  <div key={idx} className={`flex ${reply.isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm shadow-sm ${reply.isAdmin ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      <p className={`text-[10px] font-bold mb-1 ${reply.isAdmin ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {reply.isAdmin ? 'Support (You)' : selectedTicket.user?.name || 'User'}
                      </p>
                      <p className="leading-relaxed">{reply.message}</p>
                      <p className={`text-[10px] mt-1.5 ${reply.isAdmin ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {format(new Date(reply.createdAt), 'MMM d · HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply + Actions */}
            {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <textarea ref={textareaRef} rows={3} value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                    placeholder="Type your reply… (Enter to send, Shift+Enter for new line)" />
                  <button onClick={handleSendReply} disabled={!replyText.trim()}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-40 self-end">
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { if (confirm('Mark this ticket as resolved?')) resolveMutation.mutate(selectedTicket.id); }}
                    disabled={resolveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60">
                    <CheckCircle className="h-4 w-4" />
                    {resolveMutation.isPending ? 'Resolving…' : 'Mark Resolved'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">This ticket is {selectedTicket.status.toLowerCase()}.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
