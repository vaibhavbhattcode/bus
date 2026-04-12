/**
 * Auth Service — typed API calls for authentication endpoints.
 * All auth operations go through this module; never call api.post('/auth/...')
 * directly from components.
 */
import { api } from '../lib/api';

// ─── Request / Response Types ───────────────────────────────────────────────

export interface LoginPayload {
  emailOrPhone: string;
  password: string;
}

export interface RegisterPassengerPayload {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  alternatePhone?: string;
}

export interface RegisterProviderPayload {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  email?: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  role: 'PASSENGER' | 'PROVIDER' | 'ADMIN';
  createdAt?: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface OtpSendPayload {
  phone: string;
}

export interface OtpVerifyPayload {
  phone: string;
  otp: string;
}

export interface OtpVerifyResponse {
  access_token: string;
  user: AuthUser;
  isNewUser: boolean;
}

// ─── Service Functions ──────────────────────────────────────────────────────

export const authService = {
  /** Login with email/phone + password. Returns access_token + user. */
  login: (data: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', data),

  /** Register a passenger account (auto-logs in on success). */
  registerPassenger: (data: RegisterPassengerPayload) =>
    api.post<LoginResponse>('/auth/register/passenger', data),

  /** Register a provider account (auto-logs in on success). */
  registerProvider: (data: RegisterProviderPayload) =>
    api.post<LoginResponse>('/auth/register/provider', data),

  /** Silent token refresh — called automatically by the API client. */
  refresh: () =>
    api.post<{ access_token: string }>('/auth/refresh', {}),

  /** Logout — revokes refresh token and clears httpOnly cookie. */
  logout: (refreshToken?: string) =>
    api.post<{ success: boolean; message: string }>('/auth/logout', {
      refreshToken,
    }),

  /** Request password reset email. Always returns success (anti-enumeration). */
  forgotPassword: (email: string) =>
    api.post<{ success: boolean; message: string }>('/auth/forgot-password', { email }),

  /** Reset password using the token from the reset email. */
  resetPassword: (token: string, password: string) =>
    api.post<{ success: boolean; message: string }>('/auth/reset-password', {
      token,
      password,
    }),

  /** Send OTP to phone for passwordless login. */
  sendOtp: (phone: string) =>
    api.post<{ success: boolean; message: string }>('/auth/otp/send', { phone }),

  /** Verify OTP — creates account if first login. */
  verifyOtp: (phone: string, otp: string) =>
    api.post<OtpVerifyResponse>('/auth/otp/verify', { phone, otp }),

  /** Fetch the currently authenticated user from server. */
  me: () =>
    api.get<AuthUser>('/auth/me'),
};
