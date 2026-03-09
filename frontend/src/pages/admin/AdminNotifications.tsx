import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Bell, Send, Users, User, CheckCircle, AlertCircle, Filter,
  Megaphone, Shield, MapPin, Loader2, Sparkles, Eye,
} from 'lucide-react';
import CitySearchInput from '../../components/CitySearchInput';
import toast from 'react-hot-toast';
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

type RecipientType = 'ALL_USERS' | 'ALL_PROVIDERS' | 'ALL_PASSENGERS' | 'SPECIFIC_USER';

const RECIPIENT_OPTS: { value: RecipientType; label: string; sub: string; icon: any; gradient: string }[] = [
  { value: 'ALL_USERS', label: 'All Users', sub: 'Passengers & providers', icon: Users, gradient: 'from-indigo-500 to-purple-600' },
  { value: 'ALL_PROVIDERS', label: 'Providers Only', sub: 'Bus operators', icon: Shield, gradient: 'from-blue-500 to-cyan-600' },
  { value: 'ALL_PASSENGERS', label: 'Passengers Only', sub: 'Travellers', icon: Megaphone, gradient: 'from-emerald-500 to-teal-600' },
  { value: 'SPECIFIC_USER', label: 'Specific User', sub: 'Send to one person', icon: User, gradient: 'from-orange-500 to-amber-600' },
];

const NOTIFICATION_PRESETS = [
  { title: 'System Maintenance', message: 'Scheduled maintenance on Feb 20 from 2–4 AM IST. Services may be temporarily unavailable.', icon: '🔧' },
  { title: 'Special Offer!', message: '🎉 Enjoy 20% off on all bookings this weekend! Use code WEEKEND20 at checkout.', icon: '🎁' },
  { title: 'Account Reminder', message: 'Please complete your profile to enjoy a seamless booking experience.', icon: '📋' },
  { title: 'New Feature', message: 'We\'ve launched seat selection! Choose your preferred seat when booking your next trip.', icon: '✨' },
];

export default function AdminNotifications() {
  const [form, setForm] = useState({
    recipientType: 'ALL_USERS' as RecipientType,
    userId: '',
    title: '',
    message: '',
    city: '',
  });
  const [lastSent, setLastSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/notifications/send', data),
    onSuccess: () => {
      toast.success('Notification sent successfully!');
      setLastSent(true);
      setSentCount(c => c + 1);
      setForm(f => ({ ...f, userId: '', title: '', message: '', city: '' }));
      setTimeout(() => setLastSent(false), 5000);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send notification'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.recipientType === 'SPECIFIC_USER' && !form.userId.trim()) {
      toast.error('Please enter a User ID');
      return;
    }
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    mutation.mutate(form);
  };

  const charMax = 500;
  const charPercent = Math.min((form.message.length / charMax) * 100, 100);
  const charColor = charPercent > 90 ? 'text-red-500' : charPercent > 70 ? 'text-amber-500' : 'text-gray-400';

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-4xl"
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUpVariant} className="flex items-center gap-4">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200"
        >
          <Bell className="h-6 w-6 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Send Notifications</h1>
          <p className="text-sm text-gray-400">Broadcast messages to users, providers, or specific individuals</p>
        </div>
        {sentCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {sentCount} sent this session
          </motion.div>
        )}
      </motion.div>

      {/* ── Success banner ── */}
      <AnimatePresence>
        {lastSent && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700"
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">Notification sent successfully! Recipients will see it in real-time.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main form ── */}
        <motion.form variants={fadeUpVariant} onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          {/* Recipients */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-300">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" /> Select Recipients
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RECIPIENT_OPTS.map((opt, i) => {
                const Icon = opt.icon;
                const active = form.recipientType === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, recipientType: opt.value }))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${active ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100' : 'border-gray-100 hover:border-indigo-200 bg-gray-50/50'
                      }`}>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${active ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.sub}</p>
                    </div>
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto w-2 h-2 rounded-full bg-indigo-500"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Specific user ID */}
            <AnimatePresence>
              {form.recipientType === 'SPECIFIC_USER' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">User ID</label>
                  <input type="text" required value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Paste the user's UUID here" />
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />Find user IDs in the Users Management page
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* City filter (non-specific) */}
            <AnimatePresence>
              {form.recipientType !== 'SPECIFIC_USER' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <Filter className="h-3.5 w-3.5" /><MapPin className="h-3.5 w-3.5" />
                    Optional: filter by city
                  </p>
                  <CitySearchInput label="" placeholder="Leave empty for all cities"
                    value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message content */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow duration-300">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-500" /> Notification Content
            </h2>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
              <input type="text" required maxLength={100} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g., System Maintenance Update" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message *</label>
              <textarea required rows={5} maxLength={charMax} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                placeholder="Write your notification message here…" />
              <div className="flex items-center justify-between mt-1">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden mr-3">
                  <motion.div
                    className={`h-full rounded-full ${charPercent > 90 ? 'bg-red-400' : charPercent > 70 ? 'bg-amber-400' : 'bg-indigo-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${charPercent}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>
                <p className={`text-xs font-semibold ${charColor}`}>{form.message.length}/{charMax}</p>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={mutation.isPending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {mutation.isPending ? 'Sending…' : 'Send Notification'}
          </motion.button>
        </motion.form>

        {/* ── Presets panel ── */}
        <motion.div variants={fadeUpVariant} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-300">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Quick Presets
            </h2>
            <div className="space-y-2">
              {NOTIFICATION_PRESETS.map((preset, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, title: preset.title, message: preset.message }))}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border border-gray-100 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{preset.icon}</span>
                    <p className="text-xs font-bold text-gray-700 group-hover:text-indigo-700">{preset.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 pl-6">{preset.message}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <AnimatePresence>
            {(form.title || form.message) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5"
              >
                <h2 className="text-xs font-bold text-indigo-600 mb-3 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Live Preview
                </h2>
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-xl p-3 shadow-sm border border-indigo-100"
                >
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">{form.title || 'Notification Title'}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-3">{form.message || 'Your message preview will appear here…'}</p>
                      <p className="text-[10px] text-gray-300 mt-1">Just now</p>
                    </div>
                  </div>
                </motion.div>
                <p className="text-[10px] text-indigo-400 mt-2 text-center">
                  Sending to: {RECIPIENT_OPTS.find(o => o.value === form.recipientType)?.label}
                  {form.city && ` · ${form.city}`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
