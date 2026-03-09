import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  providerId?: string;
}

export default function ReportModal({ isOpen, onClose, bookingId, providerId }: ReportModalProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('booking');

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/support', data),
    onSuccess: () => {
      toast.success('Report submitted successfully. Our team will look into it.');
      onClose();
      setSubject('');
      setDescription('');
      setCategory('booking');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit report');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) {
      toast.error('Please fill in all required fields');
      return;
    }
    mutation.mutate({
      subject,
      message: `Booking ID: ${bookingId || 'N/A'}\nProvider ID: ${providerId || 'N/A'}\n\n${description}`,
      category,
      priority: 'MEDIUM',
    });
  };

  const title = (
    <div className="flex items-center gap-3">
      <div className="bg-red-100 p-2 rounded-full">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="text-xl font-bold">Report an Issue</h2>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="booking">Booking Issue</option>
              <option value="payment">Payment Problem</option>
              <option value="provider">Provider Behavior</option>
              <option value="vehicle">Vehicle Condition</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Brief summary of the issue"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Please describe what happened in detail..."
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
