import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-6">
      {/* Animated logo */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          rotate: [0, -3, 3, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-2xl blur-xl opacity-40" />
        <div className="relative bg-gradient-to-tr from-primary-600 to-indigo-600 p-5 rounded-2xl shadow-2xl shadow-primary-500/30">
          <Bus className="h-8 w-8 text-white" />
        </div>
      </motion.div>

      {/* Brand name */}
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-black tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
      >
        BusBook
      </motion.span>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary-400"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
