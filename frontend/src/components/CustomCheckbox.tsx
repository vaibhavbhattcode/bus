import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export default function CustomCheckbox({ label, checked, onChange, className = "" }: CustomCheckboxProps) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-50 rounded-xl transition-all -mx-2 ${className}`}>
      <div className="relative flex items-center">
        <input 
          type="checkbox" 
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`
          h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200
          ${checked 
            ? 'bg-primary-600 border-primary-600 shadow-sm shadow-primary-500/30' 
            : 'bg-white border-gray-300 group-hover:border-primary-400'
          }
        `}>
          <Check className={`w-3.5 h-3.5 text-white transform transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
        </div>
      </div>
      <span className={`text-sm font-medium transition-colors ${checked ? 'text-gray-900 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
        {label}
      </span>
    </label>
  );
}
