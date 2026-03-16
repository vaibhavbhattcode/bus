import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Star, User, Calendar, MessageSquare, Quote, Heart, ShieldCheck, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

export default function ProviderReviews() {
  const { data: reviews, isLoading, isError, error } = useQuery({
    queryKey: ['provider-reviews'],
    queryFn: async () => {
      const data = await api.get<any[]>('/feedback/provider/my-reviews');
      return data;
    },
    staleTime: 60000,
  });

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

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <LoadingSpinner />
      <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">Aggregating Feedback...</p>
    </div>
  );

  if (isError) {
    return (
      <div className="p-8 bg-rose-50 text-rose-700 rounded-[32px] border border-rose-100 flex items-center gap-6">
        <div className="bg-rose-100 h-16 w-16 flex items-center justify-center rounded-2xl">
           <Zap className="h-8 w-8 text-rose-600" />
        </div>
        <div>
           <h3 className="text-xl font-black uppercase tracking-tight">Audit Failure</h3>
           <p className="font-medium opacity-80">{(error as any)?.response?.data?.message || (error as any).message || 'Access denied to feedback protocols'}</p>
        </div>
      </div>
    );
  }

  const averageRating = reviews?.length
    ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length
    : 0;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-10"
    >
      <SEO
        title="Reputation Audit | BusBook"
        description="Monitor passenger sentiment and service quality metrics."
        noIndex={true}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reputation Matrix</h1>
           <p className="text-gray-500 font-medium">Analyze passenger sentiment and qualitative performance</p>
        </div>
        
        <div className="bg-white p-2 rounded-[28px] shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="pl-6 pr-2">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">AGGREGATE SCORE</p>
             <p className="text-xs text-gray-400 font-bold">{reviews?.length || 0} Critical Reviews</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-900 px-6 py-4 rounded-[22px] text-white shadow-xl shadow-gray-200">
            <span className="text-3xl font-black tracking-tighter leading-none">{averageRating.toFixed(1)}</span>
            <div className="flex flex-col">
               <div className="flex text-yellow-400">
                  <Star className="h-4 w-4 fill-current" />
               </div>
               <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Sentinel score</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {!reviews || reviews.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-gray-50 mb-6 text-gray-200">
              <Star className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">No Sentiment Data</h3>
            <p className="text-gray-400 font-medium max-w-sm mt-2">Operational manifests show no post-trip feedback in the current cycles.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {reviews.map((review: any) => (
              <motion.div 
                layout
                variants={itemVariants}
                key={review.id} 
                className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-[22px] bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors duration-500">
                      <User className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        {review.user?.name || 'Anonymous Sentinel'}
                        {review.rating >= 4 && <ShieldCheck className="h-5 w-5 text-emerald-500" />}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(review.createdAt), 'MMMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                     {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-100'}`} 
                        />
                     ))}
                     <span className="ml-2 text-sm font-black text-gray-900 p-2 bg-gray-100 rounded-xl">{review.rating}.0</span>
                  </div>
                </div>
                
                <div className="relative mb-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50 italic">
                  <Quote className="absolute -top-3 -left-3 h-8 w-8 text-primary-200/50" />
                  <p className="font-black text-gray-900 mb-2 uppercase tracking-widest text-[10px] opacity-30">{review.subject}</p>
                  <p className="text-gray-700 text-lg font-medium leading-relaxed">
                    "{review.message}"
                  </p>
                </div>

                {review.adminReply && (
                   <div className="mt-6 bg-gray-900 p-6 rounded-2xl text-white shadow-xl shadow-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-primary-400">
                            <MessageSquare className="h-3 w-3" />
                         </div>
                         <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Official Counter-Response</p>
                      </div>
                      <p className="text-sm font-medium opacity-90">{review.adminReply}</p>
                   </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full">
                         <Heart className="h-3 w-3 fill-current" /> Validated Sentiment
                      </div>
                   </div>
                   <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary-600 transition-colors">
                      Internal Manifest Audit
                   </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}