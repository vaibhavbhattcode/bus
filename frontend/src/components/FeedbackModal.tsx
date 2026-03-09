import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  providerId?: string;
  routeId?: string;
}

export default function FeedbackModal({ isOpen, onClose, bookingId, providerId, routeId }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/feedback', data),
    onSuccess: () => {
      toast.success('Feedback submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      onClose();
      setRating(0);
      setComment('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }
    mutation.mutate({
      bookingId,
      providerId,
      routeId,
      type: bookingId ? 'BOOKING' : 'PROVIDER',
      rating,
      comment,
      isPublic: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Experience" maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Tell us about your experience..."
            />
          </div>

          <div className="flex justify-end gap-2">
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
              className="btn btn-primary"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
