import { Calendar, User, Clock, ArrowLeft, Share2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { BlogPost } from '../../types';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

export default function BlogPostPage() {
  const { slug } = useParams();
  
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => api.get<BlogPost>(`/blog/slug/${slug}`),
    enabled: !!slug,
  });

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

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <SEO title="Post Not Found" description="The blog post you are looking for does not exist." />
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Post not found</h2>
          <p className="text-gray-600 mb-8">The article you are looking for might have been removed or is temporarily unavailable.</p>
          <Link to="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30">
            <ArrowLeft className="h-5 w-5" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 relative overflow-hidden pb-12">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob animation-delay-2000"></div>
      </div>

      <SEO
        title={post.title}
        description={post.excerpt}
        ogImage={post.coverImage}
        ogType="article"
        articleAuthor={post.author}
        articlePublishedTime={post.createdAt}
        articleModifiedTime={post.updatedAt ?? post.createdAt}
        articleTags={post.tags}
        canonical={`https://busbook.com/blog/${post.slug ?? post.id}`}
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <Link to="/blog" className="inline-flex items-center text-gray-500 hover:text-primary-600 transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </Link>
        </motion.div>

        <motion.article 
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white/20 overflow-hidden"
        >
          {post.coverImage && (
            <div className="h-[400px] md:h-[500px] w-full relative group">
              <img 
                src={post.coverImage} 
                alt={post.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end">
                <div className="p-8 md:p-16 text-white w-full">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {post.tags && post.tags.length > 0 && (
                      <span className="inline-block px-4 py-1.5 bg-primary-500/90 backdrop-blur-md rounded-full text-sm font-bold mb-6 shadow-lg shadow-black/20">
                        {post.tags[0]}
                      </span>
                    )}
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight text-shadow-lg">
                      {post.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-white/90 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full">
                          <User className="h-4 w-4" />
                        </div>
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full">
                          <Clock className="h-4 w-4" />
                        </div>
                        <span>5 min read</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
          
          {!post.coverImage && (
            <div className="p-8 md:p-16 pb-0">
              {post.tags && post.tags.length > 0 && (
                <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-bold mb-6">
                  {post.tags[0]}
                </span>
              )}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight text-gray-900">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-gray-600 font-medium">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary-500" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary-500" />
                  <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-8 md:p-16 grid md:grid-cols-12 gap-12">
            <div className="md:col-span-8">
              <div className="prose prose-lg prose-indigo max-w-none text-gray-600 whitespace-pre-wrap leading-loose">
                {post.content}
              </div>
            </div>
            
            <div className="md:col-span-4 space-y-8">
              <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-6 text-lg">About the Author</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-gradient-to-br from-primary-100 to-primary-200 h-16 w-16 rounded-2xl flex items-center justify-center text-primary-700 font-bold text-2xl shadow-inner">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{post.author}</div>
                    <div className="text-sm text-primary-600 font-medium">Content Creator</div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 my-6"></div>
                
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Share this post</h3>
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-white rounded-xl text-gray-600 hover:text-primary-600 shadow-sm hover:shadow-md transition-all border border-gray-100"
                  >
                    <Share2 className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.article>
      </motion.div>
    </div>
  );
}
