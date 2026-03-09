import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Plus, Bus, Edit, Trash2, CheckCircle, XCircle, Layout, Armchair, Settings, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import CustomSelect from '../../components/CustomSelect';
import CustomCheckbox from '../../components/CustomCheckbox';
import Modal from '../../components/Modal';

import { exportToCSV } from '../../utils/exportUtils';
import { format } from 'date-fns';

export default function ProviderVehicles() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
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
    queryFn: () => api.get<any[]>('/providers/vehicles'),
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

  // Show registration prompt if profile doesn't exist
  if (profile === null) {
    return <ProviderRegistrationPrompt />;
  }

  if (isLoading) {
    return (
      <div className="card text-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Vehicles</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="h-5 w-5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setEditingVehicle(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2 rounded-xl shadow-sm hover:shadow-primary-100"
          >
            <Plus className="h-5 w-5" />
            Add Vehicle
          </button>
        </div>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle: any) => (
            <div
              key={vehicle.id}
              className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${vehicle.isActive ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Bus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{vehicle.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{vehicle.registrationNumber}</p>
                  </div>
                </div>
                {vehicle.isActive ? (
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-lg border border-green-100 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg border border-gray-200 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Inactive
                  </span>
                )}
              </div>

              <div className="space-y-3 text-sm border-t border-gray-50 pt-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Bus className="h-4 w-4" /> Type
                  </span>
                  <span className="font-semibold text-gray-900">{vehicle.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Armchair className="h-4 w-4" /> Seats
                  </span>
                  <span className="font-semibold text-gray-900">{vehicle.totalSeats}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Layout className="h-4 w-4" /> Layout
                  </span>
                  <span className="font-semibold text-gray-900">{vehicle.seatLayout || '2+2'}</span>
                </div>
              </div>
              
              {vehicle.amenities && vehicle.amenities.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Amenities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {vehicle.amenities.map((amenity: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-md text-xs font-medium border border-gray-100"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(vehicle)}
                  className="btn btn-secondary flex-1 text-sm flex items-center justify-center gap-2 py-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this vehicle?')) {
                      deleteMutation.mutate(vehicle.id);
                    }
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="Delete Vehicle"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bus}
          title="No vehicles found"
          description="Add your first vehicle to start creating routes"
          action={{
            label: 'Add Vehicle',
            onClick: () => setShowModal(true),
          }}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          <div className="flex items-center gap-2">
            {editingVehicle ? <Edit className="h-5 w-5 text-primary-600" /> : <Plus className="h-5 w-5 text-primary-600" />}
            {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Vehicle Type <span className="text-red-500">*</span></label>
            <CustomSelect
              value={formData.type}
              onChange={(val) => {
                setFormData({ ...formData, type: val });
                if (errors.type) setErrors({...errors, type: ''});
              }}
              options={[
                { value: 'BUS', label: 'Bus' },
                { value: 'TEMPO', label: 'Tempo' },
                { value: 'TRAVELLER', label: 'Traveller' },
              ]}
              placeholder="Select Type"
              icon={<Bus className="h-5 w-5" />}
              className={errors.type ? 'border-red-500 ring-red-500' : ''}
            />
            {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Vehicle Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`input w-full ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({...errors, name: ''});
              }}
              placeholder="e.g. Volvo AC Sleeper"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Registration Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={`input w-full ${errors.registrationNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
                value={formData.registrationNumber}
                onChange={(e) => {
                  setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() });
                  if (errors.registrationNumber) setErrors({...errors, registrationNumber: ''});
                }}
                placeholder="e.g. KA-01-AB-1234"
              />
              {errors.registrationNumber && <p className="mt-1 text-sm text-red-500">{errors.registrationNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Total Seats <span className="text-red-500">*</span></label>
              <input
                type="number"
                className={`input w-full ${errors.totalSeats ? 'border-red-500 focus:ring-red-500' : ''}`}
                value={formData.totalSeats}
                onChange={(e) => {
                  setFormData({ ...formData, totalSeats: e.target.value });
                  if (errors.totalSeats) setErrors({...errors, totalSeats: ''});
                }}
                min="1"
                max="100"
                placeholder="e.g. 40"
              />
              {errors.totalSeats && <p className="mt-1 text-sm text-red-500">{errors.totalSeats}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Seat Layout</label>
            <CustomSelect
              value={formData.seatLayout}
              onChange={(val) => setFormData({ ...formData, seatLayout: val })}
              options={[
                { value: '2+2', label: '2+2 (2 left, aisle, 2 right) - Standard' },
                { value: '2+1', label: '2+1 (2 left, aisle, 1 right) - Luxury' },
                { value: '1+1', label: '1+1 (1 left, aisle, 1 right) - Sleeper' },
                { value: '2+3', label: '2+3 (2 left, aisle, 3 right) - City' },
                { value: 'sleeper', label: 'Sleeper (Berths)' },
              ]}
              icon={<Layout className="h-5 w-5" />}
              placeholder="Select Layout"
            />
            <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Select the seating arrangement for this vehicle
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Amenities</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Settings className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="input pl-10 w-full"
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="AC, WiFi, USB Charging, Sheets, Water Bottle"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">Separate amenities with commas</p>
          </div>

          <div className="pt-2">
            <CustomCheckbox
              label="Active (vehicle is available for routes)"
              checked={formData.isActive}
              onChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingVehicle(null);
                resetForm();
                setErrors({});
              }}
              className="btn btn-secondary flex-1 py-2.5 font-semibold"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1 py-2.5 font-semibold shadow-lg shadow-primary-200">
              {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}