import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import SEO from '../../components/SEO';
import { motion } from 'framer-motion';
import { ShieldCheck, Rocket, Briefcase } from 'lucide-react';

export default function ProviderRegistrationPage() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-4xl mx-auto space-y-10 py-10"
    >
      <SEO 
        title="Operational Onboarding | BusBook" 
        description="Initialize your fleet protocols and join the premium carrier network."
      />
      
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-widest border border-primary-100 mb-2">
           <ShieldCheck className="h-3.5 w-3.5" /> Carrier Verification Protocol
        </div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Expand Your Fleet Operations</h2>
        <p className="text-gray-500 font-medium max-w-2xl mx-auto">Complete your organizational profile to interface with our global passenger network and begin vehicle deployment cycles.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
         {[
           { icon: Rocket, label: "Scale Fast", desc: "Instant access to thousands of travelers" },
           { icon: Briefcase, label: "Enterprise Tools", desc: "Advanced fleet management dashboard" },
           { icon: ShieldCheck, label: "Secure Payments", desc: "Automated settlements & tax compliance" }
         ].map((item, i) => (
           <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500 group">
              <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors mb-4">
                 <item.icon className="h-6 w-6" />
              </div>
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-1">{item.label}</h3>
              <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
           </div>
         ))}
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200 border border-gray-100 overflow-hidden">
        <div className="bg-gray-900 p-8 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
           <h3 className="text-xl font-black uppercase tracking-widest mb-1 italic">Onboarding Terminal</h3>
           <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Awaiting organizational credentials</p>
        </div>
        <div className="p-8 md:p-12">
           <ProviderRegistrationPrompt />
        </div>
      </div>
    </motion.div>
  );
}

