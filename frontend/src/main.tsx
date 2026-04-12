import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster, toast } from 'react-hot-toast'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import './i18n'
import { useAuthStore } from './store/auth'
import axios from 'axios'

const updateSW = registerSW({
  onNeedRefresh() {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="font-semibold">New version available!</span>
        <button
          className="bg-primary-600 text-white px-3 py-1 rounded-md text-sm cursor-pointer"
          onClick={() => {
            updateSW(true)
            toast.dismiss(t.id)
          }}
        >
          Click to reload
        </button>
      </div>
    ), { duration: Infinity })
  },
  onOfflineReady() {
    toast.success('App ready to work offline!', { duration: 4000 });
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
})

// Silent refresh on startup: restore access token from httpOnly cookie.
// If the cookie is expired/missing, the user stays logged-out gracefully.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
async function restoreSession() {
  const { user } = useAuthStore.getState();
  if (!user) return; // no stored user profile — nothing to restore
  // Only attempt silent refresh if user previously chose "keep me signed in"
  if (!localStorage.getItem('keepSignedIn')) return;
  try {
    const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
    const token: string = res.data?.access_token ?? res.data?.data?.access_token ?? '';
    if (token) useAuthStore.getState().setAccessToken(token);
  } catch {
    // Cookie expired or missing — clear stale user profile
    useAuthStore.getState().logout();
  }
}

restoreSession().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
            <Toaster position="top-right" />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>,
  )
})
