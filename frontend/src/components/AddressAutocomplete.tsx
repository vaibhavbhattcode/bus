import { useState, useEffect, useRef } from 'react';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';
import { useDebounce } from '../hooks/useDebounce';
import { MapPin, Loader2, X } from 'lucide-react';
import { AddressResult } from '../lib/addressApi';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressResult) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  label = 'Address',
  placeholder = 'Enter your address',
  className = '',
  disabled = false,
}: AddressAutocompleteProps) {
  const { suggestions, loading, search, setSuggestions } = useAddressAutocomplete();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Debounce the input value to avoid too many API calls
  const debouncedValue = useDebounce(value, 800);

  // Trigger search when debounced value changes
  useEffect(() => {
    // Only search if the user is typing (we'll use showSuggestions as a proxy for "active interaction")
    // or if we want to search whenever value changes.
    // However, if we just selected an item, value will be the full address.
    // We might not want to search again immediately if the user just clicked.
    // But for simplicity, let's search if length > 3.
    if (debouncedValue && debouncedValue.length > 3 && showSuggestions) {
      search(debouncedValue);
    } else if (!debouncedValue) {
      setSuggestions([]);
    }
  }, [debouncedValue, search, showSuggestions, setSuggestions]);

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = (item: AddressResult) => {
    onChange(item.display_name);
    onSelect(item);
    setShowSuggestions(false);
    setSuggestions([]); // Clear suggestions
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.length > 3) setShowSuggestions(true);
          }}
          disabled={disabled}
          className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          autoComplete="off" // Disable browser autocomplete
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
      
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {suggestions.map((item, index) => (
            <li
              key={`${item.lat}-${item.lon}-${index}`}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 text-gray-900"
              onClick={() => handleSelect(item)}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <span className="block truncate">{item.display_name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {showSuggestions && !loading && debouncedValue.length > 2 && suggestions.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-2 px-3 text-sm text-gray-500 ring-1 ring-black ring-opacity-5">
          No address found. You can enter manually.
        </div>
      )}
    </div>
  );
}
