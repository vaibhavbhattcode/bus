import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'PASSENGER' | 'PROVIDER' | 'ADMIN';
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  // Access token lives in memory only — never written to localStorage.
  // This prevents XSS attacks from stealing the token via document.cookie or localStorage.
  // On page reload, the silent refresh flow (httpOnly cookie) restores the session.
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // User profile (non-sensitive) persisted in localStorage for instant UI hydration on reload.
  // Access token is NOT loaded from storage — it will be restored via silent refresh.
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })(),
  accessToken: null, // always starts null; restored by silent refresh in api.ts

  setAuth: (user, accessToken) => {
    // Only persist non-sensitive profile data, never the token
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken });
  },

  setAccessToken: (accessToken) => {
    // In-memory only — no localStorage write
    set({ accessToken });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('keepSignedIn');
    set({ user: null, accessToken: null });
  },

  isAuthenticated: () => {
    const { user, accessToken } = get();
    return !!user && !!accessToken;
  },

  loadFromStorage: () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      // accessToken intentionally not loaded — silent refresh will provide it
      set({ user, accessToken: null });
    } catch {
      set({ user: null, accessToken: null });
    }
  },
}));
