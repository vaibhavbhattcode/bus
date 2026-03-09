import { Shield, Lock, Eye, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';

export default function PrivacyPolicyPage() {
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
        title="Privacy Policy" 
        description="Read our privacy policy to understand how we collect, use, and protect your personal information at BusBook."
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"
      >
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">Policy</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            We value your trust and are committed to protecting your personal information.
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
                  <Shield className="h-8 w-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">1. Information We Collect</h2>
              </div>
              <div className="prose text-gray-600 space-y-4 ml-0 md:ml-16">
                <p>
                  We collect information you provide directly to us when you create an account, book a ticket, or contact customer support. This includes:
                </p>
                <ul className="grid md:grid-cols-2 gap-4 list-none pl-0">
                  {[
                    "Personal identification information (Name, email address, phone number)",
                    "Payment information (processed securely by our payment partners)",
                    "Travel preferences and booking history",
                    "Device and usage information when you access our platform"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="h-2 w-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-blue-100 transition-colors duration-300">
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">2. How We Use Your Information</h2>
              </div>
              <div className="prose text-gray-600 space-y-4 ml-0 md:ml-16">
                <p>
                  We use the information we collect to provide, maintain, and improve our services, including:
                </p>
                <ul className="grid md:grid-cols-2 gap-4 list-none pl-0">
                  {[
                    "Processing your bookings and payments",
                    "Sending booking confirmations and travel updates",
                    "Providing customer support and responding to your inquiries",
                    "Personalizing your experience and sending relevant offers",
                    "Detecting and preventing fraud"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-green-50 p-3 rounded-2xl group-hover:bg-green-100 transition-colors duration-300">
                  <Lock className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">3. Data Security</h2>
              </div>
              <div className="prose text-gray-600 space-y-4 ml-0 md:ml-16">
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-6">
                  <p className="mb-4">
                    We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                  </p>
                  <p>
                    Your payment data is encrypted using industry-standard protocols (SSL/TLS) and is never stored on our servers in plain text.
                  </p>
                </div>
              </div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <section className="group">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-purple-50 p-3 rounded-2xl group-hover:bg-purple-100 transition-colors duration-300">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">4. Sharing of Information</h2>
              </div>
              <div className="prose text-gray-600 space-y-4 ml-0 md:ml-16">
                <p>
                  We do not sell your personal information. We may share your information with:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    "Bus operators to fulfill your booking",
                    "Service providers (payment processors, cloud hosting)",
                    "Legal authorities when required by law"
                  ].map((item, i) => (
                    <div key={i} className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 text-center">
                      <span className="text-purple-900 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
          
          <div className="bg-gray-50/80 p-8 border-t border-gray-100 text-center backdrop-blur-sm">
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@busbooking.com" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
                privacy@busbooking.com
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
