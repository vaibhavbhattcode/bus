import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import SEO from '../../components/SEO';
import {
    ArrowLeft, MessageSquare, Clock, CheckCircle, AlertCircle,
    XCircle, Loader2, Send, User, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TicketReply {
    id: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
    user: { name: string };
}
interface TicketDetail {
    id: string;
    subject: string;
    message: string;
    category: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    createdAt: string;
    updatedAt: string;
    replies: TicketReply[];
    user: { name: string; email?: string; phone: string };
}

const STATUS_CONFIG = {
    OPEN: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
    RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

export default function SupportTicketDetailPage() {
    const { id } = useParams<{ id: string }>();
    const qc = useQueryClient();
    const [replyText, setReplyText] = useState('');

    // Note: passengers can only view their own tickets. We use my-tickets list then find by ID,
    // because the backend GET /support/tickets/:id is admin-only.
    const { data: tickets = [], isLoading } = useQuery<TicketDetail[]>({
        queryKey: ['my-tickets'],
        queryFn: () => api.get('/support/my-tickets'),
    });

    const ticket = tickets.find((t: any) => t.id === id);

    const replyMutation = useMutation({
        mutationFn: (message: string) => api.post(`/support/tickets/${id}/reply`, { message }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my-tickets'] });
            setReplyText('');
            toast.success('Reply sent!');
        },
        onError: () => toast.error('Failed to send reply.'),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500 mb-4">Ticket not found.</p>
                <Link to="/support" className="text-primary-600 hover:underline text-sm">← Back to tickets</Link>
            </div>
        );
    }

    const st = STATUS_CONFIG[ticket.status];
    const StIcon = st.icon;
    const canReply = ticket.status !== 'CLOSED';

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <SEO title={`Ticket: ${ticket.subject}`} description="Support ticket conversation." />

            {/* Back + header */}
            <div>
                <Link to="/support" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back to tickets
                </Link>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>
                                    <StIcon className="h-3.5 w-3.5" />
                                    {st.label}
                                </span>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{ticket.category}</span>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Priority: {ticket.priority}</span>
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
                            <p className="text-xs text-gray-400 mt-1">
                                Created {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conversation */}
            <div className="space-y-3">
                {/* Original message */}
                <div className="bg-primary-50 border border-primary-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{ticket.user?.name || 'You'}</p>
                            <p className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <span className="ml-auto text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full font-medium">Original</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                </div>

                {/* Replies */}
                {ticket.replies && ticket.replies.length > 0 && ticket.replies.map((reply) => (
                    <div
                        key={reply.id}
                        className={`rounded-2xl p-5 border ${reply.isAdmin
                            ? 'bg-emerald-50 border-emerald-200 ml-4'
                            : 'bg-white border-gray-200 mr-4'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center ${reply.isAdmin ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' : 'bg-gradient-to-tr from-primary-500 to-indigo-600'}`}>
                                {reply.isAdmin ? <Shield className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{reply.isAdmin ? '🛡️ Support Team' : (reply.user?.name || 'You')}</p>
                                <p className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {reply.isAdmin && (
                                <span className="ml-auto text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">Staff</span>
                            )}
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                    </div>
                ))}
            </div>

            {/* Reply form */}
            {canReply ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary-500" />
                        Add Reply
                    </h3>
                    <textarea
                        rows={4}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={() => {
                                if (!replyText.trim()) return;
                                replyMutation.mutate(replyText.trim());
                            }}
                            disabled={replyMutation.isPending || !replyText.trim()}
                            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0"
                        >
                            {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500">This ticket is closed. <Link to="/support" className="text-primary-600 hover:underline">Create a new ticket</Link> if you need further assistance.</p>
                </div>
            )}
        </div>
    );
}
