import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { User, Mail, Phone, Shield, Camera, Save, Lock, Smartphone, ShieldCheck, Armchair } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Fetch latest profile data including stats
  const { data: profileData, refetch, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.get<any>('/users/profile'),
    initialData: user,
    retry: 1,
  });

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const { data: seatPrefsData, refetch: refetchSeatPrefs } = useQuery({
    queryKey: ['seat-preferences'],
    queryFn: () => api.get<any>('/seat-preferences'),
    retry: 1,
  });

  const [seatPrefs, setSeatPrefs] = useState({
    preferredSide: '',
    preferredRow: '',
    avoidLastRow: false,
  });

  // Update form data when profile data loads
  useEffect(() => {
    if (profileData) {
      setFormData({
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (seatPrefsData) {
      setSeatPrefs({
        preferredSide: seatPrefsData.preferredSide || '',
        preferredRow: seatPrefsData.preferredRow || '',
        avoidLastRow: seatPrefsData.avoidLastRow || false,
      });
    }
  }, [seatPrefsData]);

  const memberSinceDate = profileData?.createdAt || profileData?.memberSince;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedUser = await api.patch<any>('/users/profile', formData);
      await api.put('/seat-preferences', seatPrefs);

      // Update local store with updated user data (access token unchanged)
      const accessToken = useAuthStore.getState().accessToken ?? '';
      setAuth(updatedUser, accessToken);

      refetch(); // Refresh profile data
      refetchSeatPrefs(); // Refresh seat prefs
      toast.success('Profile and preferences updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 relative overflow-hidden font-sans">
      <SEO
        title={`${user?.name || 'Profile'} - My Account`}
        description="Manage your profile, security settings, and personal information."
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
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left Column: Profile Card */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary-500 to-indigo-600"></div>

              <div className="relative z-10">
                <div className="relative inline-block mb-4">
                  <div className="h-32 w-32 rounded-full bg-white p-1 shadow-lg mx-auto">
                    <div className="h-full w-full rounded-full bg-primary-50 flex items-center justify-center text-5xl font-bold text-primary-600 overflow-hidden">
                      {profileData?.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <button className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-primary-600 hover:scale-110 transition-all">
                    <Camera className="h-5 w-5" />
                  </button>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-1">{profileData?.name}</h1>
                <p className="text-gray-500 text-sm mb-4">{profileData?.email}</p>

                {profileData?.isVerified && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
                    <ShieldCheck className="h-4 w-4" />
                    Verified Passenger
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-gray-100 space-y-4 text-left">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Member Since</span>
                    <span className="font-medium text-gray-900">
                      {memberSinceDate ? format(new Date(memberSinceDate), 'MMM yyyy') : (isProfileLoading ? 'Loading...' : 'N/A')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Trips</span>
                    <span className="font-medium text-gray-900">{profileData?.totalTrips || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Edit Profile & Security */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">

            {/* Edit Profile Form */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-primary-50 rounded-xl text-primary-600">
                  <User className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">Phone Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                        placeholder="Your phone number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                        placeholder="Your email address"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn bg-primary-600 text-white hover:bg-primary-700 px-8 py-3 rounded-xl shadow-lg shadow-primary-500/30 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Seat Preferences Form */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <Armchair className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Seat Preferences</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Preferred Side</label>
                  <select
                    value={seatPrefs.preferredSide}
                    onChange={(e) => setSeatPrefs({ ...seatPrefs, preferredSide: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-700"
                  >
                    <option value="">No Preference</option>
                    <option value="window">Window</option>
                    <option value="aisle">Aisle</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Preferred Row</label>
                  <select
                    value={seatPrefs.preferredRow}
                    onChange={(e) => setSeatPrefs({ ...seatPrefs, preferredRow: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-700"
                  >
                    <option value="">No Preference</option>
                    <option value="front">Front Rows</option>
                    <option value="middle">Middle Rows</option>
                    <option value="back">Back Rows</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="avoidLastRow"
                  type="checkbox"
                  checked={seatPrefs.avoidLastRow}
                  onChange={(e) => setSeatPrefs({ ...seatPrefs, avoidLastRow: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="avoidLastRow" className="ml-2 text-sm font-medium text-gray-700">
                  Avoid Last Row (Bumpy ride)
                </label>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  Save Options
                </button>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Lock className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Password</p>
                      <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <button className="text-sm font-semibold text-primary-600 hover:text-primary-700 px-4 py-2 hover:bg-white rounded-lg transition-all">
                    Change
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Smartphone className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button className="text-sm font-semibold text-primary-600 hover:text-primary-700 px-4 py-2 hover:bg-white rounded-lg transition-all">
                    Enable
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
