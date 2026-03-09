
import { api } from './api';

export interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    [key: string]: string | undefined;
  };
}

export async function searchAddress(query: string): Promise<AddressResult[]> {
  if (!query || query.length < 3) return [];
  
  try {
    // Call our backend proxy endpoint
    const response = await api.get<AddressResult[]>('/locations/search', {
      params: { q: query }
    });
    
    console.log('Address search results:', response);
    return response;
  } catch (error) {
    console.error('Error fetching address suggestions:', error);
    return [];
  }
}
