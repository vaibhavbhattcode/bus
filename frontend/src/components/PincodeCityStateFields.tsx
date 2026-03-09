import { useEffect, useRef } from 'react';
import { usePincodeLookup } from '../hooks/usePincodeLookup';
import { useDebounce } from '../hooks/useDebounce';
import { MapPin, Loader2 } from 'lucide-react';

export interface PincodeCityStateFieldsProps {
  /** Controlled pincode value (digits only, max 6) */
  pincodeValue: string;
  onPincodeChange: (value: string) => void;
  pincodeError?: string;
  /** Controlled city value */
  cityValue: string;
  onCityChange: (value: string) => void;
  cityError?: string;
  /** Controlled state value */
  stateValue: string;
  onStateChange: (value: string) => void;
  stateError?: string;
  /** Optional: show pincode first with hint (recommended for autofill UX) */
  pincodeFirst?: boolean;
  /** Input class (e.g. "input w-full") */
  inputClass?: string;
  /** Label for pincode */
  pincodeLabel?: string;
  cityLabel?: string;
  stateLabel?: string;
  pincodePlaceholder?: string;
  cityPlaceholder?: string;
  statePlaceholder?: string;
  /** Disable autofill (e.g. when user already filled city/state) */
  disableAutofill?: boolean;
}

export default function PincodeCityStateFields({
  pincodeValue,
  onPincodeChange,
  pincodeError,
  cityValue,
  onCityChange,
  cityError,
  stateValue,
  onStateChange,
  stateError,
  pincodeFirst = true,
  inputClass = 'input w-full',
  pincodeLabel = 'Pincode',
  cityLabel = 'City',
  stateLabel = 'State',
  pincodePlaceholder = '6 digits',
  cityPlaceholder = 'City / District',
  statePlaceholder = 'State',
  disableAutofill = false,
}: PincodeCityStateFieldsProps) {
  const { lookupByPincode, loading, formatLocationPart } = usePincodeLookup();
  const debouncedPincode = useDebounce(pincodeValue, 500);
  const lastLookedUp = useRef<string>('');

  useEffect(() => {
    const pin = debouncedPincode.replace(/\D/g, '');
    if (pin.length < 6) {
      lastLookedUp.current = '';
      return;
    }
    if (disableAutofill || pin === lastLookedUp.current) return;

    let cancelled = false;
    lastLookedUp.current = pin;
    lookupByPincode(pin).then((result) => {
      if (cancelled || !result) return;
      onCityChange(formatLocationPart(result.city || result.district));
      onStateChange(formatLocationPart(result.state));
    });
    return () => {
      cancelled = true;
    };
  }, [
    debouncedPincode,
    disableAutofill,
    lookupByPincode,
    formatLocationPart,
    onCityChange,
    onStateChange,
  ]);

  const handlePincodeBlur = () => {
    if (disableAutofill) return;
    const pin = pincodeValue.replace(/\D/g, '');
    if (pin.length !== 6 || pin === lastLookedUp.current) return;
    lastLookedUp.current = pin;
    lookupByPincode(pin).then((result) => {
      if (!result) return;
      onCityChange(formatLocationPart(result.city || result.district));
      onStateChange(formatLocationPart(result.state));
    });
  };

  const baseInputClass = (err?: string) =>
    `${inputClass} ${err ? 'border-red-500' : ''}`.trim();

  const pincodeField = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {pincodeLabel}
        {loading && (
          <span className="ml-2 inline-flex items-center text-primary-600 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            Looking up...
          </span>
        )}
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          className={`${baseInputClass(pincodeError)} pl-10`}
          value={pincodeValue}
          onChange={(e) => onPincodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onBlur={handlePincodeBlur}
          placeholder={pincodePlaceholder}
          maxLength={6}
        />
      </div>
      {pincodeError && <p className="mt-1 text-sm text-red-500">{pincodeError}</p>}
      {pincodeValue.length === 6 && !loading && (
        <p className="mt-1 text-xs text-gray-500">City & state auto-filled from pincode when available.</p>
      )}
    </div>
  );

  const cityField = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{cityLabel}</label>
      <input
        type="text"
        autoComplete="address-level2"
        className={baseInputClass(cityError)}
        value={cityValue}
        onChange={(e) => onCityChange(e.target.value)}
        placeholder={cityPlaceholder}
        maxLength={80}
      />
      {cityError && <p className="mt-1 text-sm text-red-500">{cityError}</p>}
    </div>
  );

  const stateField = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{stateLabel}</label>
      <input
        type="text"
        autoComplete="address-level1"
        className={baseInputClass(stateError)}
        value={stateValue}
        onChange={(e) => onStateChange(e.target.value)}
        placeholder={statePlaceholder}
        maxLength={80}
      />
      {stateError && <p className="mt-1 text-sm text-red-500">{stateError}</p>}
    </div>
  );

  if (pincodeFirst) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pincodeField}
        {cityField}
        {stateField}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cityField}
      {stateField}
      {pincodeField}
    </div>
  );
}
