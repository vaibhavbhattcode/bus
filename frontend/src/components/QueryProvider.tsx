import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache time: 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 3 times
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus (only in production)
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Background refetching
            refetchInterval: false,
            // Prevent duplicate requests
            refetchOnMount: false,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            // Retry delay for mutations
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

// Custom hook for optimized queries
export const useOptimizedQuery = (queryKey: any[], queryFn: any, options?: any) => {
  return {
    queryKey,
    queryFn,
    staleTime: options?.staleTime || 5 * 60 * 1000,
    gcTime: options?.gcTime || 10 * 60 * 1000,
    retry: options?.retry !== undefined ? options.retry : 3,
    retryDelay: options?.retryDelay || ((attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)),
    refetchOnWindowFocus: options?.refetchOnWindowFocus !== false,
    refetchOnReconnect: options?.refetchOnReconnect !== false,
    ...options,
  };
};

// Optimistic update helper
export const createOptimisticUpdate = (queryClient: QueryClient, queryKey: any[]) => {
  return {
    execute: async (updateFn: () => Promise<any>, optimisticData: any) => {
      // Cancel any ongoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, optimisticData);

      // Try to update the server
      try {
        const result = await updateFn();
        return result;
      } catch (error) {
        // Rollback on error
        queryClient.setQueryData(queryKey, previousData);
        throw error;
      }
    },
  };
};

// Prefetching helper
export const prefetchQuery = (queryClient: QueryClient, queryKey: any[], queryFn: any) => {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
  });
};
