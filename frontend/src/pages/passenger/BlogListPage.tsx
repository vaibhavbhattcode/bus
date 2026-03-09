import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { BlogPost } from '../../types';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

export default function BlogListPage() {
  const { data: response, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: () => api.get<{ data?: BlogPost[]; meta?: unknown } | BlogPost[]>('/blog'),
  });

  // Backend returns { data: posts, meta } — normalize to array
  const posts = Array.isArray(response) ? response : (response?.data ?? []);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 relative overflow-hidden pb-12">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <SEO 
        title="Travel Blog" 
        description="Explore travel stories, tips, and guides for your next bus journey. Stay updated with the latest travel trends and insights."
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"
      >
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Travel Stories <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">& Tips</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Explore our latest articles, travel guides, and industry insights to make your next journey unforgettable.
          </p>
        </motion.div>

        {!posts || posts.length === 0 ? (
          <motion.div variants={itemVariants} className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm p-12 border border-gray-100 max-w-lg mx-auto">
              <p className="text-gray-500 text-lg">No blog posts found. Check back later!</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Link 
                  to={`/blog/${post.slug}`} 
                  className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg shadow-gray-200/50 overflow-hidden border border-white/20 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10"
                >
                  <div className="relative overflow-hidden h-56 bg-gray-100">
                    {post.coverImage ? (
                      <img 
                        src={post.coverImage} 
                        alt={post.title} 
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                        No Image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {post.tags && post.tags.length > 0 && (
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-primary-600 shadow-sm">
                        {post.tags[0]}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(post.createdAt), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        5 min read
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    
                    <p className="text-gray-600 mb-6 line-clamp-3 text-sm flex-1 leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100/50 mt-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 text-xs font-bold ring-2 ring-white">
                          {post.author.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{post.author}</span>
                      </div>
                      <span className="text-primary-600 group-hover:translate-x-1 transition-transform duration-300">
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
