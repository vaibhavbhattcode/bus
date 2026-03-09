import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Plus, CheckCircle, XCircle, Pencil, Save, Trash2, MapPin, Map, Link, IndianRupee, Hash, Loader2, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';

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

export default function AdminDestinations() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    city: '',
    state: '',
    image: '',
    priceLabel: '',
    order: 0,
    isActive: true,
  });

  const { data: destinations, isLoading, isFetching, refetch } = useQuery<any[]>({
    queryKey: ['admin-destinations'],
    queryFn: () => api.get<any[]>('/destinations/admin'),
    staleTime: 60000,
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: any) => api.post('/destinations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['popular-destinations'] });
      toast.success(editingId ? 'Destination updated successfully' : 'Destination added successfully');
      setEditingId(null);
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save destination');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/destinations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-destinations'] });
      queryClient.invalidateQueries({ queryKey: ['popular-destinations'] });
      toast.success('Destination deleted successfully');
    },
    onError: () => toast.error('Failed to delete destination'),
  });

  const resetForm = () => {
    setForm({ city: '', state: '', image: '', priceLabel: '', order: 0, isActive: true });
    setEditingId(null);
  };

  const handleEdit = (d: any) => {
    setForm({
      city: d.city,
      state: d.state,
      image: d.image,
      priceLabel: d.priceLabel || '',
      order: d.order || 0,
      isActive: !!d.isActive,
    });
    setEditingId(d.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = editingId ? { id: editingId, ...form } : form;
    upsertMutation.mutate(payload);
  };

  const activeCount = destinations?.filter(d => d.isActive).length || 0;
  const inactiveCount = destinations?.filter(d => !d.isActive).length || 0;

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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Popular Destinations</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {destinations?.length != null ? `${destinations.length} total destinations` : '—'}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400 animate-pulse">· refreshing</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Plus className="h-4 w-4" /> Add Destination
          </button>
        </div>
      </motion.div>

      {/* ── Summary Stats ── */}
      <motion.div variants={fadeUpVariant} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Destinations', value: destinations?.length ?? 0, cls: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700', icon: MapPin },
          { label: 'Active', value: activeCount, cls: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700', icon: CheckCircle },
          { label: 'Inactive', value: inactiveCount, cls: 'from-gray-50 to-gray-200 border-gray-300 text-gray-700', icon: XCircle },
        ].map((k) => (
          <motion.div
            key={k.label}
            whileHover={{ y: -4, scale: 1.01 }}
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
                {['Destination', 'Image', 'Price Label', 'Order', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : destinations?.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Map className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-semibold">No destinations configured</p>
                  <p className="text-gray-400 text-xs mt-1">Add popular destinations to show on the homepage</p>
                </td></tr>
              ) : (
                destinations?.map((d: any, i: number) => (
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={d.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    {/* Destination */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{d.city}</span>
                        <span className="text-xs text-gray-500">{d.state}</span>
                      </div>
                    </td>

                    {/* Image */}
                    <td className="px-5 py-4">
                      <img src={d.image} alt={d.city} className="w-16 h-12 rounded-lg object-cover border border-gray-100 shadow-sm" />
                    </td>

                    {/* Price Label */}
                    <td className="px-5 py-4 text-gray-600 font-medium">
                      {d.priceLabel ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg text-sm w-fit border border-gray-200">
                          {d.priceLabel}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Not set</span>
                      )}
                    </td>

                    {/* Order */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-semibold text-gray-700">{d.order}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {d.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          <XCircle className="h-3 w-3" />Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(d)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => {
                          if (confirm(`Delete destination "${d.city}"?`)) deleteMutation.mutate(d.id);
                        }}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? 'Edit Destination' : 'Add Destination'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input required type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">State</label>
              <div className="relative">
                <Map className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input required type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Image URL</label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input required type="url" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            {form.image && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Image Preview:</p>
                <img src={form.image} alt="Preview" className="h-24 rounded-lg object-cover border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Price Label</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" value={form.priceLabel} onChange={e => setForm({ ...form, priceLabel: e.target.value })}
                  placeholder="e.g. From ₹800"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Display Order</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="number" required value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div>
              <p className="font-bold text-gray-900 text-sm">Active Status</p>
              <p className="text-xs text-gray-500">Show this destination on the homepage</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 font-semibold">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={upsertMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
              {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Save Changes' : 'Add Destination'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
