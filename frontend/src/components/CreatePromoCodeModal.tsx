import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import Modal from './Modal';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';

interface CreatePromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePromoCodeModal({ isOpen, onClose }: CreatePromoCodeModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: '',
    minAmount: '',
    maxUses: '',
    validFrom: new Date(),
    validUntil: null as Date | null,
    status: 'ACTIVE',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/promo-codes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      toast.success('Promo code created successfully');
      onClose();
      setFormData({
        code: '',
        description: '',
        type: 'PERCENTAGE',
        value: '',
        minAmount: '',
        maxUses: '',
        validFrom: new Date(),
        validUntil: null,
        status: 'ACTIVE',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create promo code');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data
    const payload = {
      ...formData,
      value: Number(formData.value),
      minAmount: formData.minAmount ? Number(formData.minAmount) : undefined,
      maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
      validFrom: formData.validFrom.toISOString(),
      validUntil: formData.validUntil ? formData.validUntil.toISOString() : undefined,
    };

    createMutation.mutate(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Promo Code" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
              placeholder="e.g. SUMMER50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Summer Sale Discount"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
              <CustomSelect
                value={formData.type}
                onChange={(v) => setFormData({ ...formData, type: v })}
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage (%)' },
                  { value: 'FIXED_AMOUNT', label: 'Fixed Amount (₹)' },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="number"
                required
                min="0"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={formData.type === 'PERCENTAGE' ? '10' : '100'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Booking Amount</label>
              <input
                type="number"
                min="0"
                value={formData.minAmount}
                onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
              <input
                type="number"
                min="1"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valid From</label>
              <CustomDatePicker
                selected={formData.validFrom}
                onChange={(d) => setFormData({ ...formData, validFrom: d || new Date() })}
                placeholder="Start Date"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valid Until</label>
              <CustomDatePicker
                selected={formData.validUntil}
                onChange={(d) => setFormData({ ...formData, validUntil: d })}
                placeholder="Expiry Date"
                className="w-full"
                minDate={formData.validFrom}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Promo Code'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
