import { useState, useCallback } from 'react';
import { lookupPincode, PincodeResult, formatLocationPart } from '../lib/pincodeApi';

export function usePincodeLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupByPincode = useCallback(
    async (pincode: string): Promise<PincodeResult | null> => {
      const normalized = pincode.replace(/\D/g, '').slice(0, 6);
      if (normalized.length !== 6) return null;

      setError(null);
      setLoading(true);
      try {
        const result = await lookupPincode(normalized);
        return result;
      } catch (e) {
        setError('Could not verify pincode. You can still enter city and state manually.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    lookupByPincode,
    loading,
    error,
    formatLocationPart,
  };
}
