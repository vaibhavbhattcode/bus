import { Bus } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
      <div className="relative">
        {/* Pulsing background */}
        <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-75"></div>
        
        {/* Logo Container */}
        <div className="relative bg-gradient-to-tr from-primary-600 to-indigo-600 p-4 rounded-2xl shadow-xl shadow-primary-500/30 animate-pulse">
          <Bus className="h-10 w-10 text-white" />
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center">
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">BusBook</h3>
        <div className="mt-3 flex space-x-1">
          <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
