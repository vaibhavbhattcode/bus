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
