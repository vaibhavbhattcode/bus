import { Shield, Users, Award, Globe } from 'lucide-react';
import SEO from '../../components/SEO';
import { motion } from 'framer-motion';

export default function AboutPage() {
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

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 relative overflow-hidden font-sans">
      <SEO 
        title="About Us - BusBook" 
        description="Learn about BusBook's mission to redefine intercity bus travel with comfort, affordability, and technology."
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
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20"
      >
        {/* Hero Section */}
        <motion.div 
          variants={itemVariants}
          className="bg-gradient-to-br from-primary-900 to-indigo-900 text-white rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary-900/30"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1570125909232-eb263c188f7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 to-transparent"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <motion.span 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-primary-100 font-medium mb-6"
            >
              Our Mission
            </motion.span>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-tight">
              Redefining <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-primary-200">Bus Travel</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100/90 leading-relaxed max-w-2xl mx-auto">
              We are on a mission to make intercity bus travel comfortable, affordable, and accessible for everyone through technology and innovation.
            </p>
          </div>
        </motion.div>

        {/* Our Story */}
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div variants={itemVariants}>
            <h2 className="text-4xl font-bold mb-8 text-gray-900 tracking-tight">Our Story</h2>
            <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
              <p>
                Founded in 2024, Bus Booking started with a simple idea: booking a bus ticket should be as easy as booking a cab. We noticed the fragmentation in the bus industry and set out to build a platform that connects passengers with top-rated bus operators.
              </p>
              <p>
                Today, we serve thousands of routes across the country, partnering with premium bus operators to ensure safety, punctuality, and comfort. Our technology-driven approach brings real-time inventory, live tracking, and seamless payments to your fingertips.
              </p>
            </div>
            <div className="mt-10">
              <button className="btn btn-primary btn-lg rounded-full px-8 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transform hover:-translate-y-1 transition-all duration-300">
                Join Our Journey
              </button>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2rem] text-center shadow-xl shadow-gray-200/50 border border-gray-100 transform hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 mb-2">10K+</h3>
              <p className="text-gray-600 font-medium">Daily Passengers</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] text-center shadow-xl shadow-gray-200/50 border border-gray-100 transform hover:-translate-y-2 transition-transform duration-300 translate-y-8">
              <h3 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mb-2">500+</h3>
              <p className="text-gray-600 font-medium">Bus Partners</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] text-center shadow-xl shadow-gray-200/50 border border-gray-100 transform hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-2">1M+</h3>
              <p className="text-gray-600 font-medium">Tickets Sold</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] text-center shadow-xl shadow-gray-200/50 border border-gray-100 transform hover:-translate-y-2 transition-transform duration-300 translate-y-8">
              <h3 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">100+</h3>
              <p className="text-gray-600 font-medium">Cities Covered</p>
            </div>
          </motion.div>
        </div>

        {/* Values */}
        <motion.div variants={itemVariants}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 tracking-tight">Why Choose Us?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">We prioritize your comfort and safety above everything else.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-primary-100 to-primary-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Safety First</h3>
              <p className="text-gray-600 leading-relaxed">Verified bus operators and 24/7 support for a safe journey.</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Best Prices</h3>
              <p className="text-gray-600 leading-relaxed">We guarantee the best prices with zero hidden booking fees.</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-green-100 to-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Customer Focus</h3>
              <p className="text-gray-600 leading-relaxed">Dedicated customer service team to assist you at every step.</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Wide Network</h3>
              <p className="text-gray-600 leading-relaxed">Connecting thousands of cities and towns across the country.</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
