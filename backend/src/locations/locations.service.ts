import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);


  constructor(private readonly httpService: HttpService, private readonly prisma: PrismaService) {}

  async searchCities(query: string) {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      const mapboxToken = process.env.MAPBOX_TOKEN;
      if (mapboxToken) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
        const params = {
          access_token: mapboxToken,
          types: 'place,locality',
          country: 'in',
          limit: 5,
          language: 'en',
        };
        const response = await lastValueFrom(
          this.httpService.get(url, { params }).pipe(map((res) => res.data)),
        );
        return (response.features || []).map((f: any) => {
          const city = f.text;
          const stateContext = (f.context || []).find((c: any) => (c.id || '').startsWith('region'));
          const state = stateContext ? stateContext.text : undefined;
          return {
            place_id: f.id,
            display_name: f.place_name,
            address: { city, state, country: 'India' },
          };
        });
      } else {
        const url = `https://nominatim.openstreetmap.org/search`;
        const params = {
          format: 'json',
          q: query,
          addressdetails: 1,
          limit: 5,
          featuretype: 'city',
          countrycodes: 'in',
        };
        
        const headers = {
          'User-Agent': 'BusBookingApp/1.0',
          'Accept-Language': 'en-US,en;q=0.9',
        };
  
        const response = await lastValueFrom(
          this.httpService.get(url, { params, headers }).pipe(map((res) => res.data)),
        );
  
        return response;
      }
    } catch (error) {
      this.logger.error('Error fetching cities:', error);
      throw new HttpException(
        'Failed to fetch city suggestions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchAddress(query: string) {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      const mapboxToken = process.env.MAPBOX_TOKEN;
      if (mapboxToken) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
        const params = {
          access_token: mapboxToken,
          types: 'address,place,locality',
          country: 'in',
          limit: 5,
          language: 'en',
        };
        const response = await lastValueFrom(
          this.httpService.get(url, { params }).pipe(map((res) => res.data)),
        );
        return (response.features || []).map((f: any) => {
          const cityContext = (f.context || []).find((c: any) => (c.id || '').startsWith('place')) || (f.context || []).find((c: any) => (c.id || '').startsWith('locality'));
          const city = cityContext ? cityContext.text : undefined;
          const stateContext = (f.context || []).find((c: any) => (c.id || '').startsWith('region'));
          const state = stateContext ? stateContext.text : undefined;
          return {
            place_id: f.id,
            display_name: f.place_name,
            address: { city, state, country: 'India' },
          };
        });
      } else {
        const url = `https://nominatim.openstreetmap.org/search`;
        const params = {
          format: 'json',
          q: query,
          addressdetails: 1,
          limit: 5,
          countrycodes: 'in',
        };
        
        const headers = {
          'User-Agent': 'BusBookingApp/1.0',
          'Accept-Language': 'en-US,en;q=0.9',
        };
  
        const response = await lastValueFrom(
          this.httpService.get(url, { params, headers }).pipe(map((res) => res.data)),
        );
  
        return response;
      }
    } catch (error) {
      this.logger.error('Error fetching address:', error);
      // Return empty array for smoother UI experience on failure, or throw
      // Since it's a search suggestion, empty array is often better than crashing the UI
      // But consistent error handling is good too.
      throw new HttpException(
        'Failed to fetch address suggestions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async popularRoutes(query: string) {
    const q = (query || '').trim();
    const where: any = q
      ? {
          OR: [
            { fromCity: { contains: q, mode: 'insensitive' } },
            { toCity: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const routes = await this.prisma.route.findMany({
      where,
      select: { fromCity: true, toCity: true },
      take: 50,
    });
    const freq = new Map<string, number>();
    routes.forEach((r) => {
      const key = `${r.fromCity} → ${r.toCity}`;
      freq.set(key, (freq.get(key) || 0) + 1);
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label]) => ({ label }));
  }
}
