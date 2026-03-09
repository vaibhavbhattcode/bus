import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  AreaChart, Area, BarChart, Bar, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Download, DollarSign, BookOpen,
  Users, BarChart2, ArrowUpRight, ArrowDownRight, Route,
  RefreshCw, Star, Clock, Repeat2, Target, Zap,
  Award, MapPin, Bus,
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { format, subDays } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];
const GRADIENTS = [
  { id: 'grad0', from: '#6366f1', to: '#818cf8' },
  { id: 'grad1', from: '#10b981', to: '#34d399' },
  { id: 'grad2', from: '#f59e0b', to: '#fbbf24' },
  { id: 'grad3', from: '#ef4444', to: '#f87171' },
];

/* ── Tooltip ── */
function CT({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
      <p className="text-gray-500 font-semibold mb-2 pb-1 border-b border-gray-100">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between items-center gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-bold text-gray-900">
            {(p.name ?? '').toLowerCase().includes('revenue') || (p.name ?? '').toLowerCase().includes('₹')
              ? `₹${Number(p.value).toLocaleString()}`
              : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── KPI Card ── */
function KPI({ label, value, icon: Icon, sub, delta, color = 'indigo', prefix = '' }: {
  label: string; value: string | number; icon: any;
  sub?: string; delta?: number; color?: string; prefix?: string;
}) {
  const c: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600', green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600', red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600', cyan: 'from-cyan-500 to-cyan-600',
    pink: 'from-pink-500 to-pink-600', lime: 'from-lime-500 to-lime-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`bg-gradient-to-br ${c[color] || c.indigo} p-2.5 rounded-xl shadow-sm group-hover:scale-105 transition-transform`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900 tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {delta >= 0
            ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            : <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
          <span className={`text-xs font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {Math.abs(delta)}%
          </span>
          <span className="text-xs text-gray-400">vs prev period</span>
        </div>
      )}
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Tab button ── */
function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-gray-100'
        }`}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}

/* ── Rank list ── */
function RankList({ items, valueKey, labelKey, prefix = '', color = '#6366f1' }: any) {
  const max = Math.max(...items.map((i: any) => i[valueKey] || 0), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{item[labelKey]}</p>
            <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${((item[valueKey] || 0) / max) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
          <span className="text-sm font-bold text-gray-900 shrink-0">
            {prefix}{typeof item[valueKey] === 'number' ? item[valueKey].toLocaleString() : item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Stat pill ── */
function Pill({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`rounded-xl p-4 text-center border ${good ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${good ? 'text-emerald-600' : 'text-red-500'}`}>{value}</p>
    </div>
  );
}

/* ── Empty state ── */
function Empty({ text = 'No data for this period' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <BarChart2 className="h-10 w-10 mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default function AdminAnalytics() {
  const [tab, setTab] = useState<'overview' | 'bookings' | 'users' | 'providers' | 'feedback'>('overview');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = subDays(end, 30);
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  });

  const params = useMemo(() => ({ ...dateRange, groupBy }), [dateRange, groupBy]);

  const { data: ana, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-analytics', params],
    queryFn: () => api.get<any>('/admin/analytics', { params }),
    staleTime: 60000,
  });
  const { data: growth = [] } = useQuery({
    queryKey: ['admin-growth'],
    queryFn: () => api.get<any[]>('/admin/analytics/growth?months=6').catch(() => []),
    staleTime: 300000, retry: 0,
  });

  const preset = (days: number) => {
    const end = new Date(); const start = subDays(end, days);
    setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
  };

  // Derived data
  const s = ana?.summary || {};
  const fs = ana?.feedbackSummary || {};
  const trends: any[] = ana?.trends || [];
  const topRoutes: any[] = ana?.topRoutes || [];
  const topProviders: any[] = ana?.topProvidersByBookings || [];
  const topRated: any[] = ana?.topProvidersByRating || [];
  const topUsers: any[] = ana?.topUsersByBookings || [];
  const topSpenders: any[] = ana?.topUsersBySpend || [];
  const cityDist: any[] = ana?.userCityDistribution || [];
  const vehicleTypes: any[] = ana?.vehicleTypeDistribution || [];
  const statusData: any[] = ana?.bookingsByStatus || [];
  const ratingDist: any[] = ana?.ratingDistribution || [];
  const hourly: any[] = ana?.hourlyDistribution || [];
  const revByProvider: any[] = ana?.revenueByProvider || [];

  // Satisfaction gauge data
  const satRate = fs.satisfactionRate || 0;
  const gaugeData = [{ name: 'Satisfied', value: satRate, fill: '#10b981' }, { name: 'Rest', value: 100 - satRate, fill: '#f3f4f6' }];

  const dlBtn = (data: any[], name: string, cols: any[]) => (
    <button onClick={() => exportToCSV(data, name, cols)}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50">
      <Download className="h-3 w-3" /> Export
    </button>
  );

  const gradDefs = (
    <defs>
      {GRADIENTS.map(g => (
        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={g.from} stopOpacity={0.25} />
          <stop offset="95%" stopColor={g.to} stopOpacity={0.02} />
        </linearGradient>
      ))}
    </defs>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Analytics Hub</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Marketing intelligence & platform performance · {dateRange.start} → {dateRange.end}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => preset(d)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-600 transition-all">
              {d}d
            </button>
          ))}
          <input type="date" value={dateRange.start}
            onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
            className="input py-1.5 text-sm" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={dateRange.end}
            onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
            className="input py-1.5 text-sm" />
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="input py-1.5 text-sm pr-8">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => exportToCSV(trends, 'Analytics_Trend', [
            { header: 'Date', key: 'date' }, { header: 'Bookings', key: 'bookings' },
            { header: 'Revenue', key: 'revenue' }, { header: 'Users', key: 'users' }
          ])}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-2 bg-gray-50/80 backdrop-blur rounded-2xl p-2 border border-gray-100">
        {([
          { id: 'overview', icon: BarChart2, label: 'Overview' },
          { id: 'bookings', icon: BookOpen, label: 'Bookings' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'providers', icon: Route, label: 'Providers' },
          { id: 'feedback', icon: Star, label: 'Feedback' },
        ] as const).map(t => (
          <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
          <div className="h-72 bg-gray-100 rounded-2xl col-span-2 md:col-span-4" />
        </div>
      ) : (
        <>
          {/* ══ OVERVIEW TAB ══ */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label="Total Revenue" value={(s.totalRevenue || 0).toLocaleString()} icon={DollarSign} color="green" prefix="₹" sub={`₹${(s.revenuePerUser || 0).toLocaleString()} / user`} />
                <KPI label="Total Bookings" value={s.totalBookings || 0} icon={BookOpen} color="indigo" sub={`${s.conversionRate || 0}% conversion rate`} />
                <KPI label="Unique Users" value={s.uniqueUserCount || 0} icon={Users} color="purple" sub={`${s.repeatUserRate || 0}% repeat users`} />
                <KPI label="Avg Booking Value" value={`₹${(s.avgBookingValue || 0).toLocaleString()}`} icon={TrendingUp} color="amber" sub={`Peak at ${s.peakHour != null ? s.peakHour + ':00' : '--'}`} />
              </div>

              {/* Trend Area Chart */}
              {trends.length > 0 ? (
                <Card title="Revenue & Booking Trend" action={dlBtn(trends, 'Trend', [{ header: 'Date', key: 'date' }, { header: 'Bookings', key: 'bookings' }, { header: 'Revenue ₹', key: 'revenue' }])}>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        {gradDefs}
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CT />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area yAxisId="r" type="monotone" dataKey="revenue" name="Revenue ₹" stroke="#10b981" fill="url(#grad1)" strokeWidth={2.5} dot={false} />
                        <Bar yAxisId="l" dataKey="bookings" name="Bookings" fill="url(#grad0)" radius={[4, 4, 0, 0]} barSize={8} />
                        <Line yAxisId="l" type="monotone" dataKey="users" name="New Users" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ) : <Empty />}

              {/* 6M Growth + Hourly */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(growth as any[]).length > 0 && (
                  <Card title="6-Month Growth">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={growth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CT />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="users" name="Users" fill="#6366f1" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="bookings" name="Bookings" fill="#10b981" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="providers" name="Providers" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {hourly.some((h: any) => h.bookings > 0) && (
                  <Card title="Bookings by Hour of Day">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourly.filter((_, i) => i % 2 === 0).map((h, i) => ({ ...h, hour: hourly[i * 2]?.hour || h.hour }))}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="bookings" name="Bookings" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </div>

              {/* Status donut + City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {statusData.length > 0 && (
                  <Card title="Booking Status Distribution">
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%"
                            innerRadius="35%" outerRadius="65%" paddingAngle={3}>
                            {statusData.map((d: any, i: number) => <Cell key={i} fill={d.color || COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {statusData.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-gray-600">{d.status}</span>
                          <span className="ml-auto font-bold text-gray-900">{d.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {cityDist.length > 0 && (
                  <Card title="Users by City" action={dlBtn(cityDist, 'Users_City', [{ header: 'City', key: 'city' }, { header: 'Count', key: 'count' }])}>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cityDist.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: 50, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="city" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="count" name="Users" radius={[0, 4, 4, 0]}>
                            {cityDist.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ══ BOOKINGS TAB ══ */}
          {tab === 'bookings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label="Total Bookings" value={s.totalBookings || 0} icon={BookOpen} color="indigo" />
                <KPI label="Confirmed" value={s.confirmedCount || 0} icon={Target} color="green" />
                <KPI label="Completed" value={s.completedCount || 0} icon={Award} color="purple" />
                <KPI label="Cancelled" value={s.cancelledCount || 0} icon={TrendingDown} color="red" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Pill label="Conversion Rate" value={`${s.conversionRate || 0}%`} good={(s.conversionRate || 0) >= 50} />
                <Pill label="Cancellation Rate" value={`${s.cancellationRate || 0}%`} good={(s.cancellationRate || 0) <= 20} />
                <Pill label="Pending" value={(s.pendingCount || 0).toString()} good={true} />
              </div>

              {trends.length > 0 && (
                <Card title="Bookings Over Time" action={dlBtn(trends, 'Bookings_Trend', [{ header: 'Date', key: 'date' }, { header: 'Bookings', key: 'bookings' }, { header: 'Cancelled', key: 'cancelled' }, { header: 'Completed', key: 'completed' }])}>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        {gradDefs}
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CT />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="bookings" name="Total" stroke="#6366f1" fill="url(#grad0)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="url(#grad1)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" fill="url(#grad3)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {topRoutes.length > 0 && (
                  <Card title="Top Routes" action={dlBtn(topRoutes, 'Top_Routes', [{ header: 'From', key: 'fromCity' }, { header: 'To', key: 'toCity' }, { header: 'Bookings', key: 'count' }, { header: 'Revenue ₹', key: 'revenue' }])}>
                    <RankList items={topRoutes.map((r: any) => ({ ...r, label: `${r.fromCity} → ${r.toCity}` }))} valueKey="count" labelKey="label" color="#6366f1" />
                  </Card>
                )}

                {hourly.some((h: any) => h.bookings > 0) && (
                  <Card title="Peak Booking Hours">
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={3} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="bookings" name="Bookings" radius={[3, 3, 0, 0]}>
                            {hourly.map((_: any, i: number) => {
                              const ph = s.peakHour ?? -1;
                              return <Cell key={i} fill={i === ph ? '#f59e0b' : '#6366f1'} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {s.peakHour != null && (
                      <p className="text-xs text-amber-600 font-semibold mt-3 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" /> Peak at {s.peakHour}:00 — {hourly[s.peakHour]?.bookings || 0} bookings
                      </p>
                    )}
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ══ USERS TAB ══ */}
          {tab === 'users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label="Unique Users" value={s.uniqueUserCount || 0} icon={Users} color="indigo" />
                <KPI label="New Users" value={s.totalNewUsers || 0} icon={TrendingUp} color="green" />
                <KPI label="Repeat Users" value={`${s.repeatUserRate || 0}%`} icon={Repeat2} color="purple" sub="booked 2+ times" />
                <KPI label="Revenue / User" value={`₹${(s.revenuePerUser || 0).toLocaleString()}`} icon={DollarSign} color="amber" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cityDist.length > 0 && (
                  <Card title="User Distribution by City">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cityDist.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 55, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="city" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="count" name="Users" radius={[0, 4, 4, 0]}>
                            {cityDist.slice(0, 10).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {topUsers.length > 0 && (
                  <Card title="Top Bookers" action={dlBtn(topUsers, 'Top_Users', [{ header: 'Name', key: 'name' }, { header: 'Bookings', key: 'count' }])}>
                    <div className="space-y-2.5">
                      {topUsers.slice(0, 8).map((u: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {(u.name || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                            <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${(u.count / (topUsers[0]?.count || 1)) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-sm font-black text-gray-900 shrink-0">{u.count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {topSpenders.length > 0 && (
                <Card title="Top Spenders" action={dlBtn(topSpenders, 'Top_Spenders', [{ header: 'Name', key: 'name' }, { header: 'Spend ₹', key: 'spend' }])}>
                  <RankList items={topSpenders.slice(0, 8)} valueKey="spend" labelKey="name" prefix="₹" color="#10b981" />
                </Card>
              )}
            </div>
          )}

          {/* ══ PROVIDERS TAB ══ */}
          {tab === 'providers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label="Active Providers" value={topProviders.length} icon={Bus} color="indigo" />
                <KPI label="Top Provider Trips" value={topProviders[0]?.count || 0} icon={Route} color="green" />
                <KPI label="Platform Avg Rating" value={(ana?.topProvidersByRating?.[0]?.avgRating || 0).toFixed(1)} icon={Star} color="amber" />
                <KPI label="Vehicle Types" value={vehicleTypes.length} icon={BarChart2} color="purple" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {topProviders.length > 0 && (
                  <Card title="Top Providers by Bookings" action={dlBtn(topProviders, 'Top_Providers', [{ header: 'Company', key: 'companyName' }, { header: 'Bookings', key: 'count' }, { header: 'Revenue ₹', key: 'revenue' }])}>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topProviders.slice(0, 7)} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="companyName" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="count" name="Bookings" radius={[4, 4, 0, 0]}>
                            {topProviders.slice(0, 7).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {vehicleTypes.length > 0 && (
                  <Card title="Fleet Distribution">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={vehicleTypes} dataKey="count" nameKey="type" cx="50%" cy="50%"
                            innerRadius="35%" outerRadius="65%" paddingAngle={3}
                            label={(p: any) => `${p.type} (${((p.percent || 0) * 100).toFixed(0)}%)`} labelLine={false}>
                            {vehicleTypes.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {topRated.length > 0 && (
                  <Card title="Top Rated Providers">
                    <div className="space-y-3">
                      {topRated.slice(0, 8).map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{p.companyName}</p>
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <span key={s} className={`text-sm ${s <= Math.round(p.avgRating || 0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                              ))}
                            </div>
                          </div>
                          <span className="text-sm font-black text-amber-600 shrink-0">{(p.avgRating || 0).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {revByProvider.length > 0 && (
                  <Card title="Revenue by Provider" action={dlBtn(revByProvider, 'Revenue_Providers', [{ header: 'Company', key: 'companyName' }, { header: 'Revenue ₹', key: 'revenue' }])}>
                    <RankList items={revByProvider.slice(0, 8)} valueKey="revenue" labelKey="companyName" prefix="₹" color="#10b981" />
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ══ FEEDBACK TAB ══ */}
          {tab === 'feedback' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label="Total Reviews" value={fs.total || 0} icon={Star} color="amber" />
                <KPI label="Avg Rating" value={`${fs.avgRating || 0} ★`} icon={Award} color="green" />
                <KPI label="Positive (4-5★)" value={fs.positive || 0} icon={TrendingUp} color="indigo" />
                <KPI label="Satisfaction Rate" value={`${fs.satisfactionRate || 0}%`} icon={Target} color="purple" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Satisfaction gauge */}
                <Card title="Customer Satisfaction">
                  <div className="flex flex-col items-center">
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="70%" innerRadius="60%" outerRadius="90%"
                          startAngle={180} endAngle={0} data={gaugeData}>
                          <RadialBar dataKey="value" cornerRadius={8} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-4xl font-black text-emerald-600 -mt-8">{satRate}%</p>
                    <p className="text-sm text-gray-500 mt-1">satisfied customers</p>
                    <div className="grid grid-cols-3 gap-3 w-full mt-4">
                      <div className="text-center p-2 bg-emerald-50 rounded-xl">
                        <p className="text-xs text-gray-500">Positive</p>
                        <p className="font-bold text-emerald-600">{fs.positive || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500">Neutral</p>
                        <p className="font-bold text-gray-600">{fs.neutral || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-xl">
                        <p className="text-xs text-gray-500">Negative</p>
                        <p className="font-bold text-red-600">{fs.negative || 0}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Rating distribution */}
                <div className="md:col-span-2">
                  <Card title="Rating Distribution" action={dlBtn(ratingDist, 'Rating_Dist', [{ header: 'Stars', key: 'stars' }, { header: 'Count', key: 'count' }])}>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ratingDist} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="stars" tickFormatter={(v) => `${v}★`} tick={{ fontSize: 12, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="count" name="Reviews" radius={[6, 6, 0, 0]}>
                            {ratingDist.map((d: any, i: number) => (
                              <Cell key={i} fill={d.stars >= 4 ? '#10b981' : d.stars === 3 ? '#f59e0b' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {fs.total === 0 && <Empty text="No feedback in this period" />}
                  </Card>
                </div>
              </div>

              {/* KPI insights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 text-center">
                  <Clock className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Period Feedback</p>
                  <p className="text-2xl font-black text-indigo-700">{fs.total || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 text-center">
                  <Star className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Avg Stars</p>
                  <p className="text-2xl font-black text-amber-700">{fs.avgRating || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-5 text-center">
                  <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">5-Star Reviews</p>
                  <p className="text-2xl font-black text-emerald-700">{ratingDist[4]?.count || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl p-5 text-center">
                  <MapPin className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Needs Attention</p>
                  <p className="text-2xl font-black text-red-700">{fs.negative || 0}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
