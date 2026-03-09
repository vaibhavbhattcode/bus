import { useState } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    bookingConfirmation: { email: true, sms: true, push: true },
    tripReminders: { email: true, sms: true, push: true },
    delaysAndUpdates: { email: true, sms: true, push: true },
    promotions: { email: true, sms: false, push: false },
    securityAlerts: { email: true, sms: true, push: true },
  });

  const handleToggle = (category: keyof typeof settings, type: 'email' | 'sms' | 'push') => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: !prev[category][type]
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Notification preferences saved');
    setLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 relative overflow-hidden font-sans">
      <SEO 
        title="Notification Settings - BusBook"
        description="Manage your notification preferences for bookings, trip reminders, and updates."
      />

      {/* Abstract Background Shapes */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[80px] opacity-40 translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[80px] opacity-40 -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-6 mb-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-100 to-blue-50 flex items-center justify-center text-primary-600 shadow-lg shadow-primary-500/20 ring-4 ring-white">
            <Bell className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notifications</h1>
            <p className="text-lg text-gray-500 mt-1">Manage how you want to be notified</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50/80 border-b border-gray-200/60 text-sm font-bold text-gray-600 uppercase tracking-wider">
            <div className="col-span-1 pl-2">Notification Type</div>
            <div className="flex justify-center items-center gap-2 text-primary-600">
              <Mail className="h-4 w-4" /> Email
            </div>
            <div className="flex justify-center items-center gap-2 text-primary-600">
              <MessageSquare className="h-4 w-4" /> SMS
            </div>
            <div className="flex justify-center items-center gap-2 text-primary-600">
              <Smartphone className="h-4 w-4" /> Push
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {[
              { id: 'bookingConfirmation', label: 'Booking Confirmation', desc: 'Tickets and receipts' },
              { id: 'tripReminders', label: 'Trip Reminders', desc: 'Upcoming travel alerts' },
              { id: 'delaysAndUpdates', label: 'Delays & Updates', desc: 'Real-time schedule changes' },
              { id: 'promotions', label: 'Promotions', desc: 'Deals and special offers' },
              { id: 'securityAlerts', label: 'Security Alerts', desc: 'Account activity and security' },
            ].map((item) => (
              <div key={item.id} className="grid grid-cols-4 gap-4 p-6 items-center hover:bg-blue-50/30 transition-colors group">
                <div className="col-span-1 pl-2">
                  <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
                {(['email', 'sms', 'push'] as const).map((type) => (
                  <div key={type} className="flex justify-center">
                    <button
                      onClick={() => handleToggle(item.id as keyof typeof settings, type)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-500/20 ${
                        settings[item.id as keyof typeof settings][type] 
                          ? 'bg-gradient-to-r from-primary-600 to-indigo-600 shadow-md shadow-primary-500/30' 
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                          settings[item.id as keyof typeof settings][type] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="p-6 bg-gray-50/80 border-t border-gray-200/60 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn btn-primary btn-lg flex items-center gap-2 px-8 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Save Preferences
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
