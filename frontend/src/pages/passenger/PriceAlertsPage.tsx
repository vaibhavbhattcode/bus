import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import SEO from '../../components/SEO';
import {
    Bell, Plus, Search, Trash2, Loader2,
    MapPin, ArrowRight, X, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomSelect from '../../components/CustomSelect';

interface PriceAlert {
    id: string;
    type: string;
    fromCity: string;
    toCity: string;
    targetPrice?: number;
    date?: string;
    status: 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'DISABLED';
    createdAt: string;
}

interface FavoriteRoute {
    id: string;
    fromCity: string;
    toCity: string;
    createdAt: string;
}

const CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai',
    'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat', 'Nagpur', 'Nashik'
];

const STATUS_STYLE: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    TRIGGERED: 'bg-blue-100 text-blue-700',
    EXPIRED: 'bg-gray-100 text-gray-500',
    DISABLED: 'bg-red-100 text-red-600',
};

export default function PriceAlertsPage() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<'alerts' | 'favorites'>('alerts');
    const [showAlertForm, setShowAlertForm] = useState(false);
    const [alertForm, setAlertForm] = useState<{fromCity: string, toCity: string, targetPrice: string, date: Date | null}>({ 
        fromCity: '', 
        toCity: '', 
        targetPrice: '', 
        date: null 
    });

    const { data: alerts = [], isLoading: alertsLoading } = useQuery<PriceAlert[]>({
        queryKey: ['my-alerts'],
        queryFn: () => api.get('/alerts/my-alerts'),
    });

    const { data: favorites = [], isLoading: favsLoading } = useQuery<FavoriteRoute[]>({
        queryKey: ['favorite-routes'],
        queryFn: () => api.get('/alerts/favorite-routes'),
    });

    const createAlertMutation = useMutation({
        mutationFn: (data: any) => api.post('/alerts/price', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my-alerts'] });
            setShowAlertForm(false);
            setAlertForm({ fromCity: '', toCity: '', targetPrice: '', date: null });
            toast.success('Price alert created!');
        },
        onError: () => toast.error('Failed to create alert.'),
    });

    const deleteAlertMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/alerts/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['my-alerts'] });
            toast.success('Alert deleted.');
        },
    });

    const deleteFavMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/alerts/favorite-route/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['favorite-routes'] });
            toast.success('Favorite route removed.');
        },
    });

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <SEO title="Price Alerts & Favorites" description="Set price drop alerts and save your favorite bus routes." />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="h-6 w-6 text-primary-600" />
                        Price Alerts & Favorites
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Get notified when prices drop on your routes</p>
                </div>
                {tab === 'alerts' && (
                    <button
                        onClick={() => setShowAlertForm(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus className="h-4 w-4" />
                        Set Alert
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {(['alerts', 'favorites'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === t ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t === 'alerts' ? `Price Alerts (${alerts.length})` : `Favorites (${favorites.length})`}
                    </button>
                ))}
            </div>

            {/* Alerts tab */}
            {tab === 'alerts' && (
                alertsLoading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary-500" /></div>
                ) : alerts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-7 w-7 text-gray-400" />
                        </div>
                        <p className="text-gray-700 font-semibold">No price alerts</p>
                        <p className="text-gray-400 text-sm mt-1 mb-4">We'll notify you when prices drop on your saved routes.</p>
                        <button onClick={() => setShowAlertForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                            Set your first alert
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                    <Bell className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-semibold text-gray-900">{alert.fromCity}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="font-semibold text-gray-900">{alert.toCity}</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[alert.status]}`}>{alert.status}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {alert.targetPrice ? `Alert when price ≤ ₹${alert.targetPrice}` : 'Any price drop'}
                                        {alert.date && ` • Journey: ${new Date(alert.date).toLocaleDateString('en-IN')}`}
                                    </p>
                                    <p className="text-xs text-gray-400">{new Date(alert.createdAt).toLocaleDateString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        to={`/search?from=${alert.fromCity}&to=${alert.toCity}`}
                                        className="flex items-center gap-1 text-xs font-medium text-primary-600 border border-primary-200 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                                    >
                                        <Search className="h-3 w-3" />Search
                                    </Link>
                                    <button
                                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                                        disabled={deleteAlertMutation.isPending}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Favorites tab */}
            {tab === 'favorites' && (
                favsLoading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary-500" /></div>
                ) : favorites.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <div className="h-14 w-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <MapPin className="h-7 w-7 text-gray-400" />
                        </div>
                        <p className="text-gray-700 font-semibold">No favorite routes yet</p>
                        <p className="text-gray-400 text-sm mt-1">Search for routes and save your frequently used ones.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {favorites.map(fav => (
                            <div key={fav.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                                <div className="h-10 w-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                                    <MapPin className="h-5 w-5 text-rose-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{fav.fromCity}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="font-semibold text-gray-900">{fav.toCity}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">Saved on {new Date(fav.createdAt).toLocaleDateString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link
                                        to={`/search?from=${fav.fromCity}&to=${fav.toCity}`}
                                        className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg shadow hover:shadow-primary-500/30 transition-all"
                                    >
                                        <Search className="h-3 w-3" />Search
                                    </Link>
                                    <button
                                        onClick={() => deleteFavMutation.mutate(fav.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Create alert modal */}
            {showAlertForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Set Price Alert</h2>
                            <button onClick={() => setShowAlertForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                createAlertMutation.mutate({
                                    type: 'PRICE_DROP',
                                    fromCity: alertForm.fromCity,
                                    toCity: alertForm.toCity,
                                    targetPrice: alertForm.targetPrice ? Number(alertForm.targetPrice) : undefined,
                                    date: alertForm.date ? alertForm.date.toISOString() : undefined,
                                });
                            }}
                            className="p-6 space-y-4"
                        >
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">You'll be notified when the price drops to or below your target.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">From City</label>
                                    <CustomSelect
                                        value={alertForm.fromCity}
                                        onChange={v => setAlertForm(p => ({ ...p, fromCity: v }))}
                                        options={CITIES.map(c => ({ value: c, label: c }))}
                                        placeholder="Select..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">To City</label>
                                    <CustomSelect
                                        value={alertForm.toCity}
                                        onChange={v => setAlertForm(p => ({ ...p, toCity: v }))}
                                        options={CITIES.filter(c => c !== alertForm.fromCity).map(c => ({ value: c, label: c }))}
                                        placeholder="Select..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Price (₹) <span className="text-gray-400 font-normal">— optional</span></label>
                                <input type="number" min="0" value={alertForm.targetPrice} onChange={e => setAlertForm(p => ({ ...p, targetPrice: e.target.value }))}
                                    placeholder="e.g. 500"
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Journey Date <span className="text-gray-300 font-normal">— optional</span></label>
                                <CustomDatePicker
                                    selected={alertForm.date}
                                    onChange={d => setAlertForm(p => ({ ...p, date: d }))}
                                    minDate={new Date()}
                                    placeholder="Select Date"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAlertForm(false)}
                                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={createAlertMutation.isPending}
                                    className="flex-1 bg-gradient-to-r from-primary-600 to-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                                    {createAlertMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : 'Create Alert'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
