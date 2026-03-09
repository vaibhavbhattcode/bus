import { useState, useCallback } from 'react';
import { searchAddress, AddressResult } from '../lib/addressApi';

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Searching address for:', query);
      const results = await searchAddress(query);
      console.log('Search results:', results);
      setSuggestions(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to fetch address suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    suggestions,
    loading,
    error,
    search,
    setSuggestions,
  };
}
