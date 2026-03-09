import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Star, User, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ProviderReviews() {
  const { data: reviews, isLoading, isError, error } = useQuery({
    queryKey: ['provider-reviews'],
    queryFn: async () => {
      const data = await api.get<any[]>('/feedback/provider/my-reviews');
      return data;
    },
    staleTime: 60000, // 1 minute
  });

  if (isLoading) return (
    <div className="card text-center py-12">
      <LoadingSpinner />
    </div>
  );

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
        <div className="bg-red-100 p-2 rounded-full">
           <MessageSquare className="h-5 w-5 text-red-600" />
        </div>
        <div>
           <h3 className="font-bold">Error loading reviews</h3>
           <p className="text-sm">{(error as any)?.response?.data?.message || (error as any).message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const averageRating = reviews?.length
    ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
           <p className="text-gray-500 text-sm mt-1">Feedback from your passengers</p>
        </div>
        
        <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="text-right">
             <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Average Rating</p>
             <p className="text-xs text-gray-400">{reviews?.length || 0} reviews</p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100">
            <span className="text-2xl font-bold text-yellow-700">{averageRating.toFixed(1)}</span>
            <Star className="h-6 w-6 text-yellow-400 fill-current" />
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {!reviews || reviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
              <Star className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-500 max-w-sm">Reviews from your passengers will appear here once they complete their trips.</p>
          </div>
        ) : (
          reviews.map((review: any) => (
            <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-full border border-blue-100">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {review.user?.name || 'Anonymous Passenger'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(review.createdAt), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="font-bold text-yellow-700">{review.rating}</span>
                </div>
              </div>
              
              <div className="mb-4 pl-4 border-l-4 border-gray-200 bg-gray-50/50 py-2 pr-2 rounded-r-lg">
                <p className="font-bold text-gray-900 mb-1">{review.subject}</p>
                <p className="text-gray-700 leading-relaxed">
                  "{review.message}"
                </p>
              </div>

              {review.adminReply && (
                 <div className="mt-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                       <MessageSquare className="h-4 w-4 text-indigo-600" />
                       <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Admin Reply</p>
                    </div>
                    <p className="text-sm text-gray-700">{review.adminReply}</p>
                 </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}