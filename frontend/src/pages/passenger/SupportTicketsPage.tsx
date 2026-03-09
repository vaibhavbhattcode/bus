import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import SEO from '../../components/SEO';
import {
    MessageSquare, Plus, Clock, CheckCircle, AlertCircle,
    ChevronRight, Loader2, XCircle, Filter, X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Ticket {
    id: string;
    subject: string;
    message: string;
    category: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    createdAt: string;
    updatedAt: string;
    replies: { id: string }[];
}

const STATUS_CONFIG = {
    OPEN: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
    RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};
const PRIORITY_CONFIG = {
    LOW: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
    MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
    URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

const CATEGORIES = ['Booking Issue', 'Payment Problem', 'Cancellation', 'Refund Request', 'Technical Issue', 'Other'];

export default function SupportTicketsPage() {
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [form, setForm] = useState({
        subject: '', message: '', category: 'Booking Issue', priority: 'MEDIUM'
    });

    const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
        queryKey: ['my-tickets'],
        queryFn: () => api.get('/support/my-tickets'),
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof form) => api.post('/support', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my-tickets'] });
            setShowCreate(false);
            setForm({ subject: '', message: '', category: 'Booking Issue', priority: 'MEDIUM' });
            toast.success('Support ticket created successfully!');
        },
        onError: () => toast.error('Failed to create ticket. Please try again.'),
    });

    const filtered = statusFilter === 'ALL' ? tickets : tickets.filter(t => t.status === statusFilter);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <SEO title="Support Tickets" description="View and manage your support tickets on BusBook." />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-primary-600" />
                        Support Tickets
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Get help from our support team</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <Plus className="h-4 w-4" />
                    New Ticket
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(s => {
                    const count = s === 'ALL' ? tickets.length : tickets.filter(t => t.status === s).length;
                    const active = statusFilter === s;
                    return (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${active ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                            <p className={`text-2xl font-bold ${active ? 'text-primary-600' : 'text-gray-800'}`}>{count}</p>
                            <p className={`text-xs font-medium ${active ? 'text-primary-500' : 'text-gray-500'}`}>
                                {s === 'ALL' ? 'Total' : s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Filter bar */}
            {statusFilter !== 'ALL' && (
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Showing: <strong>{statusFilter.replace('_', ' ')}</strong></span>
                    <button onClick={() => setStatusFilter('ALL')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">Clear</button>
                </div>
            )}

            {/* Ticket list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-gray-700 font-semibold mb-1">No tickets yet</h3>
                    <p className="text-gray-400 text-sm mb-4">Create a ticket and our team will help you out.</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                        Create your first ticket
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(ticket => {
                        const st = STATUS_CONFIG[ticket.status];
                        const pr = PRIORITY_CONFIG[ticket.priority];
                        const StIcon = st.icon;
                        return (
                            <Link
                                key={ticket.id}
                                to={`/support/${ticket.id}`}
                                className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md hover:shadow-primary-100/50 transition-all duration-200 group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                                                <StIcon className="h-3 w-3" />
                                                {st.label}
                                            </span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.color}`}>{pr.label}</span>
                                            {ticket.category && (
                                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{ticket.category}</span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">{ticket.subject}</h3>
                                        <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">{ticket.message}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            {ticket.replies?.length > 0 && <span className="ml-3">💬 {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}</span>}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create ticket modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Create Support Ticket</h2>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
                            className="p-6 space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={form.priority}
                                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                                        <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={form.subject}
                                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                                    placeholder="Brief description of your issue"
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.message}
                                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                    placeholder="Describe your issue in detail..."
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-gradient-to-r from-primary-600 to-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-primary-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
