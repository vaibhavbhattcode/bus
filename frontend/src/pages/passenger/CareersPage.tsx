import { Briefcase, MapPin, Clock, ArrowRight, TrendingUp, Users, Zap, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';

const POSITIONS = [
  {
    id: 1,
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Bangalore, India',
    type: 'Full-time',
    description: 'We are looking for an experienced React developer to lead our frontend initiatives and build world-class user interfaces.',
    tags: ['React', 'TypeScript', 'Tailwind']
  },
  {
    id: 2,
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote',
    type: 'Full-time',
    description: 'Drive the product vision and strategy for our booking platform, working closely with engineering and design teams.',
    tags: ['Strategy', 'Agile', 'UX']
  },
  {
    id: 3,
    title: 'Customer Success Specialist',
    department: 'Operations',
    location: 'Mumbai, India',
    type: 'Full-time',
    description: 'Be the face of our company for our customers. Handle inquiries and ensure a smooth booking experience for everyone.',
    tags: ['Communication', 'Support', 'CRM']
  },
  {
    id: 4,
    title: 'Backend Developer (Node.js)',
    department: 'Engineering',
    location: 'Bangalore, India',
    type: 'Full-time',
    description: 'Scale our backend infrastructure to handle millions of bookings. Experience with NestJS and Microservices is a plus.',
    tags: ['Node.js', 'NestJS', 'PostgreSQL']
  },
];

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Growth & Learning',
    description: 'Annual learning budget and mentorship programs.'
  },
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive health insurance for you and your family.'
  },
  {
    icon: Clock,
    title: 'Flexible Hours',
    description: 'Work when you are most productive. We value output over hours.'
  },
  {
    icon: Zap,
    title: 'High Performance',
    description: 'Latest MacBook Pro and top-tier software tools.'
  },
  {
    icon: Users,
    title: 'Team Retreats',
    description: 'Quarterly offsites and fun team bonding events.'
  },
  {
    icon: MapPin,
    title: 'Remote Friendly',
    description: 'Work from anywhere or from our beautiful offices.'
  }
];

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

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 relative overflow-hidden pb-12">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <SEO 
        title="Careers" 
        description="Join the BusBook team and help revolutionize the intercity bus travel industry. Explore current job openings."
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center mb-20">
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 bg-primary-100/50 backdrop-blur-md text-primary-700 rounded-full text-sm font-semibold mb-6 border border-primary-200"
          >
            We're Hiring!
          </motion.span>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            Join Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">Mission</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Help us revolutionize intercity bus travel. We're looking for passionate individuals to build the future of mobility together.
          </p>
        </motion.div>

        {/* Culture & Benefits */}
        <div className="grid md:grid-cols-2 gap-12 mb-24 items-center">
          <motion.div variants={itemVariants} className="order-2 md:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Why work with us?</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {BENEFITS.map((benefit, index) => (
                <motion.div 
                  key={index} 
                  whileHover={{ y: -5 }}
                  className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="bg-primary-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-primary-600">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="order-1 md:order-2 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-600/20 to-transparent rounded-[2rem] blur-2xl transform rotate-3"></div>
            <div className="relative grid grid-cols-2 gap-4">
              <motion.img 
                whileHover={{ scale: 1.02 }}
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Team collaboration" 
                className="rounded-2xl shadow-xl w-full h-64 object-cover mb-8"
              />
              <motion.img 
                whileHover={{ scale: 1.02 }}
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Office meeting" 
                className="rounded-2xl shadow-xl w-full h-64 object-cover mt-8"
              />
            </div>
          </motion.div>
        </div>

        {/* Open Positions */}
        <motion.div variants={itemVariants} className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Open Positions</h2>
            <p className="text-gray-600">Come be a part of our growing team</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-gray-200/50 border border-white/20 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {POSITIONS.map((position) => (
                <motion.div 
                  key={position.id} 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.8)' }}
                  className="p-8 transition-colors group cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {position.title}
                        </h3>
                        {position.tags && position.tags.map((tag, i) => (
                          <span key={i} className="hidden sm:inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border border-gray-100">
                          <Briefcase className="h-3.5 w-3.5 text-primary-500" />
                          {position.department}
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border border-gray-100">
                          <MapPin className="h-3.5 w-3.5 text-primary-500" />
                          {position.location}
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full border border-gray-100">
                          <Clock className="h-3.5 w-3.5 text-primary-500" />
                          {position.type}
                        </span>
                      </div>
                      <p className="text-gray-600 max-w-2xl leading-relaxed">{position.description}</p>
                    </div>
                    
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-primary flex items-center gap-2 self-start md:self-center whitespace-nowrap shadow-lg shadow-primary-500/20"
                    >
                      Apply Now <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          variants={itemVariants}
          className="relative rounded-[2rem] overflow-hidden bg-primary-600 text-white p-12 text-center mb-12 shadow-2xl shadow-primary-500/30"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Don't see a perfect fit?</h2>
            <p className="text-primary-100 mb-8 text-lg">
              We are always looking for talented individuals. Send us your resume and we will keep you in mind for future openings.
            </p>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 1)' }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-white text-primary-600 font-bold rounded-xl shadow-lg transition-all"
            >
              Send Open Application
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
