import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api'; // keep for feature-flags and metrics (no service layer yet)
import { adminService } from '../../services/admin.service';
import { queryKeys } from '../../lib/queryKeys';
import {
  Users, Bus, BookOpen,
  AlertCircle,
  Activity, BarChart2, LineChart, Download, ArrowUpRight,
  ArrowDownRight, DollarSign, Star,
  RefreshCw, Eye, Map
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AccessLogMap from '../../components/AccessLogMap';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, growth, prefix = '', subtitle, onClick
}: {
  label: string;
  value: number | string;
  icon: any;
  color: string;
  growth?: number;
  prefix?: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  const isPositive = growth === undefined || growth >= 0;
  const colorMap: Record<string, { bg: string; iconBg: string; text: string; bar: string }> = {
    blue: { bg: 'from-blue-50 to-blue-100/50', iconBg: 'bg-blue-500', text: 'text-blue-600', bar: 'bg-blue-500' },
    green: { bg: 'from-green-50 to-green-100/50', iconBg: 'bg-green-500', text: 'text-green-600', bar: 'bg-green-500' },
    purple: { bg: 'from-purple-50 to-purple-100/50', iconBg: 'bg-purple-500', text: 'text-purple-600', bar: 'bg-purple-500' },
    orange: { bg: 'from-orange-50 to-orange-100/50', iconBg: 'bg-orange-500', text: 'text-orange-600', bar: 'bg-orange-500' },
    red: { bg: 'from-red-50 to-red-100/50', iconBg: 'bg-red-500', text: 'text-red-600', bar: 'bg-red-500' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`relative bg-gradient-to-br ${c.bg} border border-white/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${c.iconBg} p-3 rounded-xl shadow-sm`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {growth !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(growth)}%
          </span>
          <span className="text-xs text-gray-500">vs yesterday</span>
        </div>
      )}
    </div>
  );
}

