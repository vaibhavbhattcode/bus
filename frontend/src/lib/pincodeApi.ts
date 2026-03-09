/**
 * Indian Pincode lookup for autofill (City, State, District).
 * Primary: api.postalpincode.in (India Post official data).
 */

export interface PincodeResult {
  pincode: string;
  state: string;
  district: string;
  /** City / area name - often same as district or first post office name */
  city: string;
  postOfficeName?: string;
}

const PINCODE_REGEX = /^\d{6}$/;

/**
 * api.postalpincode.in — India Post data, free, JSON.
 * GET https://api.postalpincode.in/pincode/{pincode}
 */
async function fetchFromPostalPincode(pincode: string): Promise<PincodeResult | null> {
  try {
    const url = `https://api.postalpincode.in/pincode/${pincode}`;
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.Status !== 'Success' || !Array.isArray(data.PostOffice) || data.PostOffice.length === 0)
      return null;
    const first = data.PostOffice[0];
    const state = (first.State ?? '').toString().trim();
    const district = (first.District ?? '').toString().trim();
    const name = (first.Name ?? first.Block ?? '').toString().trim();
    if (!state && !district) return null;
    return {
      pincode,
      state,
      district,
      city: district || name,
      postOfficeName: name || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Lookup pincode: tries api.postalpincode.in.
 * Returns normalized { state, district, city } or null.
 */
export async function lookupPincode(pincode: string): Promise<PincodeResult | null> {
  const normalized = pincode.replace(/\D/g, '').slice(0, 6);
  if (!PINCODE_REGEX.test(normalized)) return null;

  return await fetchFromPostalPincode(normalized);
}

/**
 * Format state/district for display (title case).
 */
export function formatLocationPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
