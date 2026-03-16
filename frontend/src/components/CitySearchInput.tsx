import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface CitySearchInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  wrapperClassName?: string;
  icon?: React.ReactNode;
  mode?: 'city' | 'address';
}

interface Suggestion {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export default function CitySearchInput({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  required = false,
  className = "input pl-10 bg-gray-50/50 w-full",
  wrapperClassName = "space-y-1",
  icon,
  mode = 'city'
}: CitySearchInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Update internal query when prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounce logic
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setSuggestions([]);
        return;
      }
      
      // Don't search if the query exactly matches the current value (user selected an item)
      // Actually we should rely on selection state, but for now checking strict equality might help avoid re-search on selection
      // However, value prop updates query, so we need a flag or check if open.
      if (!isOpen) return;

      setIsLoading(true);
      try {
        const endpoint = mode === 'address' ? '/locations/search' : '/locations/cities';
        const data = await api.get<Suggestion[]>(`${endpoint}?q=${encodeURIComponent(debouncedQuery)}`);
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching cities:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (suggestion: Suggestion) => {
    // format display name: City, State
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village || '';
    const state = suggestion.address.state || '';
    const formattedName = city && state ? `${city}, ${state}` : suggestion.display_name.split(',')[0];
    
    onChange(formattedName);
    setQuery(formattedName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    onChange(newVal);
    setIsOpen(true);
  };

  return (
    <div className={`relative ${wrapperClassName}`} ref={wrapperRef}>
      {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>}
      <div className="relative group">
        {icon ? icon : (
          !className.includes('pl-16') && (
            <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-primary-600 transition-colors z-10" />
          )
        )}
        <input 
          type="text" 
          className={className} 
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          required={required}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute z-[1000] w-full mt-2 bg-white/95 rounded-2xl shadow-2xl border border-gray-100 max-h-72 overflow-auto backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 top-full left-0 p-1.5">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Network...</p>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                className="w-full text-left px-4 py-3.5 hover:bg-gray-50 flex items-center gap-3 transition-all rounded-xl group/item mb-1 last:mb-0 border-b border-gray-50/50 last:border-0"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate tracking-tight">
                    {suggestion.address.city || suggestion.address.town || suggestion.address.village || suggestion.display_name.split(',')[0]}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 truncate opacity-60 uppercase tracking-tighter">
                     {suggestion.display_name}
                  </p>
                </div>
              </button>
            ))
          ) : query.length >= 3 ? (
            <div className="py-8 text-center text-gray-400">
               <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="h-5 w-5 opacity-20" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest">No matching nodes found</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
