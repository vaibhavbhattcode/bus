import { FileCheck, AlertCircle, HelpCircle, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';

export default function TermsPage() {
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
    <div className="min-h-screen bg-gray-50/50 relative overflow-hidden pb-12">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <SEO 
        title="Terms of Service" 
        description="Read our terms of service to understand the rules and regulations for using BusBook platform and services."
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"
      >
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">Service</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Please read these terms carefully before using our services.
          </p>
          <p className="text-sm text-primary-600 font-medium mt-4 bg-primary-50 inline-block px-4 py-1.5 rounded-full border border-primary-100">
            Last updated: January 2026
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white/20 overflow-hidden"
        >
          <div className="p-8 md:p-12 space-y-12">
            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-primary-50 p-3 rounded-2xl group-hover:bg-primary-100 transition-colors duration-300">
                  <FileCheck className="h-8 w-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
              </div>
              <div className="prose text-gray-600 ml-0 md:ml-16">
                <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-6">
                  <p className="leading-relaxed">
                    By accessing or using the Bus Booking Platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                  </p>
                </div>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-blue-100 transition-colors duration-300">
                  <Scale className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">2. Booking Policy</h2>
              </div>
              <div className="prose text-gray-600 space-y-4 ml-0 md:ml-16">
                <ul className="grid md:grid-cols-2 gap-4 list-none pl-0">
                  {[
                    "All bookings are subject to availability and acceptance by the respective bus operator.",
                    "You must provide accurate and complete information during the booking process.",
                    "The ticket is valid only for the seat number, journey date, and time specified.",
                    "Passengers must carry a valid photo ID proof during the journey."
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-red-50 p-3 rounded-2xl group-hover:bg-red-100 transition-colors duration-300">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">3. Cancellation & Refunds</h2>
              </div>
              <div className="prose text-gray-600 space-y-4 ml-0 md:ml-16">
                <p>
                  Cancellation policies vary by operator and time of cancellation. General guidelines include:
                </p>
                <div className="grid gap-4">
                  {[
                    { text: "Cancellations made 24 hours before departure may be eligible for a partial refund.", type: "warning" },
                    { text: "No refund is applicable for cancellations made within 4 hours of departure.", type: "error" },
                    { text: "Refunds will be processed to the original payment method within 5-7 business days.", type: "success" }
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${
                      item.type === 'warning' ? 'bg-orange-50/50 border-orange-100 text-orange-800' :
                      item.type === 'error' ? 'bg-red-50/50 border-red-100 text-red-800' :
                      'bg-green-50/50 border-green-100 text-green-800'
                    }`}>
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        item.type === 'warning' ? 'bg-orange-500' :
                        item.type === 'error' ? 'bg-red-500' :
                        'bg-green-500'
                      }`} />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-purple-50 p-3 rounded-2xl group-hover:bg-purple-100 transition-colors duration-300">
                  <HelpCircle className="h-8 w-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">4. Limitation of Liability</h2>
              </div>
              <div className="prose text-gray-600 ml-0 md:ml-16">
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-6">
                  <p className="leading-relaxed">
                    Bus Booking Platform acts as an aggregator and is not responsible for delays, cancellations, or service deficiencies by the bus operators. However, we will assist you in resolving issues to the best of our ability.
                  </p>
                </div>
              </div>
            </section>
          </div>
          
          <div className="bg-gray-50/80 p-8 border-t border-gray-100 text-center backdrop-blur-sm">
            <p className="text-gray-600">
              For any legal queries, please contact us at{' '}
              <a href="mailto:legal@busbooking.com" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
                legal@busbooking.com
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
