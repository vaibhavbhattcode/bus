import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { 
  Plus, Bus, Edit, Trash2, XCircle, Layout, Armchair, 
  Settings, Download, Shield, Fuel,
  Tv, Wind, Wifi, Coffee, Battery, Zap, Search, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import CustomSelect from '../../components/CustomSelect';
import CustomCheckbox from '../../components/CustomCheckbox';
import Modal from '../../components/Modal';
import { exportToCSV } from '../../utils/exportUtils';
import { format } from 'date-fns';
import SEO from '../../components/SEO';

export default function ProviderVehicles() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    type: 'BUS',
    name: '',
    registrationNumber: '',
    totalSeats: '',
    seatLayout: '2+2',
    amenities: '',
    isActive: true,
  });

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => api.get('/providers/profile'),
    retry: false,
    staleTime: Infinity,
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['provider-vehicles'],
    queryFn: async () => {
      const res = await api.get<any>('/providers/vehicles');
      return res?.data || (Array.isArray(res) ? res : []);
    },
    retry: false,
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/providers/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-vehicles'] });
      toast.success('Vehicle added successfully');
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/providers/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-vehicles'] });
      toast.success('Vehicle updated successfully');
      setShowModal(false);
      setEditingVehicle(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/providers/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-vehicles'] });
      toast.success('Vehicle deleted successfully');
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'BUS',
      name: '',
      registrationNumber: '',
      totalSeats: '',
      seatLayout: '2+2',
      amenities: '',
      isActive: true,
    });
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      type: vehicle.type,
      name: vehicle.name,
      registrationNumber: vehicle.registrationNumber,
      totalSeats: vehicle.totalSeats.toString(),
      seatLayout: vehicle.seatLayout || '2+2',
      amenities: vehicle.amenities?.join(', ') || '',
      isActive: vehicle.isActive,
    });
    setShowModal(true);
  };

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.type) newErrors.type = 'Vehicle type is required';
    if (!formData.name.trim()) newErrors.name = 'Vehicle name is required';
    
    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required';
    } else if (!/^[A-Z0-9\s-]+$/i.test(formData.registrationNumber)) {
      newErrors.registrationNumber = 'Invalid registration number format';
    }

    if (!formData.totalSeats) {
      newErrors.totalSeats = 'Total seats is required';
    } else if (parseInt(formData.totalSeats) <= 0) {
      newErrors.totalSeats = 'Total seats must be greater than 0';
    } else if (parseInt(formData.totalSeats) > 100) {
      newErrors.totalSeats = 'Total seats cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    const data = {
      ...formData,
      totalSeats: parseInt(formData.totalSeats),
      amenities: formData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleExport = () => {
    if (!vehicles || vehicles.length === 0) {
      toast.error('No vehicles to export');
      return;
    }

    const data = vehicles.map((v: any) => ({
      Name: v.name,
      Type: v.type,
      Registration: v.registrationNumber,
      Seats: v.totalSeats,
      Layout: v.seatLayout,
      Status: v.isActive ? 'Active' : 'Inactive',
      Amenities: v.amenities?.join(', ') || 'None',
      Created: format(new Date(v.createdAt), 'yyyy-MM-dd'),
    }));

    exportToCSV(data, 'my-vehicles', [
      { header: 'Name', key: 'Name' },
      { header: 'Type', key: 'Type' },
      { header: 'Registration', key: 'Registration' },
      { header: 'Seats', key: 'Seats' },
      { header: 'Layout', key: 'Layout' },
      { header: 'Status', key: 'Status' },
      { header: 'Amenities', key: 'Amenities' },
      { header: 'Created', key: 'Created' },
    ]);
  };

  const amenityIcons: Record<string, any> = {
    ac: Wind,
    wifi: Wifi,
    water: Coffee,
    bottle: Coffee,
    usb: Battery,
    tv: Tv,
    led: Tv,
    charging: Battery,
    sheet: Shield,
    blanket: Shield,
  };

  const getAmenityIcon = (name: string) => {
    const key = name.toLowerCase().trim();
    for (const k in amenityIcons) {
      if (key.includes(k)) return amenityIcons[k];
    }
    return Settings;
  };

  const filteredVehicles = vehicles?.filter((v: any) => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile === null) {
    return <ProviderRegistrationPrompt />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-10"
    >
      <SEO
        title="Fleet Management | BusBook"
        description="High-performance fleet inventory and resource management."
        noIndex={true}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tight">Fleet Inventory</h2>
           <p className="text-gray-500 font-medium">Manage and monitor your transport assets</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingVehicle(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {vehicles && vehicles.length > 0 && (
         <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
               </div>
               <input 
                  type="text" 
                  placeholder="Search by name or registration..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2">
               <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-100 flex items-center gap-2">
                  <Filter className="h-3 w-3" /> Filter
               </button>
            </div>
         </div>
      )}

      {filteredVehicles && filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle: any) => (
            <motion.div
              variants={itemVariants}
              key={vehicle.id}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 relative"
            >
              {/* Header Gradient Strip */}
              <div className={`h-2 w-full ${vehicle.isActive ? 'bg-gradient-to-r from-primary-500 to-indigo-500' : 'bg-gray-300'}`} />
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-3 duration-500 ${vehicle.isActive ? 'bg-gradient-to-tr from-primary-600 to-indigo-600' : 'bg-gray-400'}`}>
                      <Bus className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-gray-900 group-hover:text-primary-700 transition-colors uppercase tracking-tight">{vehicle.name}</h3>
                      <p className="text-xs font-bold text-gray-400 font-mono tracking-widest">{vehicle.registrationNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {vehicle.isActive ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1">
                        <Zap className="h-3 w-3 fill-current" /> Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-gray-200 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Idle
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                   <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                      <Armchair className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Seats</p>
                      <p className="text-sm font-black text-gray-900 mt-1">{vehicle.totalSeats}</p>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                      <Layout className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Layout</p>
                      <p className="text-sm font-black text-gray-900 mt-1">{vehicle.seatLayout || '2+2'}</p>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                      <Fuel className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Type</p>
                      <p className="text-sm font-black text-gray-900 mt-1">{vehicle.type}</p>
                   </div>
                </div>
                
                {vehicle.amenities && vehicle.amenities.length > 0 && (
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                      {vehicle.amenities.slice(0, 4).map((amenity: string, idx: number) => {
                        const Icon = getAmenityIcon(amenity);
                        return (
                          <div
                            key={idx}
                            className="px-2.5 py-1 bg-white border border-gray-100 text-gray-600 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                            title={amenity}
                          >
                            <Icon className="h-3 w-3 text-primary-500" />
                            {amenity}
                          </div>
                        );
                      })}
                      {vehicle.amenities.length > 4 && (
                        <div className="px-2.5 py-1 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-bold">
                          +{vehicle.amenities.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="flex-grow flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg active:scale-95"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Fleet Item
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this vehicle from inventory?')) {
                        deleteMutation.mutate(vehicle.id);
                      }
                    }}
                    className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-100 active:scale-95"
                    title="Remove Vehicle"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bus}
          title={searchTerm ? "No matching assets" : "Empty Hangar"}
          description={searchTerm ? `No vehicles match "${searchTerm}" in your inventory.` : "You haven't added any vehicles to your fleet yet."}
          action={{
            label: 'Add First Vehicle',
            onClick: () => setShowModal(true),
          }}
        />
      )}

      {/* Modern High-End Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
           setShowModal(false);
           resetForm();
           setEditingVehicle(null);
           setErrors({});
        }}
        title={
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
               {editingVehicle ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
               <p className="text-xl font-black text-gray-900 leading-none">{editingVehicle ? 'Update Fleet Item' : 'New Fleet Item'}</p>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">Vehicle Specification Protocol</p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Vehicle Category <span className="text-red-500">*</span></label>
              <CustomSelect
                value={formData.type}
                onChange={(val) => {
                  setFormData({ ...formData, type: val });
                  if (errors.type) setErrors({...errors, type: ''});
                }}
                options={[
                  { value: 'BUS', label: 'Premium Bus' },
                  { value: 'TEMPO', label: 'Tempo Carrier' },
                  { value: 'TRAVELLER', label: 'Urban Traveller' },
                ]}
                placeholder="Select Type"
                icon={<Bus className="h-5 w-5" />}
                className={errors.type ? 'border-red-500 ring-red-500' : 'rounded-2xl border-gray-200'}
              />
              {errors.type && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.type}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Asset Display Name <span className="text-red-500">*</span></label>
              <div className="relative">
                 <input
                  type="text"
                  className={`input w-full pl-4 pr-4 py-3 rounded-2xl bg-gray-50 border-gray-200 font-bold focus:bg-white transition-all ${errors.name ? 'border-red-500' : ''}`}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({...errors, name: ''});
                  }}
                  placeholder="e.g. Skyline Express AC"
                />
              </div>
              {errors.name && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.name}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Registration ID <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={`input w-full pl-4 pr-4 py-3 rounded-2xl bg-gray-50 border-gray-200 font-mono font-bold tracking-widest focus:bg-white transition-all ${errors.registrationNumber ? 'border-red-500' : ''}`}
                value={formData.registrationNumber}
                onChange={(e) => {
                  setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() });
                  if (errors.registrationNumber) setErrors({...errors, registrationNumber: ''});
                }}
                placeholder="KA-01-AB-1234"
              />
              {errors.registrationNumber && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.registrationNumber}</p>}
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Seat Capacity <span className="text-red-500">*</span></label>
              <div className="relative">
                 <Armchair className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <input
                  type="number"
                  className={`input w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 border-gray-200 font-bold focus:bg-white transition-all ${errors.totalSeats ? 'border-red-500' : ''}`}
                  value={formData.totalSeats}
                  onChange={(e) => {
                    setFormData({ ...formData, totalSeats: e.target.value });
                    if (errors.totalSeats) setErrors({...errors, totalSeats: ''});
                  }}
                  min="1"
                  max="100"
                  placeholder="40"
                />
              </div>
              {errors.totalSeats && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-tighter">{errors.totalSeats}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Seating Configuration</label>
               <CustomSelect
                value={formData.seatLayout}
                onChange={(val) => setFormData({ ...formData, seatLayout: val })}
                options={[
                  { value: '2+2', label: '2+2 Executive' },
                  { value: '2+1', label: '2+1 VIP Semi-Sleeper' },
                  { value: '1+1', label: '1+1 Premium Sleeper' },
                  { value: '2+3', label: '2+3 High Capacity' },
                  { value: 'sleeper', label: 'Full Sleeper Berths' },
                ]}
                icon={<Layout className="h-5 w-5" />}
                placeholder="Select Layout"
                className="rounded-2xl border-gray-200"
              />
            </div>
            <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">On-Board Services</label>
               <div className="relative">
                  <Settings className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    className="input w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 border-gray-200 font-bold focus:bg-white transition-all"
                    value={formData.amenities}
                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                    placeholder="WiFi, AC, Charging, etc."
                  />
               </div>
               <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase">Comma-separated values</p>
            </div>
          </div>

          <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-primary-600 shadow-sm">
                   <Zap className="h-4 w-4" />
                </div>
                <div>
                   <p className="text-xs font-black text-primary-900 leading-none">Operational Readiness</p>
                   <p className="text-[10px] font-bold text-primary-600 mt-1">Make this vehicle available for deployments</p>
                </div>
             </div>
             <CustomCheckbox
                label=""
                checked={formData.isActive}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-50">
            <button 
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingVehicle(null);
                resetForm();
                setErrors({});
              }}
              className="flex-1 py-3 text-sm font-black text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary-200 hover:-translate-y-0.5 transition-all active:translate-y-0">
              {editingVehicle ? 'Protocol Update' : 'Initialize Asset'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}