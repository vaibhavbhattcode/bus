export type UserRole = 'PASSENGER' | 'PROVIDER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  createdAt?: string; // Member since
  totalTrips?: number; // Fetched from stats
  isVerified?: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  routeId: string;
  seats: number;
  seatNumbers: string[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  passengerAge?: number;
  passengerGender?: string;
  pickupLocation?: string;
  dropLocation?: string;
  createdAt: string;
  route?: Route;
  user?: User;
}

export interface Route {
  id: string;
  vehicleId: string;
  fromCity: string;
  toCity: string;
  intermediateStops: string[];
  date: string;
  departureTime: string;
  arrivalTime?: string;
  distanceKm?: number;
  price: number;
  availableSeats: number;
  totalSeats: number;
  isActive: boolean;
  vehicle?: Vehicle;
  pickupPoints?: string[];
  dropPoints?: string[];
}

export interface Vehicle {
  id: string;
  providerId: string;
  type: 'BUS' | 'TEMPO' | 'TRAVELLER';
  name: string;
  registrationNumber: string;
  totalSeats: number;
  amenities: string[];
  isActive: boolean;
  provider?: Provider;
}

export interface Provider {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  rating: number;
  totalReviews: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  link?: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  author: string;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
