import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select Option", 
  icon, 
  label,
  className = ""
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center gap-1.5 mb-2 ml-1">
           <Sparkles className="h-3 w-3 text-primary-500" />
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
        </div>
      )}
      
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group w-full h-[52px] px-6 rounded-[20px] bg-white border-2 flex items-center text-left 
          transition-all duration-300 outline-none 
          ${isOpen 
            ? 'border-gray-900 ring-4 ring-gray-900/5 shadow-xl' 
            : 'border-gray-50 hover:border-primary-100 hover:shadow-xl hover:shadow-primary-500/5 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'
          }
        `}
      >
        {icon && (
          <div className="mr-3 p-1.5 bg-gray-50 rounded-lg group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-black tracking-tight truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
            {selectedOption?.label || placeholder}
          </p>
        </div>
        <div className={`
          ml-2 p-1.5 rounded-lg transition-all duration-300
          ${isOpen ? 'bg-gray-900 text-white rotate-180' : 'bg-gray-50 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600'}
        `}>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 6, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-full left-0 right-0 min-w-[280px] bg-white/95 rounded-[28px] shadow-2xl shadow-black/15 border border-gray-100 p-2 z-[1000] overflow-hidden backdrop-blur-xl"
          >
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
              {options.length > 0 ? (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full text-left px-4 py-3.5 rounded-[18px] transition-all duration-300 flex items-center justify-between group/item mb-1 last:mb-0
                      ${value === option.value 
                        ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' 
                        : 'text-gray-600 hover:bg-gray-50 hover:pl-6'
                      }
                    `}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black tracking-tight truncate">{option.label}</span>
                      {option.description && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${value === option.value ? 'text-white/50' : 'text-gray-400'}`}>
                          {option.description}
                        </span>
                      )}
                    </div>
                    {value === option.value && (
                      <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }}
                        className="bg-white/20 p-1.5 rounded-lg"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </motion.div>
                    )}
                  </button>
                ))
              ) : (
                <div className="py-8 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-5 w-5 text-gray-300" />
                  </div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No assets found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e2e8f0;
        }
      `}</style>
    </div>
  );
}
