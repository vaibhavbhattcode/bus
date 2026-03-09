import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (accessToken) {
      // Clean up URL construction
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      // Ensure we don't end up with undefined
      const baseUrl = apiUrl ? apiUrl.replace(/\/api$/, '') : 'http://localhost:3000';
      const socketUrl = baseUrl;
      
      console.log('[Socket] Initializing connection with URL:', socketUrl);
      console.log('[Socket] Using token:', accessToken.substring(0, 10) + '...');

      const newSocket = io(socketUrl, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket', 'polling'], // Allow fallback
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('[Socket] Connected successfully. ID:', newSocket.id);
      });

      newSocket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
        if (err.message === 'xhr poll error' || err.message === 'websocket error') {
          console.warn('[Socket] Possible authentication failure, CORS issue, or server unreachable.');
        }
      });

      newSocket.on('auth_error', async (data) => {
        console.error('[Socket] Auth error from server:', data);
        // Try to trigger a token refresh by making a simple API call
        try {
          console.log('[Socket] Attempting to refresh token via API...');
          await api.get('/auth/refresh-check'); // This should trigger the 401 interceptor if token is expired
        } catch (err) {
          console.error('[Socket] Failed to refresh token after auth_error:', err);
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        if (reason === 'io server disconnect') {
          // the disconnection was initiated by the server, you need to reconnect manually
          // newSocket.connect();
          console.warn('[Socket] Server disconnected the client.');
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
