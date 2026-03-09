import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import SEO from '../../components/SEO';
import {
    Star, MessageSquare, Loader2, ThumbsUp,
    Filter, ChevronDown, Ticket
} from 'lucide-react';

interface MyFeedback {
    id: string;
    type: 'BOOKING' | 'PROVIDER' | 'ROUTE' | 'PLATFORM';
    subject?: string;
    message?: string;
    rating?: number;
    isPublic: boolean;
    adminReply?: string;
    repliedAt?: string;
    createdAt: string;
    booking?: { id: string; route: { fromCity: string; toCity: string } };
    provider?: { companyName: string };
    route?: { fromCity: string; toCity: string };
}

const TYPE_COLOR: Record<string, string> = {
    BOOKING: 'bg-blue-100 text-blue-700',
    PROVIDER: 'bg-violet-100 text-violet-700',
    ROUTE: 'bg-emerald-100 text-emerald-700',
    PLATFORM: 'bg-gray-100 text-gray-600',
};

export default function MyFeedbackPage() {
    const [typeFilter, setTypeFilter] = useState('ALL');

    const { data: feedbacks = [], isLoading } = useQuery<MyFeedback[]>({
        queryKey: ['my-feedback'],
        queryFn: () => api.get('/feedback/my-feedback'),
    });

    const filtered = typeFilter === 'ALL' ? feedbacks : feedbacks.filter(f => f.type === typeFilter);

    function renderStars(rating?: number) {
        if (!rating) return null;
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200'}`}
                    />
                ))}
                <span className="text-xs text-gray-500 ml-1">{rating}/5</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <SEO title="My Feedback" description="View all feedback and reviews you've submitted on BusBook." />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ThumbsUp className="h-6 w-6 text-primary-600" />
                        My Feedback
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Reviews and ratings you've submitted</p>
                </div>
                <Link
                    to="/my-bookings"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary-600 border border-primary-200 px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors"
                >
                    <Ticket className="h-4 w-4" />View Bookings
                </Link>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-gray-400" />
                {['ALL', 'BOOKING', 'PROVIDER', 'ROUTE', 'PLATFORM'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${typeFilter === t
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {t === 'ALL' ? `All (${feedbacks.length})` : t.charAt(0) + t.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-semibold">No feedback yet</p>
                    <p className="text-gray-400 text-sm mt-1">After completing a booking, you can leave a review for the provider or route.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(feedback => (
                        <div key={feedback.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLOR[feedback.type]}`}>
                                        {feedback.type.charAt(0) + feedback.type.slice(1).toLowerCase()}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${feedback.isPublic ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {feedback.isPublic ? 'Public' : 'Private'}
                                    </span>
                                    {feedback.booking && (
                                        <span className="text-xs text-gray-400">
                                            {feedback.booking.route.fromCity} → {feedback.booking.route.toCity}
                                        </span>
                                    )}
                                    {feedback.provider && (
                                        <span className="text-xs text-gray-400">{feedback.provider.companyName}</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 shrink-0">
                                    {new Date(feedback.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>

                            {feedback.rating && <div className="mb-2">{renderStars(feedback.rating)}</div>}
                            {feedback.subject && <p className="font-semibold text-gray-900 mb-1">{feedback.subject}</p>}
                            {feedback.message && <p className="text-sm text-gray-600 leading-relaxed">{feedback.message}</p>}

                            {/* Admin reply */}
                            {feedback.adminReply && (
                                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-emerald-700 mb-1">🛡️ Response from Support Team</p>
                                    <p className="text-sm text-emerald-800">{feedback.adminReply}</p>
                                    {feedback.repliedAt && (
                                        <p className="text-xs text-emerald-500 mt-1">
                                            Replied {new Date(feedback.repliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
