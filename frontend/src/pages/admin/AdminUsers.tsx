import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import {
  Users, User, Mail, Phone, Calendar, Shield, Ban, CheckCircle,
  Download, MessageCircle, BarChart2, TrendingUp, MapPin, ArrowRight,
  Search, X, RefreshCw, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../utils/exportUtils';
import Modal from '../../components/Modal';

/* ── debounce ─────────────────────────────────────────────────────────────── */
function useDebounce<T>(value: T, ms = 400): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

/* ── skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-gray-100 rounded-xl" />
          <div className="h-8 w-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ── role config ──────────────────────────────────────────────────────────── */
const ROLE_CFG: Record<string, { cls: string; iconCls: string; gradient: string }> = {
  ADMIN: { cls: 'bg-purple-50 text-purple-700 border-purple-200', iconCls: 'text-purple-500', gradient: 'from-purple-500 to-indigo-600' },
  PROVIDER: { cls: 'bg-blue-50 text-blue-700 border-blue-200', iconCls: 'text-blue-500', gradient: 'from-blue-500 to-cyan-600' },
  PASSENGER: { cls: 'bg-gray-100 text-gray-600 border-gray-200', iconCls: 'text-gray-400', gradient: 'from-gray-400 to-gray-500' },
};

const ROLE_ICON: Record<string, any> = { ADMIN: Shield, PROVIDER: Users, PASSENGER: User };

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CFG[role] ?? ROLE_CFG.PASSENGER;
  const Icon = ROLE_ICON[role] ?? User;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />{role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

const ROLE_TABS = ['all', 'PASSENGER', 'PROVIDER', 'ADMIN'];
const ROLE_LABELS: Record<string, string> = { all: 'All', PASSENGER: 'Passengers', PROVIDER: 'Providers', ADMIN: 'Admins' };

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageUser, setMessageUser] = useState<any>(null);
  const [msgForm, setMsgForm] = useState({ title: '', message: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 400);
  useEffect(() => setPage(1), [debouncedSearch, selectedRole, activeFilter]);

  /* ── Queries ── */
  const { data: usersData, isLoading, isFetching, refetch } = useQuery<{ data: any[]; meta: any }>({
    queryKey: ['admin-users', selectedRole, debouncedSearch, page, activeFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: '10' });
      if (selectedRole !== 'all') p.set('role', selectedRole);
      if (debouncedSearch) p.set('search', debouncedSearch.trim());
      if (activeFilter !== 'all') p.set('isActive', String(activeFilter === 'active'));
      return api.get<{ data: any[]; meta: any }>(`/admin/users?${p}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const { data: userAnalytics, isLoading: anaLoading } = useQuery({
    queryKey: ['admin-user-analytics', selectedUser?.id],
    queryFn: () => api.get<any>(`/admin/users/${selectedUser!.id}/analytics`),
    enabled: !!selectedUser,
    staleTime: 120000,
  });

  const users = usersData?.data ?? [];
  const meta = usersData?.meta ?? {};

  /* ── Mutations ── */
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/users/${id}/status`, { isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User status updated'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const msgMutation = useMutation({
    mutationFn: () => api.post('/admin/notifications/send', {
      recipientType: 'SPECIFIC_USER',
      userId: messageUser!.id,
      title: msgForm.title,
      message: msgForm.message,
    }),
    onSuccess: () => { toast.success('Message sent'); setMessageUser(null); setMsgForm({ title: '', message: '' }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  /* ── Export ── */
  const handleExport = async () => {
    const t = toast.loading('Preparing export…');
    try {
      const p = new URLSearchParams({ limit: '10000' });
      if (selectedRole !== 'all') p.set('role', selectedRole);
      const res = await api.get<{ data: any[] }>(`/admin/users?${p}`);
      const rows = (res?.data ?? []).map((u: any) => ({
        Name: u.name, Email: u.email, Phone: u.phone || '-', Role: u.role,
        Status: u.isActive ? 'Active' : 'Inactive',
        Joined: u.createdAt ? format(new Date(u.createdAt), 'yyyy-MM-dd') : 'N/A',
        Bookings: u._count?.bookings ?? 0,
      }));
      if (!rows.length) { toast.dismiss(t); toast.error('No data'); return; }
      exportToCSV(rows, 'Users_Report', [
        { header: 'Name', key: 'Name' }, { header: 'Email', key: 'Email' },
        { header: 'Phone', key: 'Phone' }, { header: 'Role', key: 'Role' },
        { header: 'Status', key: 'Status' }, { header: 'Joined', key: 'Joined' },
        { header: 'Bookings', key: 'Bookings' },
      ]);
      toast.dismiss(t); toast.success('Export ready!');
    } catch { toast.dismiss(t); toast.error('Export failed'); }
  };

  const formatCurrency = (n: number) => n ? `₹${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '₹0';

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {meta.total != null ? `${meta.total} total` : '—'}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· refreshing</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} title="Refresh"
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          {search && <button onClick={() => { setSearch(''); searchRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
        </div>

        {/* Active/Inactive toggle */}
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${activeFilter === f ? (f === 'active' ? 'bg-emerald-600 text-white border-emerald-600' : f === 'inactive' ? 'bg-red-600 text-white border-red-600' : 'bg-indigo-600 text-white border-indigo-600')
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Role tabs ── */}
      <div className="flex flex-wrap gap-2 bg-gray-50/80 rounded-2xl p-2 border border-gray-100">
        {ROLE_TABS.map(r => (
          <button key={r} onClick={() => { setSelectedRole(r); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedRole === r ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-gray-100'
              }`}>
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* ── User list ── */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Users className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-semibold">No users found</p>
          <p className="text-gray-400 text-sm mt-1">{search ? `No results for "${search}"` : `No ${ROLE_LABELS[selectedRole].toLowerCase()} users`}</p>
          {search && <button onClick={() => setSearch('')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Clear search</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user: any) => {
            const roleCfg = ROLE_CFG[user.role] ?? ROLE_CFG.PASSENGER;
            const createdAt = user.createdAt ? new Date(user.createdAt) : null;
            return (
              <div key={user.id}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Avatar + info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${roleCfg.gradient} flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm`}>
                      {(user.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{user.name}</span>
                        <RoleBadge role={user.role} />
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" />Active</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><Ban className="h-3.5 w-3.5" />Disabled</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {user.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>}
                        {user.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{user.phone}</span>}
                        {createdAt && !isNaN(createdAt.getTime()) && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(createdAt, 'MMM d, yyyy')}</span>}
                        {user._count?.bookings != null && <span className="flex items-center gap-1 font-semibold text-indigo-600"><TrendingUp className="h-3.5 w-3.5" />{user._count.bookings} bookings</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      <BarChart2 className="h-4 w-4" /> Details
                    </button>
                    <button onClick={() => setMessageUser(user)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <MessageCircle className="h-4 w-4" /> Message
                    </button>
                    {user.isActive ? (
                      <button onClick={() => statusMutation.mutate({ id: user.id, isActive: false })}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60">
                        <Ban className="h-4 w-4" /> Disable
                      </button>
                    ) : (
                      <button onClick={() => statusMutation.mutate({ id: user.id, isActive: true })}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60">
                        <CheckCircle className="h-4 w-4" /> Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Pagination ── */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages} · {meta.total} users</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
                  const p = start + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── User Details Modal ── */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title={
        selectedUser && (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_CFG[selectedUser.role]?.gradient ?? 'from-gray-400 to-gray-500'} flex items-center justify-center text-white font-black text-lg`}>
              {(selectedUser.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{selectedUser.name}</p>
              <p className="text-xs text-gray-400">User Analytics</p>
            </div>
          </div>
        )
      } maxWidth="max-w-4xl">
        {selectedUser && (
          <div className="space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Email', value: selectedUser.email || 'N/A', icon: Mail },
                { label: 'Phone', value: selectedUser.phone || 'N/A', icon: Phone },
                { label: 'Role', value: selectedUser.role, icon: Shield },
                { label: 'Status', value: selectedUser.isActive ? 'Active' : 'Inactive', icon: CheckCircle },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <div className="flex items-center gap-1.5">
                    <item.icon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics */}
            {anaLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
              </div>
            ) : userAnalytics ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Spend', value: formatCurrency(userAnalytics.stats?.totalSpend ?? 0), cls: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700' },
                    { label: 'Total Bookings', value: userAnalytics.stats?.totalBookings ?? 0, cls: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700' },
                    { label: 'Completed', value: userAnalytics.stats?.completed ?? 0, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700' },
                    { label: 'Cancelled', value: userAnalytics.stats?.cancelled ?? 0, cls: 'from-red-50 to-red-100 border-red-200 text-red-700' },
                  ].map(k => (
                    <div key={k.label} className={`p-4 rounded-xl border bg-gradient-to-br ${k.cls}`}>
                      <p className="text-xs font-medium opacity-70 mb-1">{k.label}</p>
                      <p className="text-2xl font-black">{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Top routes */}
                {userAnalytics.topRoutes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-400" />Favourite Routes</h4>
                    <div className="space-y-2">
                      {userAnalytics.topRoutes.slice(0, 5).map((r: any) => (
                        <div key={r.routeId || r.name} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                            {r.name}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{r.bookings} trips</span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(r.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent bookings */}
                {userAnalytics.recentBookings?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-400" />Recent Bookings</h4>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr>
                          {['Route', 'Date', 'Status', 'Amount'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {userAnalytics.recentBookings.map((b: any) => (
                            <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 font-medium text-gray-800">
                                  {b.fromCity || '—'}<ArrowRight className="h-3 w-3 text-gray-400" />{b.toCity || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                {b.journeyDate ? format(new Date(b.journeyDate), 'MMM d, yyyy') : b.createdAt ? format(new Date(b.createdAt), 'MMM d, yyyy') : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                    b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}>{b.status}</span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-indigo-600">{formatCurrency(b.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* User ID */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">User ID (for notifications)</p>
              <p className="font-mono text-xs text-gray-700 break-all">{selectedUser.id}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Message Modal ── */}
      <Modal isOpen={!!messageUser} onClose={() => setMessageUser(null)}
        title={messageUser ? `Message — ${messageUser.name}` : 'Message User'}>
        {messageUser && (
          <form onSubmit={e => { e.preventDefault(); msgMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Subject</label>
              <input type="text" required value={msgForm.title} onChange={e => setMsgForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="e.g. Account Update" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Message</label>
              <textarea required rows={5} value={msgForm.message} onChange={e => setMsgForm(p => ({ ...p, message: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                placeholder="Write your message…" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setMessageUser(null)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={msgMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
                {msgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {msgMutation.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
