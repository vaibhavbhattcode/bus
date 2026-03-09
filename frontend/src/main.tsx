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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>,
)