// ── Bar Mini Chart ─────────────────────────────────────────────────────────
function MiniBarList({
  data, valueKey, labelKey, colorClass = 'bg-primary-500', prefix = ''
}: {
  data: any[];
  valueKey: string;
  labelKey: string;
  colorClass?: string;
  prefix?: string;
}) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No data available</p>;
  }
  const max = Math.max(...data.map((d) => d[valueKey] || 0)) || 1;
  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((item, i) => {
        const pct = Math.round(((item[valueKey] || 0) / max) * 100);
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 truncate max-w-[180px]">{item[labelKey]}</span>
              <span className="font-semibold text-gray-900">
                {prefix}{typeof item[valueKey] === 'number' ? item[valueKey].toLocaleString() : item[valueKey]}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-2 ${colorClass} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[140px]">
      <p className="text-gray-500 font-medium mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-gray-800">
            {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ Migrated: typed adminService + proper queryKeys
  const { data: dashboard, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: adminService.getDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: flags } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => api.get<any[]>('/feature-flags').catch(() => []),
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: () =>
      api
        .get<any>('/metrics/summary?window=3600')
        .catch(() => ({ totalRequests: 0, avgDurationMs: 0, errorRatePercent: 0 })),
    retry: 0,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
  });

  // ✅ Migrated: typed adminService.getAnalytics
  const { data: analytics } = useQuery({
    queryKey: queryKeys.admin.analytics(),
    queryFn: () => adminService.getAnalytics().catch(() => null),
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const { data: growthData } = useQuery({
    queryKey: ['admin-growth'],
    queryFn: () => api.get<any[]>('/admin/analytics/growth?months=6').catch(() => []),
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 300_000,
  });

  const toggleFlag = useMutation({
    mutationFn: (payload: { id: string; enabled: boolean }) =>
      api.patch(`/feature-flags/${payload.id}/toggle`, { enabled: payload.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feature-flags'] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-64 bg-gray-100 rounded-2xl" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const trendData = (analytics?.trends || []).slice(-14);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time platform overview • Updated {format(new Date(), 'HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm ${isFetching ? 'opacity-70' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              const rows = [
                { metric: 'Total Users', value: dashboard?.overview?.totalUsers || 0 },
                { metric: 'Total Providers', value: dashboard?.overview?.totalProviders || 0 },
                { metric: 'Total Bookings', value: dashboard?.overview?.totalBookings || 0 },
                { metric: 'Total Revenue', value: dashboard?.overview?.totalRevenue || 0 },
                { metric: "Today's Bookings", value: dashboard?.today?.bookings || 0 },
                { metric: "Today's Revenue", value: dashboard?.today?.revenue || 0 },
              ];
              exportToCSV(rows, 'Dashboard_Summary', [
                { header: 'Metric', key: 'metric' },
                { header: 'Value', key: 'value' },
              ]);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {((dashboard?.alerts?.pendingProviders || 0) > 0 || (dashboard?.alerts?.openTickets || 0) > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center gap-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex flex-wrap gap-4 flex-1">
            {(dashboard?.alerts?.pendingProviders || 0) > 0 && (
              <button
                onClick={() => navigate('/admin/providers')}
                className="flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-900"
              >
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {dashboard?.alerts?.pendingProviders}
                </span>
                Providers awaiting verification
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
            {(dashboard?.alerts?.openTickets || 0) > 0 && (
              <button
                onClick={() => navigate('/admin/support')}
                className="flex items-center gap-2 text-sm font-medium text-amber-800 hover:text-amber-900"
              >
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {dashboard?.alerts?.openTickets}
                </span>
                Open support tickets
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={dashboard?.overview?.totalUsers || 0}
          icon={Users}
          color="blue"
          growth={dashboard?.last30Days?.usersGrowth}
          subtitle={`+${dashboard?.last30Days?.newUsers || 0} this month`}
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          label="Providers"
          value={dashboard?.overview?.totalProviders || 0}
          icon={Bus}
          color="green"
          subtitle={`${dashboard?.alerts?.pendingProviders || 0} pending approval`}
          onClick={() => navigate('/admin/providers')}
        />
        <StatCard
          label="Total Bookings"
          value={dashboard?.overview?.totalBookings || 0}
          icon={BookOpen}
          color="purple"
          growth={dashboard?.last30Days?.bookingsGrowth}
          subtitle={`${dashboard?.last30Days?.bookings || 0} in last 30 days`}
          onClick={() => navigate('/admin/bookings')}
        />
        <StatCard
          label="Total Revenue"
          value={`₹${(dashboard?.overview?.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          color="orange"
          growth={dashboard?.last30Days?.revenueGrowth}
          subtitle={`₹${(dashboard?.last30Days?.revenue || 0).toLocaleString()} last 30d`}
        />
      </div>

      {/* Today + 30-day Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Today's Performance</h3>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">Live</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Bookings</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-gray-900">{dashboard?.today?.bookings || 0}</span>
                {(dashboard?.today?.bookingsGrowth !== undefined) && (
                  <span className={`text-xs font-medium mb-1 ${(dashboard?.today?.bookingsGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(dashboard?.today?.bookingsGrowth ?? 0) >= 0 ? '+' : ''}{dashboard?.today?.bookingsGrowth}% vs yesterday
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Revenue</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  ₹{(dashboard?.today?.revenue || 0).toLocaleString()}
                </span>
                {(dashboard?.today?.revenueGrowth !== undefined) && (
                  <span className={`text-xs font-medium mb-1 ${(dashboard?.today?.revenueGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(dashboard?.today?.revenueGrowth ?? 0) >= 0 ? '+' : ''}{dashboard?.today?.revenueGrowth}% vs yesterday
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">SLA Metrics (1h)</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" /> Avg Response
              </span>
              <span className={`font-bold ${(metrics?.avgDurationMs || 0) > 500 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics?.avgDurationMs || 0} ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Error Rate</span>
              <span className={`font-bold ${(metrics?.errorRatePercent || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics?.errorRatePercent || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Requests</span>
              <span className="font-bold text-gray-800">{(metrics?.totalRequests || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Feature Flags</h3>
          <div className="space-y-2">
            {(flags || []).slice(0, 3).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate max-w-[120px]">{f.key}</span>
                <button
                  onClick={() => toggleFlag.mutate({ id: f.id, enabled: !f.enabled })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${f.enabled ? 'bg-primary-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${f.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
            {(!flags || flags.length === 0) && <p className="text-xs text-gray-400">No flags configured</p>}
            {(flags?.length || 0) > 3 && (
              <p className="text-xs text-gray-400 text-right">+{flags!.length - 3} more</p>
            )}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Bookings & Revenue Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 14 periods</p>
            </div>
            <LineChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="bookings" name="Bookings" stroke="#6366f1" fill="url(#colorBookings)" strokeWidth={2} dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Growth Chart */}
      {(growthData || []).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">6-Month Growth Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Users, Bookings & Revenue per month</p>
            </div>
            <BarChart2 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="users" name="New Users" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bookings" name="Bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="providers" name="New Providers" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Top Routes</h3>
            <button onClick={() => navigate('/admin/analytics')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <Eye className="h-3 w-3" />
            </button>
          </div>
          <MiniBarList
            data={(analytics?.topRoutes || []).map((r: any) => ({ ...r, label: `${r.fromCity} → ${r.toCity}` }))}
            labelKey="label"
            valueKey="count"
            colorClass="bg-primary-500"
          />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Top Providers (Bookings)</h3>
            <button onClick={() => navigate('/admin/providers')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Manage <Eye className="h-3 w-3" />
            </button>
          </div>
          <MiniBarList
            data={analytics?.topProvidersByBookings || []}
            labelKey="companyName"
            valueKey="count"
            colorClass="bg-green-500"
          />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Top Providers (Rating)</h3>
            <Star className="h-4 w-4 text-yellow-400" />
          </div>
          <MiniBarList
            data={(analytics?.topProvidersByRating || []).map((p: any) => ({ ...p, ratingDisplay: p.avgRating?.toFixed(1) || 0 }))}
            labelKey="companyName"
            valueKey="avgRating"
            colorClass="bg-yellow-400"
          />
        </div>
      </div>

      {/* Top Users + Top Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Top Users by Bookings</h3>
            <button
              onClick={() => {
                const users = analytics?.topUsersByBookings || [];
                exportToCSV(users, 'Top_Users', [
                  { header: 'User ID', key: 'userId' },
                  { header: 'Name', key: 'name' },
                  { header: 'Bookings', key: 'count' },
                ]);
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <Download className="h-3 w-3" /> Export
            </button>
          </div>
          <MiniBarList
            data={analytics?.topUsersByBookings || []}
            labelKey="name"
            valueKey="count"
            colorClass="bg-blue-500"
          />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Top Vehicles by Trips</h3>
            <button
              onClick={() => {
                const vehicles = analytics?.topVehicles || [];
                exportToCSV(vehicles, 'Top_Vehicles', [
                  { header: 'Vehicle ID', key: 'vehicleId' },
                  { header: 'Name', key: 'name' },
                  { header: 'Trips', key: 'count' },
                ]);
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <Download className="h-3 w-3" /> Export
            </button>
          </div>
          <MiniBarList
            data={analytics?.topVehicles || []}
            labelKey="name"
            valueKey="count"
            colorClass="bg-purple-500"
          />
        </div>
      </div>

      {/* Recent Activity */}
      {(dashboard?.recentActivity || []).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <span className="text-xs text-gray-400">Latest 5 bookings</span>
          </div>
          <div className="space-y-3">
            {(dashboard?.recentActivity || []).map((act: any) => (
              <div key={act.id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                <div className="bg-primary-50 p-2 rounded-xl shrink-0">
                  <BookOpen className="h-4 w-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{act.description}</p>
                  <p className="text-xs text-gray-400">{format(new Date(act.createdAt), 'MMM dd, HH:mm')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">₹{(act.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${act.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                    act.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      act.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                    }`}>
                    {act.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geospatial Distribution Map */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900">Geospatial Distribution</h3>
            <p className="text-xs text-gray-500 mt-0.5">Live monitoring of user origins across domains</p>
          </div>
          <Map className="h-5 w-5 text-gray-400" />
        </div>
        <AccessLogMap />
      </div>

    </div>
  );
}
