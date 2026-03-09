import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'PASSENGER' | 'PROVIDER' | 'ADMIN';
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  // NOTE: refresh token is stored in an httpOnly cookie by the server.
  // It is NOT kept in JS-accessible storage to prevent XSS token theft.
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })(),
  accessToken: localStorage.getItem('accessToken'),

  setAuth: (user, accessToken) => {
    // Only persist non-sensitive data
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken });
  },

  setAccessToken: (accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    set({ accessToken });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null });
  },

  isAuthenticated: () => {
    const { user, accessToken } = get();
    return !!user && !!accessToken;
  },

  loadFromStorage: () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const accessToken = localStorage.getItem('accessToken');
      set({ user, accessToken });
    } catch {
      set({ user: null, accessToken: null });
    }
  },
}));

import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'PASSENGER' | 'PROVIDER' | 'ADMIN';
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadFromStorage: () => void;
}

// Memory storage for access token (not persisted to prevent XSS)
let memoryAccessToken: string | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })(),
  accessToken: memoryAccessToken,

  setAuth: (user, accessToken) => {
    // Store user data in sessionStorage (cleared on tab close)
    sessionStorage.setItem('user', JSON.stringify(user));
    // Store access token in memory only (prevents XSS theft)
    memoryAccessToken = accessToken;
    set({ user, accessToken });
  },

  setAccessToken: (accessToken) => {
    memoryAccessToken = accessToken;
    set({ accessToken });
  },

  logout: () => {
    sessionStorage.removeItem('user');
    memoryAccessToken = null;
    set({ user: null, accessToken: null });
  },

  isAuthenticated: () => {
    const { user } = get();
    return !!user && !!memoryAccessToken;
  },

  loadFromStorage: () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || 'null');
      set({ user, accessToken: memoryAccessToken });
    } catch {
      set({ user: null, accessToken: null });
    }
  },
}));
